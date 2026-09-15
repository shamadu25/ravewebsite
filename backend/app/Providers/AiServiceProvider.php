<?php

namespace App\Providers;

use App\AI\Providers\LLMProviderInterface;
use App\AI\Providers\NullProvider;
use App\AI\Providers\OpenAIProvider;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AiServiceProvider extends ServiceProvider
{
    /**
     * Register services.
     */
    public function register(): void
    {
        $this->app->bind(LLMProviderInterface::class, function (): LLMProviderInterface {
            $enabled = (bool) config('ai.enabled');
            $apiKey = (string) config('ai.openai.api_key');

            if (! $enabled || $apiKey === '') {
                return new NullProvider;
            }

            return new OpenAIProvider(
                apiKey: $apiKey,
                model: (string) config('ai.openai.model'),
                baseUrl: (string) config('ai.openai.base_url'),
                timeout: (int) config('ai.openai.timeout'),
            );
        });
    }

    /**
     * Bootstrap services.
     */
    public function boot(): void
    {
        RateLimiter::for('ai-chat', fn (Request $request): Limit => Limit::perMinute(20)->by($request->ip()));
    }
}
