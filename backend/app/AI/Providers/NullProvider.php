<?php

namespace App\AI\Providers;

use App\AI\Support\LLMResponse;
use App\Exceptions\AI\AiProviderUnavailableException;

/**
 * Used when no LLM provider is configured (missing API key) or the
 * assistant is disabled via config. Always fails so callers fall back
 * to the static "AI unavailable" experience (spec §68) instead of a dead end.
 */
class NullProvider implements LLMProviderInterface
{
    public function chat(array $messages): LLMResponse
    {
        throw new AiProviderUnavailableException('No AI provider is configured.');
    }
}
