<?php

namespace Database\Factories;

use App\Models\Conversation;
use App\Models\Visitor;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<Conversation>
 */
class ConversationFactory extends Factory
{
    public function definition(): array
    {
        return [
            'external_id' => (string) Str::uuid(),
            'visitor_id' => Visitor::factory(),
            'contact_id' => null,
            'channel' => 'website',
            'stage' => 'new',
            'status' => 'open',
            'landing_page' => '/',
            'current_page' => '/',
            'last_message_at' => now(),
        ];
    }
}
