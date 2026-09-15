<?php

namespace Database\Seeders;

use App\AI\Agents\RaveConciergeAgent;
use App\Models\AiPrompt;
use App\Services\Prompts\PromptVersionService;
use Illuminate\Database\Seeder;

class AiPromptSeeder extends Seeder
{
    public function run(): void
    {
        $existing = AiPrompt::query()->where('agent_key', RaveConciergeAgent::AGENT_KEY)->first();

        if ($existing?->productionVersion) {
            return;
        }

        $prompts = app(PromptVersionService::class);

        $version = $prompts->draft(
            RaveConciergeAgent::AGENT_KEY,
            'Rave Concierge',
            RaveConciergeAgent::DEFAULT_PROMPT,
            createdBy: 'system'
        );

        $prompts->publish($version, approvedBy: 'system');
    }
}
