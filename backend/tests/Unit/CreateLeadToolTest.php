<?php

namespace Tests\Unit;

use App\AI\Tools\CreateLeadTool;
use App\Models\Conversation;
use App\Models\Lead;
use Illuminate\Foundation\Testing\RefreshDatabase;
use InvalidArgumentException;
use Tests\TestCase;

class CreateLeadToolTest extends TestCase
{
    use RefreshDatabase;

    public function test_it_rejects_input_without_any_contact_channel(): void
    {
        $conversation = Conversation::factory()->create();

        $this->expectException(InvalidArgumentException::class);

        app(CreateLeadTool::class)->execute([
            'conversation_id' => $conversation->id,
            'first_name' => 'Kwame',
        ]);
    }

    public function test_it_creates_a_contact_and_lead_when_a_channel_is_present(): void
    {
        $conversation = Conversation::factory()->create();

        $result = app(CreateLeadTool::class)->execute([
            'conversation_id' => $conversation->id,
            'first_name' => 'Kwame',
            'whatsapp' => '+233501234567',
            'service_interest' => 'whatsapp_automation',
        ]);

        $this->assertDatabaseHas('leads', [
            'id' => $result['lead_id'],
            'conversation_id' => $conversation->id,
            'service_interest' => 'whatsapp_automation',
        ]);
        $this->assertDatabaseHas('contacts', [
            'id' => $result['contact_id'],
            'first_name' => 'Kwame',
            'whatsapp' => '+233501234567',
        ]);
    }

    public function test_it_does_not_create_a_duplicate_lead_for_the_same_conversation(): void
    {
        $conversation = Conversation::factory()->create();
        $tool = app(CreateLeadTool::class);

        $first = $tool->execute(['conversation_id' => $conversation->id, 'email' => 'kwame@example.com']);
        $second = $tool->execute(['conversation_id' => $conversation->id, 'email' => 'kwame@example.com']);

        $this->assertSame($first['lead_id'], $second['lead_id']);
        $this->assertSame(1, Lead::query()->count());
    }
}
