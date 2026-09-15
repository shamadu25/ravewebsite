<?php

namespace Database\Factories;

use App\Models\LeadScore;
use App\Models\LeadScoreComponent;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<LeadScoreComponent>
 */
class LeadScoreComponentFactory extends Factory
{
    public function definition(): array
    {
        return [
            'lead_score_id' => LeadScore::factory(),
            'key' => 'clear_problem',
            'points' => 15,
            'reason' => null,
        ];
    }
}
