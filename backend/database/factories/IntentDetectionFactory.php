<?php

namespace Database\Factories;

use App\Models\Conversation;
use App\Models\Intent;
use App\Models\IntentDetection;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<IntentDetection>
 */
class IntentDetectionFactory extends Factory
{
    public function definition(): array
    {
        return [
            'conversation_id' => Conversation::factory(),
            'message_id' => null,
            'primary_intent_id' => Intent::factory(),
            'secondary_intent_id' => null,
            'confidence' => fake()->randomFloat(3, 0.5, 1),
            'detected_service' => null,
            'detected_industry' => null,
        ];
    }
}
