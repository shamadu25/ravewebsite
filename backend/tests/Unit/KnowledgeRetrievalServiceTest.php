<?php

namespace Tests\Unit;

use App\Models\KnowledgeDocument;
use App\Services\Knowledge\KnowledgeRetrievalService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class KnowledgeRetrievalServiceTest extends TestCase
{
    use RefreshDatabase;

    public function test_it_only_returns_published_documents(): void
    {
        KnowledgeDocument::factory()->create([
            'title' => 'CliqPOS pricing overview',
            'content' => 'CliqPOS is a cloud point of sale system.',
            'category' => 'cliqpos',
        ]);

        KnowledgeDocument::factory()->draft()->create([
            'title' => 'CliqPOS unreleased feature',
            'content' => 'CliqPOS will soon support something unannounced.',
            'category' => 'cliqpos',
        ]);

        $results = app(KnowledgeRetrievalService::class)->search('cliqpos pricing');

        $this->assertCount(1, $results);
        $this->assertSame('CliqPOS pricing overview', $results->first()->title);
    }

    public function test_it_excludes_expired_documents(): void
    {
        KnowledgeDocument::factory()->create([
            'title' => 'Old promotion',
            'content' => 'A limited time hotel booking promotion.',
            'category' => 'faq',
            'expires_at' => now()->subDay(),
        ]);

        $results = app(KnowledgeRetrievalService::class)->search('hotel booking promotion');

        $this->assertCount(0, $results);
    }

    public function test_it_ranks_documents_by_keyword_match_count(): void
    {
        KnowledgeDocument::factory()->create([
            'title' => 'Hotel management system',
            'content' => 'Bookings, rooms, guests, billing, housekeeping for hotels.',
            'category' => 'hotel',
        ]);

        KnowledgeDocument::factory()->create([
            'title' => 'CliqPOS overview',
            'content' => 'Point of sale for retail businesses.',
            'category' => 'cliqpos',
        ]);

        $results = app(KnowledgeRetrievalService::class)->search('hotel bookings rooms guests');

        $this->assertSame('Hotel management system', $results->first()->title);
    }

    public function test_empty_query_returns_no_results(): void
    {
        KnowledgeDocument::factory()->create();

        $results = app(KnowledgeRetrievalService::class)->search('   ');

        $this->assertCount(0, $results);
    }
}
