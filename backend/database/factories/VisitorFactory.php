<?php

namespace Database\Factories;

use App\Models\Visitor;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<Visitor>
 */
class VisitorFactory extends Factory
{
    public function definition(): array
    {
        return [
            'external_id' => (string) Str::uuid(),
            'contact_id' => null,
            'first_seen_at' => now(),
            'last_seen_at' => now(),
            'sessions_count' => 1,
        ];
    }
}
