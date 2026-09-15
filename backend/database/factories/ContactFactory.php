<?php

namespace Database\Factories;

use App\Models\Contact;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Contact>
 */
class ContactFactory extends Factory
{
    public function definition(): array
    {
        return [
            'company_id' => null,
            'first_name' => fake()->firstName(),
            'last_name' => fake()->lastName(),
            'job_title' => fake()->jobTitle(),
            'email' => fake()->safeEmail(),
            'phone' => fake()->phoneNumber(),
            'whatsapp' => fake()->phoneNumber(),
            'country' => fake()->randomElement(['Ghana', 'Nigeria', 'Liberia', 'Kenya']),
            'city' => fake()->city(),
            'consent_whatsapp' => false,
            'consent_email' => false,
        ];
    }
}
