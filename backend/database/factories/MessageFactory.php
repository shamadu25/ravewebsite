<?php

namespace Database\Factories;

use App\Models\Conversation;
use App\Models\Message;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Message>
 */
class MessageFactory extends Factory
{
    public function definition(): array
    {
        return [
            'conversation_id' => Conversation::factory(),
            'role' => 'visitor',
            'content' => fake()->sentence(),
            'structured_output' => null,
            'prompt_version_id' => null,
            'model' => null,
            'input_tokens' => null,
            'output_tokens' => null,
            'latency_ms' => null,
        ];
    }
}
