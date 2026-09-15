<?php

namespace Database\Factories;

use App\Models\ConversionEvent;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ConversionEvent>
 */
class ConversionEventFactory extends Factory
{
    public function definition(): array
    {
        return [
            'visitor_id' => null,
            'contact_id' => null,
            'lead_id' => null,
            'conversation_id' => null,
            'event_type' => 'lead_created',
            'metadata' => null,
            'occurred_at' => now(),
        ];
    }
}
