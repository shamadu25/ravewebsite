<?php

namespace Database\Factories;

use App\Models\KnowledgeChunk;
use App\Models\KnowledgeDocument;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<KnowledgeChunk>
 */
class KnowledgeChunkFactory extends Factory
{
    public function definition(): array
    {
        return [
            'knowledge_document_id' => KnowledgeDocument::factory(),
            'chunk_index' => 0,
            'content' => fake()->paragraph(),
        ];
    }
}
