<?php

namespace Database\Factories;

use App\Models\AiPrompt;
use App\Models\AiPromptVersion;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<AiPromptVersion>
 */
class AiPromptVersionFactory extends Factory
{
    public function definition(): array
    {
        return [
            'ai_prompt_id' => AiPrompt::factory(),
            'version' => 1,
            'content' => 'You are Rave AI, RaveSoft\'s AI business consultant.',
            'status' => 'draft',
            'created_by' => 'system',
            'approved_by' => null,
            'published_at' => null,
            'performance_metrics' => null,
        ];
    }

    public function production(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'production',
            'published_at' => now(),
            'approved_by' => 'system',
        ]);
    }
}
