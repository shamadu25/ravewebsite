<?php

namespace App\Services\LeadScoring;

use App\Models\Lead;
use App\Models\LeadScore;

class LeadScoringService
{
    /**
     * Deterministic lead scoring (spec §12). $signals maps a subset of the
     * configured component keys to true when that signal was observed.
     *
     * @param  array<string, bool>  $signals
     */
    public function score(Lead $lead, array $signals): LeadScore
    {
        $weights = config('ai.lead_scoring');

        $components = collect($weights)
            ->only(array_keys(array_filter($signals)))
            ->map(fn (int $points, string $key): array => ['key' => $key, 'points' => $points]);

        $total = min(100, (int) $components->sum('points'));

        $leadScore = $lead->scores()->create([
            'total_score' => $total,
            'level' => $this->levelFor($total),
            'computed_at' => now(),
        ]);

        foreach ($components as $component) {
            $leadScore->components()->create($component);
        }

        return $leadScore;
    }

    private function levelFor(int $total): string
    {
        foreach (config('ai.lead_score_levels') as $level => [$min, $max]) {
            if ($total >= $min && $total <= $max) {
                return $level;
            }
        }

        return 'low';
    }
}
