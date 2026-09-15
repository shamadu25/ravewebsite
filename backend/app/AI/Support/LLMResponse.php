<?php

namespace App\AI\Support;

final readonly class LLMResponse
{
    public function __construct(
        public string $content,
        public string $model,
        public int $inputTokens,
        public int $outputTokens,
        public int $latencyMs,
    ) {}
}
