<?php

namespace App\AI\Providers;

use App\AI\Support\LLMResponse;
use Illuminate\Support\Facades\Http;
use RuntimeException;

class OpenAIProvider implements LLMProviderInterface
{
    public function __construct(
        private readonly string $apiKey,
        private readonly string $model,
        private readonly string $baseUrl,
        private readonly int $timeout,
    ) {}

    public function chat(array $messages): LLMResponse
    {
        if ($this->apiKey === '') {
            throw new RuntimeException('OPENAI_API_KEY is not configured.');
        }

        $started = microtime(true);

        $response = Http::withToken($this->apiKey)
            ->timeout($this->timeout)
            ->baseUrl($this->baseUrl)
            ->post('/chat/completions', [
                'model' => $this->model,
                'messages' => $messages,
                'response_format' => ['type' => 'json_object'],
                'temperature' => 0.4,
            ])
            ->throw();

        $latencyMs = (int) round((microtime(true) - $started) * 1000);

        $data = $response->json();

        return new LLMResponse(
            content: (string) data_get($data, 'choices.0.message.content', '{}'),
            model: (string) data_get($data, 'model', $this->model),
            inputTokens: (int) data_get($data, 'usage.prompt_tokens', 0),
            outputTokens: (int) data_get($data, 'usage.completion_tokens', 0),
            latencyMs: $latencyMs,
        );
    }
}
