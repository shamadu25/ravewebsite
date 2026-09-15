<?php

namespace App\AI\Support;

/**
 * Parsed form of the agent's structured JSON output (spec §55). Never shown
 * raw to the visitor — only `message` is customer-facing.
 */
final readonly class StructuredAgentResponse
{
    /**
     * @param  array<int, array{tool: string, input: array<string, mixed>}>  $toolRequests
     */
    public function __construct(
        public string $message,
        public string $intent,
        public string $stage,
        public int $leadScoreDelta,
        public ?string $detectedObjection,
        public bool $buyingSignal,
        public string $recommendedNextAction,
        public array $toolRequests,
        public bool $needsHuman,
    ) {}

    /**
     * @param  array<string, mixed>  $data
     */
    public static function fromArray(array $data): self
    {
        return new self(
            message: (string) ($data['message'] ?? "I'm sorry, I couldn't process that. Could you rephrase?"),
            intent: (string) ($data['intent'] ?? 'unknown'),
            stage: (string) ($data['stage'] ?? 'engaged'),
            leadScoreDelta: (int) ($data['lead_score_delta'] ?? 0),
            detectedObjection: isset($data['detected_objection']) && $data['detected_objection'] !== ''
                ? (string) $data['detected_objection']
                : null,
            buyingSignal: (bool) ($data['buying_signal'] ?? false),
            recommendedNextAction: (string) ($data['recommended_next_action'] ?? 'continue_conversation'),
            toolRequests: is_array($data['tool_requests'] ?? null) ? $data['tool_requests'] : [],
            needsHuman: (bool) ($data['needs_human'] ?? false),
        );
    }
}
