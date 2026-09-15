<?php

namespace Database\Factories;

use App\Models\KnowledgeDocument;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<KnowledgeDocument>
 */
class KnowledgeDocumentFactory extends Factory
{
    public function definition(): array
    {
        $title = fake()->unique()->sentence(4);

        return [
            'title' => $title,
            'slug' => str($title)->slug(),
            'category' => 'faq',
            'content' => fake()->paragraphs(3, true),
            'source' => 'seed',
            'version' => 1,
            'status' => 'published',
            'effective_date' => null,
            'expires_at' => null,
            'approved_by' => 'system',
        ];
    }

    public function draft(): static
    {
        return $this->state(fn (array $attributes) => ['status' => 'draft']);
    }
}
