<?php

namespace Tests\Unit;

use App\Models\Lead;
use App\Services\LeadScoring\LeadScoringService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class LeadScoringServiceTest extends TestCase
{
    use RefreshDatabase;

    public function test_it_sums_weighted_signals_into_a_total_score(): void
    {
        $lead = Lead::factory()->create();

        $score = app(LeadScoringService::class)->score($lead, [
            'decision_maker' => true,
            'clear_problem' => true,
            'contact_details_complete' => true,
            'pricing_interest' => false,
        ]);

        $this->assertSame(35, $score->total_score);
        $this->assertSame('nurture', $score->level);
        $this->assertCount(3, $score->components);
    }

    public function test_it_caps_the_total_score_at_one_hundred(): void
    {
        $lead = Lead::factory()->create();

        $score = app(LeadScoringService::class)->score($lead, [
            'decision_maker' => true,
            'clear_problem' => true,
            'high_business_impact' => true,
            'implementation_under_30_days' => true,
            'pricing_interest' => true,
            'demo_interest' => true,
            'meaningful_lead_volume' => true,
            'contact_details_complete' => true,
            'returning_high_intent_visitor' => true,
        ]);

        $this->assertSame(100, $score->total_score);
        $this->assertSame('hot', $score->level);
    }

    public function test_it_returns_low_level_for_no_signals(): void
    {
        $lead = Lead::factory()->create();

        $score = app(LeadScoringService::class)->score($lead, []);

        $this->assertSame(0, $score->total_score);
        $this->assertSame('low', $score->level);
    }
}
