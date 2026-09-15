<?php

namespace Database\Factories;

use App\Models\Company;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Company>
 */
class CompanyFactory extends Factory
{
    public function definition(): array
    {
        return [
            'name' => fake()->company(),
            'industry' => fake()->randomElement(['retail', 'hospitality', 'pharmacy', 'restaurant', 'services']),
            'company_size' => fake()->randomElement(['1-10', '11-50', '51-200', '200+']),
            'website' => fake()->domainName(),
            'country' => fake()->randomElement(['Ghana', 'Nigeria', 'Liberia', 'Kenya']),
        ];
    }
}
