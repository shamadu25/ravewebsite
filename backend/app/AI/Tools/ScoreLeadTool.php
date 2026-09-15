<?php

namespace App\AI\Tools;

use App\Models\Lead;
use App\Services\LeadScoring\LeadScoringService;
use InvalidArgumentException;

class ScoreLeadTool implements ToolInterface
{
    public function __construct(private readonly LeadScoringService $scoring) {}

    public function name(): string
    {
        return 'ScoreLeadTool';
    }

    public function execute(array $input): array
    {
        $leadId = $input['lead_id'] ?? null;

        if (! $leadId) {
            throw new InvalidArgumentException('lead_id is required.');
        }

        $lead = Lead::query()->findOrFail($leadId);

        $signals = is_array($input['signals'] ?? null) ? $input['signals'] : [];

        $score = $this->scoring->score($lead, $signals);

        return [
            'lead_id' => $lead->id,
            'total_score' => $score->total_score,
            'level' => $score->level,
        ];
    }
}
