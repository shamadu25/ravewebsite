<?php

namespace App\Services\Knowledge;

use App\Models\KnowledgeDocument;
use Illuminate\Support\Collection;
use Illuminate\Support\Str;

class KnowledgeRetrievalService
{
    /**
     * Keyword-based retrieval over published knowledge documents. No vector
     * embeddings yet (spec §31 notes this as a future upgrade) — matches are
     * ranked by how many query keywords appear in the title/content.
     *
     * @return Collection<int, KnowledgeDocument>
     */
    public function search(string $query, int $limit = 3, ?string $category = null): Collection
    {
        $keywords = collect(preg_split('/\s+/', Str::lower($query)) ?: [])
            ->filter(fn (string $word): bool => mb_strlen($word) >= 3)
            ->unique()
            ->values();

        if ($keywords->isEmpty()) {
            return collect();
        }

        $documents = KnowledgeDocument::query()
            ->published()
            ->when($category, fn ($q) => $q->where('category', $category))
            ->get();

        return $documents
            ->map(function (KnowledgeDocument $document) use ($keywords) {
                $haystack = Str::lower($document->title.' '.$document->content);
                $score = $keywords->reduce(
                    fn (int $carry, string $word): int => $carry + (Str::contains($haystack, $word) ? 1 : 0),
                    0
                );

                return ['document' => $document, 'score' => $score];
            })
            ->filter(fn (array $result): bool => $result['score'] > 0)
            ->sortByDesc('score')
            ->take($limit)
            ->pluck('document')
            ->values();
    }

    public function contextFor(string $query, ?string $category = null): string
    {
        return $this->search($query, category: $category)
            ->map(fn (KnowledgeDocument $document): string => "## {$document->title}\n{$document->content}")
            ->implode("\n\n");
    }
}
