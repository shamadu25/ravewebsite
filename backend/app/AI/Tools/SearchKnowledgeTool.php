<?php

namespace App\AI\Tools;

use App\Services\Knowledge\KnowledgeRetrievalService;

class SearchKnowledgeTool implements ToolInterface
{
    public function __construct(private readonly KnowledgeRetrievalService $knowledge) {}

    public function name(): string
    {
        return 'SearchKnowledgeTool';
    }

    public function execute(array $input): array
    {
        $query = trim((string) ($input['query'] ?? ''));

        if ($query === '') {
            return ['results' => []];
        }

        $results = $this->knowledge
            ->search($query, category: $input['category'] ?? null)
            ->map(fn ($document): array => [
                'title' => $document->title,
                'category' => $document->category,
                'content' => $document->content,
            ])
            ->all();

        return ['results' => $results];
    }
}
