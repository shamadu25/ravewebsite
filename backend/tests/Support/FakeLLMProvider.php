<?php

namespace Tests\Support;

use App\AI\Providers\LLMProviderInterface;
use App\AI\Support\LLMResponse;

/**
 * Deterministic stand-in for OpenAIProvider so feature tests never hit the
 * network. Queue JSON payload strings via `willReturn` and they're served
 * back in order on each `chat()` call.
 */
class FakeLLMProvider implements LLMProviderInterface
{
    /** @var array<int, string> */
    private array $queue = [];

    /** @var array<int, array<int, array{role: string, content: string}>> */
    public array $receivedMessages = [];

    public function willReturn(string $jsonContent): static
    {
        $this->queue[] = $jsonContent;

        return $this;
    }

    public function chat(array $messages): LLMResponse
    {
        $this->receivedMessages[] = $messages;

        $content = array_shift($this->queue) ?? '{}';

        return new LLMResponse(
            content: $content,
            model: 'fake-model',
            inputTokens: 10,
            outputTokens: 10,
            latencyMs: 5,
        );
    }
}
