<?php

namespace App\Services\Conversations;

use App\AI\Agents\RaveConciergeAgent;
use App\AI\Support\StructuredAgentResponse;
use App\Exceptions\AI\AiProviderUnavailableException;
use App\Models\Conversation;
use App\Models\ConversionEvent;
use App\Models\Intent;
use App\Models\Message;
use App\Models\Visitor;
use App\Models\VisitorSession;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class ConversationService
{
    private const AI_FALLBACK_MESSAGE = 'Our AI assistant is temporarily unavailable. Leave your name and WhatsApp number and the RaveSoft team will contact you.';

    public function __construct(private readonly RaveConciergeAgent $agent) {}

    /**
     * @param  array<string, mixed>  $data
     */
    public function start(array $data): Conversation
    {
        $visitor = Visitor::query()->firstOrCreate(
            ['external_id' => $data['visitor_id']],
            ['first_seen_at' => now(), 'last_seen_at' => now(), 'sessions_count' => 0]
        );

        $visitor->increment('sessions_count');
        $visitor->update(['last_seen_at' => now()]);

        VisitorSession::query()->create([
            'visitor_id' => $visitor->id,
            'landing_page' => $data['landing_page'] ?? $data['current_page'] ?? null,
            'current_page' => $data['current_page'] ?? null,
            'referrer' => $data['referrer'] ?? null,
            'utm_source' => $data['utm_source'] ?? null,
            'utm_medium' => $data['utm_medium'] ?? null,
            'utm_campaign' => $data['utm_campaign'] ?? null,
            'utm_content' => $data['utm_content'] ?? null,
            'utm_term' => $data['utm_term'] ?? null,
            'device' => $data['device'] ?? null,
            'browser' => $data['browser'] ?? null,
            'language' => $data['language'] ?? null,
            'started_at' => now(),
        ]);

        $conversation = Conversation::query()->create([
            'external_id' => (string) Str::uuid(),
            'visitor_id' => $visitor->id,
            'channel' => 'website',
            'stage' => 'new',
            'status' => 'open',
            'landing_page' => $data['landing_page'] ?? $data['current_page'] ?? null,
            'current_page' => $data['current_page'] ?? null,
            'last_message_at' => now(),
        ]);

        $opener = $this->contextualOpener($data['current_page'] ?? null);

        $conversation->messages()->create([
            'role' => 'assistant',
            'content' => $opener,
        ]);

        return $conversation;
    }

    /**
     * @param  array<string, mixed>  $context
     * @return array{conversation: Conversation, message: string, needs_human: bool, quick_actions: array<int, array<string, string>>}
     */
    public function sendMessage(Conversation $conversation, string $text, array $context = []): array
    {
        $conversation->messages()->create([
            'role' => 'visitor',
            'content' => $text,
        ]);

        $history = $conversation->messages()
            ->orderBy('id')
            ->get()
            ->map(fn (Message $message): array => [
                'role' => $message->role === 'visitor' ? 'user' : 'assistant',
                'content' => $message->content,
            ])
            ->all();

        try {
            $structured = $this->agent->respond($conversation, $history, array_merge([
                'current_page' => $conversation->current_page,
                'landing_page' => $conversation->landing_page,
            ], $context));
        } catch (AiProviderUnavailableException $e) {
            Log::warning('RaveSoft AI unavailable, returning fallback', ['error' => $e->getMessage()]);

            $conversation->messages()->create([
                'role' => 'assistant',
                'content' => self::AI_FALLBACK_MESSAGE,
            ]);

            $conversation->update(['status' => 'human_handoff', 'last_message_at' => now()]);

            return [
                'conversation' => $conversation->fresh(),
                'message' => self::AI_FALLBACK_MESSAGE,
                'needs_human' => true,
                'ai_unavailable' => true,
                'quick_actions' => [],
            ];
        }

        $conversation->messages()->create([
            'role' => 'assistant',
            'content' => $structured->message,
            'structured_output' => (array) $structured,
        ]);

        $conversation->update([
            'stage' => $structured->stage,
            'last_message_at' => now(),
            'status' => $structured->needsHuman ? 'human_handoff' : $conversation->status,
        ]);

        $this->recordIntent($conversation, $structured);

        if ($structured->buyingSignal) {
            ConversionEvent::query()->create([
                'conversation_id' => $conversation->id,
                'contact_id' => $conversation->contact_id,
                'event_type' => 'buying_signal_detected',
                'metadata' => ['recommended_next_action' => $structured->recommendedNextAction],
                'occurred_at' => now(),
            ]);
        }

        return [
            'conversation' => $conversation->fresh(),
            'message' => $structured->message,
            'needs_human' => $structured->needsHuman,
            'ai_unavailable' => false,
            'quick_actions' => [],
        ];
    }

    private function recordIntent(Conversation $conversation, StructuredAgentResponse $structured): void
    {
        if ($structured->intent === '' || $structured->intent === 'unknown') {
            return;
        }

        $intent = Intent::query()->firstOrCreate(
            ['key' => $structured->intent],
            ['label' => Str::headline($structured->intent)]
        );

        $conversation->intentDetections()->create([
            'primary_intent_id' => $intent->id,
            'confidence' => 1,
        ]);
    }

    private function contextualOpener(?string $currentPage): string
    {
        $assistantName = config('ai.assistant_name');

        return match (true) {
            $currentPage === null => "Hi — I'm {$assistantName}, RaveSoft's AI Business Consultant. Tell me what you're trying to improve in your business and I'll help identify the right solution.",
            str_contains($currentPage, 'cliqpos') => "What type of business are you running? I'll help you identify the most suitable CliqPOS setup.",
            str_contains($currentPage, 'hotel') => 'How many rooms does your property manage? I can help identify the right hotel management setup.',
            str_contains($currentPage, 'business-automation') => 'Want to automate part of your business? I can help identify where an AI employee would produce the most value.',
            default => "Hi — I'm {$assistantName}, RaveSoft's AI Business Consultant. Tell me what you're trying to improve in your business and I'll help identify the right solution.",
        };
    }
}
