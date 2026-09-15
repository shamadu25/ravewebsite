<?php

namespace App\AI\Agents;

use App\AI\Guardrails\SystemPromptBuilder;
use App\AI\Providers\LLMProviderInterface;
use App\AI\Support\StructuredAgentResponse;
use App\AI\Tools\CreateLeadTool;
use App\AI\Tools\EscalateHumanTool;
use App\AI\Tools\ScoreLeadTool;
use App\AI\Tools\SearchKnowledgeTool;
use App\AI\Tools\ToolInterface;
use App\Exceptions\AI\AiProviderUnavailableException;
use App\Models\AgentRun;
use App\Models\Conversation;
use App\Models\ToolCall;
use App\Services\Knowledge\KnowledgeRetrievalService;
use App\Services\Prompts\PromptVersionService;
use Illuminate\Support\Facades\Log;
use Throwable;

class RaveConciergeAgent
{
    public const AGENT_KEY = 'rave_concierge';

    public const DEFAULT_PROMPT = <<<'PROMPT'
    Your job: greet visitors contextually, understand what they're trying to improve in their
    business, ask one or two diagnostic questions at a time, recommend the most relevant RaveSoft
    service, and progressively capture contact details once you've demonstrated value. Follow a
    diagnose -> personalize -> recommend -> prove -> CTA flow. Never dump a full feature list
    unprompted. When you have enough information and consent, request the CreateLeadTool tool with
    the contact details gathered so far, then ScoreLeadTool with observed signals as booleans keyed
    by: decision_maker, clear_problem, high_business_impact, implementation_under_30_days,
    pricing_interest, demo_interest, meaningful_lead_volume, contact_details_complete,
    returning_high_intent_visitor. Use SearchKnowledgeTool before answering factual questions about
    RaveSoft products/pricing/services. Use EscalateHumanTool and set needs_human=true for angry
    customers, enterprise/complex requests, pricing exceptions, or explicit requests for a human.
    PROMPT;

    /** @var array<string, ToolInterface> */
    private array $tools;

    public function __construct(
        private readonly LLMProviderInterface $llm,
        private readonly SystemPromptBuilder $promptBuilder,
        private readonly PromptVersionService $prompts,
        private readonly KnowledgeRetrievalService $knowledge,
        SearchKnowledgeTool $searchKnowledgeTool,
        CreateLeadTool $createLeadTool,
        ScoreLeadTool $scoreLeadTool,
        EscalateHumanTool $escalateHumanTool,
    ) {
        foreach ([$searchKnowledgeTool, $createLeadTool, $scoreLeadTool, $escalateHumanTool] as $tool) {
            $this->tools[$tool->name()] = $tool;
        }
    }

    /**
     * @param  array<int, array{role: string, content: string}>  $history
     * @param  array<string, mixed>  $context
     */
    public function respond(Conversation $conversation, array $history, array $context): StructuredAgentResponse
    {
        $basePrompt = $this->prompts->currentProductionContent(self::AGENT_KEY, self::DEFAULT_PROMPT);
        $latestUserMessage = collect($history)->last(fn (array $m): bool => $m['role'] === 'user')['content'] ?? '';
        $knowledgeContext = $this->knowledge->contextFor($latestUserMessage);

        $systemPrompt = $this->promptBuilder->build($basePrompt, $knowledgeContext, $context);

        $messages = [
            ['role' => 'system', 'content' => $systemPrompt],
            ...$history,
        ];

        $agentRun = AgentRun::query()->create([
            'conversation_id' => $conversation->id,
            'agent_key' => self::AGENT_KEY,
            'status' => 'success',
        ]);

        try {
            $llmResponse = $this->llm->chat($messages);
        } catch (AiProviderUnavailableException $e) {
            $agentRun->update(['status' => 'error', 'error' => $e->getMessage()]);
            throw $e;
        } catch (Throwable $e) {
            $agentRun->update(['status' => 'error', 'error' => $e->getMessage()]);
            Log::error('RaveConciergeAgent: LLM call failed', ['error' => $e->getMessage()]);
            throw new AiProviderUnavailableException('The AI provider request failed.', previous: $e);
        }

        $agentRun->update([
            'model' => $llmResponse->model,
            'input_tokens' => $llmResponse->inputTokens,
            'output_tokens' => $llmResponse->outputTokens,
            'latency_ms' => $llmResponse->latencyMs,
        ]);

        $decoded = json_decode($llmResponse->content, associative: true);
        $structured = StructuredAgentResponse::fromArray(is_array($decoded) ? $decoded : []);

        $agentRun->actions()->create([
            'action_type' => 'decision',
            'payload' => [
                'intent' => $structured->intent,
                'stage' => $structured->stage,
                'recommended_next_action' => $structured->recommendedNextAction,
                'needs_human' => $structured->needsHuman,
            ],
        ]);

        $this->executeToolRequests($structured, $conversation, $agentRun->id);

        return $structured;
    }

    private function executeToolRequests(StructuredAgentResponse $structured, Conversation $conversation, int $agentRunId): void
    {
        foreach ($structured->toolRequests as $request) {
            $toolName = $request['tool'] ?? null;
            $input = is_array($request['input'] ?? null) ? $request['input'] : [];
            $input['conversation_id'] ??= $conversation->id;

            $tool = $this->tools[$toolName] ?? null;

            if (! $tool) {
                continue;
            }

            $started = microtime(true);
            $status = 'success';
            $output = [];
            $error = null;

            try {
                $output = $tool->execute($input);
            } catch (Throwable $e) {
                $status = 'error';
                $error = $e->getMessage();
                Log::warning('RaveConciergeAgent: tool execution failed', [
                    'tool' => $toolName,
                    'error' => $error,
                ]);
            }

            ToolCall::query()->create([
                'agent_run_id' => $agentRunId,
                'tool_name' => $toolName,
                'input' => $input,
                'output' => $output,
                'status' => $status,
                'error' => $error,
                'latency_ms' => (int) round((microtime(true) - $started) * 1000),
            ]);
        }
    }
}
