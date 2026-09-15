<?php

namespace App\AI\Providers;

use App\AI\Support\LLMResponse;

interface LLMProviderInterface
{
    /**
     * Send a chat completion request and get back raw JSON content plus usage.
     *
     * @param  array<int, array{role: string, content: string}>  $messages
     */
    public function chat(array $messages): LLMResponse;
}
