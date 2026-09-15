<?php

namespace Database\Factories;

use App\Models\Conversation;
use App\Models\ConversationSummary;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ConversationSummary>
 */
class ConversationSummaryFactory extends Factory
{
    public function definition(): array
    {
        return [
            'conversation_id' => Conversation::factory(),
            'summary' => fake()->paragraph(),
            'generated_at' => now(),
        ];
    }
}
