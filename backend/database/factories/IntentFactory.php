<?php

namespace Database\Factories;

use App\Models\Intent;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Intent>
 */
class IntentFactory extends Factory
{
    public function definition(): array
    {
        return [
            'key' => fake()->unique()->slug(2),
            'label' => fake()->words(3, true),
            'category' => null,
        ];
    }
}
