<?php

namespace Tests\Unit;

use App\AI\Support\StructuredAgentResponse;
use Tests\TestCase;

class StructuredAgentResponseTest extends TestCase
{
    public function test_it_parses_a_complete_payload(): void
    {
        $response = StructuredAgentResponse::fromArray([
            'message' => 'How many WhatsApp inquiries do you get daily?',
            'intent' => 'whatsapp_automation',
            'stage' => 'discovery',
            'lead_score_delta' => 10,
            'detected_objection' => 'price',
            'buying_signal' => true,
            'recommended_next_action' => 'ask_daily_inquiry_volume',
            'tool_requests' => [['tool' => 'SearchKnowledgeTool', 'input' => ['query' => 'pricing']]],
            'needs_human' => false,
        ]);

        $this->assertSame('whatsapp_automation', $response->intent);
        $this->assertSame('discovery', $response->stage);
        $this->assertSame(10, $response->leadScoreDelta);
        $this->assertSame('price', $response->detectedObjection);
        $this->assertTrue($response->buyingSignal);
        $this->assertFalse($response->needsHuman);
        $this->assertCount(1, $response->toolRequests);
    }

    public function test_it_falls_back_to_safe_defaults_for_missing_or_malformed_fields(): void
    {
        $response = StructuredAgentResponse::fromArray([]);

        $this->assertSame('unknown', $response->intent);
        $this->assertSame('engaged', $response->stage);
        $this->assertSame(0, $response->leadScoreDelta);
        $this->assertNull($response->detectedObjection);
        $this->assertFalse($response->buyingSignal);
        $this->assertFalse($response->needsHuman);
        $this->assertSame([], $response->toolRequests);
    }

    public function test_it_ignores_non_array_tool_requests(): void
    {
        $response = StructuredAgentResponse::fromArray(['tool_requests' => 'not-an-array']);

        $this->assertSame([], $response->toolRequests);
    }
}
