<?php

namespace App\AI\Tools;

use App\Models\Conversation;
use App\Models\ConversionEvent;
use Illuminate\Support\Facades\Log;
use InvalidArgumentException;

/**
 * Logs a human handoff request (spec §27/§28). Does not send a real
 * notification yet — no Slack/email/WhatsApp credentials are configured.
 * This is intentionally awaiting credentials; wire a notifier here once
 * NOTIFICATION_* env vars are supplied.
 */
class EscalateHumanTool implements ToolInterface
{
    public function name(): string
    {
        return 'EscalateHumanTool';
    }

    public function execute(array $input): array
    {
        $conversationId = $input['conversation_id'] ?? null;

        if (! $conversationId) {
            throw new InvalidArgumentException('conversation_id is required.');
        }

        $conversation = Conversation::query()->findOrFail($conversationId);
        $conversation->update(['stage' => 'human_handoff']);

        ConversionEvent::query()->create([
            'contact_id' => $conversation->contact_id,
            'conversation_id' => $conversation->id,
            'event_type' => 'human_handoff',
            'metadata' => ['reason' => $input['reason'] ?? null],
            'occurred_at' => now(),
        ]);

        Log::channel(config('logging.default'))->info('RaveSoft AI human handoff requested', [
            'conversation_id' => $conversation->id,
            'reason' => $input['reason'] ?? null,
        ]);

        return ['escalated' => true];
    }
}
