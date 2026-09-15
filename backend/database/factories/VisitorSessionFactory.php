<?php

namespace Database\Factories;

use App\Models\Visitor;
use App\Models\VisitorSession;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<VisitorSession>
 */
class VisitorSessionFactory extends Factory
{
    public function definition(): array
    {
        return [
            'visitor_id' => Visitor::factory(),
            'landing_page' => '/',
            'current_page' => '/',
            'referrer' => null,
            'utm_source' => null,
            'utm_medium' => null,
            'utm_campaign' => null,
            'utm_content' => null,
            'utm_term' => null,
            'device' => 'desktop',
            'browser' => 'chrome',
            'language' => 'en',
            'started_at' => now(),
        ];
    }
}
