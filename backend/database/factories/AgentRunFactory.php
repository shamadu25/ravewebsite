<?php

namespace Database\Factories;

use App\Models\AgentRun;
use App\Models\Conversation;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<AgentRun>
 */
class AgentRunFactory extends Factory
{
    public function definition(): array
    {
        return [
            'conversation_id' => Conversation::factory(),
            'message_id' => null,
            'agent_key' => 'rave_concierge',
            'prompt_version_id' => null,
            'model' => 'gpt-4o-mini',
            'input_tokens' => fake()->numberBetween(100, 800),
            'output_tokens' => fake()->numberBetween(50, 400),
            'latency_ms' => fake()->numberBetween(300, 3000),
            'status' => 'success',
            'error' => null,
        ];
    }
}
