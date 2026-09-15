<?php

namespace App\Services\Prompts;

use App\Models\AiPrompt;
use App\Models\AiPromptVersion;
use Illuminate\Support\Facades\DB;

class PromptVersionService
{
    public function currentProductionContent(string $agentKey, string $fallback = ''): string
    {
        $prompt = AiPrompt::query()->where('agent_key', $agentKey)->first();

        return $prompt?->productionVersion?->content ?? $fallback;
    }

    public function draft(string $agentKey, string $name, string $content, ?string $createdBy = null): AiPromptVersion
    {
        $prompt = AiPrompt::query()->firstOrCreate(
            ['agent_key' => $agentKey],
            ['name' => $name]
        );

        $nextVersion = ((int) $prompt->versions()->max('version')) + 1;

        return $prompt->versions()->create([
            'version' => $nextVersion,
            'content' => $content,
            'status' => 'draft',
            'created_by' => $createdBy,
        ]);
    }

    public function publish(AiPromptVersion $version, ?string $approvedBy = null): AiPromptVersion
    {
        return DB::transaction(function () use ($version, $approvedBy) {
            AiPromptVersion::query()
                ->where('ai_prompt_id', $version->ai_prompt_id)
                ->where('status', 'production')
                ->update(['status' => 'archived']);

            $version->update([
                'status' => 'production',
                'approved_by' => $approvedBy,
                'published_at' => now(),
            ]);

            return $version->refresh();
        });
    }

    public function rollbackTo(AiPromptVersion $version, ?string $approvedBy = null): AiPromptVersion
    {
        return $this->publish($version, $approvedBy);
    }
}
