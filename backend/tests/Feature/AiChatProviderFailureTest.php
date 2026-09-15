<?php

namespace Tests\Feature;

use App\AI\Providers\LLMProviderInterface;
use App\AI\Providers\NullProvider;
use App\Models\Conversation;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

class AiChatProviderFailureTest extends TestCase
{
    use RefreshDatabase;

    public function test_it_returns_a_fallback_message_instead_of_a_dead_end_when_the_ai_provider_is_unavailable(): void
    {
        $this->app->instance(LLMProviderInterface::class, new NullProvider);

        $start = $this->postJson('/api/ai/conversations', ['visitor_id' => (string) Str::uuid()]);
        $conversationId = $start->json('id');

        $response = $this->postJson("/api/ai/conversations/{$conversationId}/messages", [
            'message' => 'Hello, are you there?',
        ]);

        $response->assertOk();
        $response->assertJson([
            'needs_human' => true,
            'ai_unavailable' => true,
        ]);
        $this->assertStringContainsString('temporarily unavailable', $response->json('message'));

        $conversation = Conversation::query()->where('external_id', $conversationId)->firstOrFail();
        $this->assertSame('human_handoff', $conversation->status);
        $this->assertTrue(
            $conversation->messages()->where('content', 'like', '%temporarily unavailable%')->exists()
        );
    }
}
