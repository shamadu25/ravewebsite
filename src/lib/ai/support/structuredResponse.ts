/**
 * Parsed form of the agent's structured JSON output (spec §55). Never shown
 * raw to the visitor — only `message` is customer-facing.
 */
export interface ToolRequest {
  tool: string;
  input: Record<string, unknown>;
}

export interface StructuredAgentResponse {
  message: string;
  intent: string;
  stage: string;
  leadScoreDelta: number;
  detectedObjection: string | null;
  buyingSignal: boolean;
  recommendedNextAction: string;
  toolRequests: ToolRequest[];
  needsHuman: boolean;
}

export function parseStructuredAgentResponse(raw: unknown): StructuredAgentResponse {
  const data = (typeof raw === "object" && raw !== null ? raw : {}) as Record<string, unknown>;

  const toolRequests = Array.isArray(data.tool_requests)
    ? (data.tool_requests as unknown[])
        .filter((r): r is Record<string, unknown> => typeof r === "object" && r !== null)
        .map((r) => ({
          tool: typeof r.tool === "string" ? r.tool : "",
          input:
            typeof r.input === "object" && r.input !== null
              ? (r.input as Record<string, unknown>)
              : {},
        }))
        .filter((r) => r.tool !== "")
    : [];

  return {
    message:
      typeof data.message === "string" && data.message !== ""
        ? data.message
        : "I'm sorry, I couldn't process that. Could you rephrase?",
    intent: typeof data.intent === "string" && data.intent !== "" ? data.intent : "unknown",
    stage: typeof data.stage === "string" && data.stage !== "" ? data.stage : "engaged",
    leadScoreDelta: typeof data.lead_score_delta === "number" ? data.lead_score_delta : 0,
    detectedObjection:
      typeof data.detected_objection === "string" && data.detected_objection !== ""
        ? data.detected_objection
        : null,
    buyingSignal: data.buying_signal === true,
    recommendedNextAction:
      typeof data.recommended_next_action === "string" && data.recommended_next_action !== ""
        ? data.recommended_next_action
        : "continue_conversation",
    toolRequests,
    needsHuman: data.needs_human === true,
  };
}
