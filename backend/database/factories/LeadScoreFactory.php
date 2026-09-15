<?php

namespace Database\Factories;

use App\Models\Lead;
use App\Models\LeadScore;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<LeadScore>
 */
class LeadScoreFactory extends Factory
{
    public function definition(): array
    {
        return [
            'lead_id' => Lead::factory(),
            'total_score' => 0,
            'level' => 'low',
            'computed_at' => now(),
        ];
    }
}
