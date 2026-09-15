<?php

namespace Tests\Feature;

use App\AI\Providers\LLMProviderInterface;
use App\Models\Conversation;
use App\Models\Lead;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\Support\FakeLLMProvider;
use Tests\TestCase;

class AiChatConversationTest extends TestCase
{
    use RefreshDatabase;

    public function test_starting_a_conversation_returns_a_contextual_opener(): void
    {
        $response = $this->postJson('/api/ai/conversations', [
            'visitor_id' => (string) Str::uuid(),
            'current_page' => '/products/cliqpos',
        ]);

        $response->assertCreated();
        $response->assertJsonPath('messages.0.role', 'assistant');
        $this->assertStringContainsString('CliqPOS', $response->json('messages.0.content'));
    }

    public function test_sending_a_message_persists_history_and_returns_the_assistant_reply(): void
    {
        $fake = new FakeLLMProvider;
        $fake->willReturn(json_encode([
            'message' => 'How many WhatsApp inquiries do you get daily?',
            'intent' => 'whatsapp_automation',
            'stage' => 'discovery',
            'lead_score_delta' => 5,
            'buying_signal' => false,
            'recommended_next_action' => 'ask_daily_inquiry_volume',
            'needs_human' => false,
        ]));
        $this->app->instance(LLMProviderInterface::class, $fake);

        $start = $this->postJson('/api/ai/conversations', [
            'visitor_id' => (string) Str::uuid(),
            'current_page' => '/',
        ]);
        $conversationId = $start->json('id');

        $response = $this->postJson("/api/ai/conversations/{$conversationId}/messages", [
            'message' => 'We get too many WhatsApp inquiries and reply late.',
        ]);

        $response->assertOk();
        $response->assertJson([
            'message' => 'How many WhatsApp inquiries do you get daily?',
            'needs_human' => false,
            'ai_unavailable' => false,
        ]);

        $conversation = Conversation::query()->where('external_id', $conversationId)->firstOrFail();
        $this->assertSame('discovery', $conversation->stage);
        $this->assertSame(3, $conversation->messages()->count());
    }

    public function test_a_create_lead_tool_request_creates_a_lead(): void
    {
        $fake = new FakeLLMProvider;
        $fake->willReturn(json_encode([
            'message' => 'Great, I have what I need to get you a recommendation.',
            'intent' => 'whatsapp_automation',
            'stage' => 'contact_captured',
            'lead_score_delta' => 10,
            'buying_signal' => true,
            'recommended_next_action' => 'book_consultation',
            'needs_human' => false,
            'tool_requests' => [
                [
                    'tool' => 'CreateLeadTool',
                    'input' => [
                        'first_name' => 'Ama',
                        'whatsapp' => '+233241234567',
                        'service_interest' => 'whatsapp_automation',
                    ],
                ],
            ],
        ]));
        $this->app->instance(LLMProviderInterface::class, $fake);

        $start = $this->postJson('/api/ai/conversations', [
            'visitor_id' => (string) Str::uuid(),
        ]);
        $conversationId = $start->json('id');

        $this->postJson("/api/ai/conversations/{$conversationId}/messages", [
            'message' => "I'm Ama, my WhatsApp is +233241234567.",
        ])->assertOk();

        $this->assertSame(1, Lead::query()->count());
        $this->assertDatabaseHas('contacts', ['first_name' => 'Ama', 'whatsapp' => '+233241234567']);
    }
}
