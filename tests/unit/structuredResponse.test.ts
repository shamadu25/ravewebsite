import { parseStructuredAgentResponse } from "@/lib/ai/support/structuredResponse";

describe("parseStructuredAgentResponse", () => {
  it("parses a complete payload", () => {
    const result = parseStructuredAgentResponse({
      message: "How many WhatsApp inquiries do you get daily?",
      intent: "whatsapp_automation",
      stage: "discovery",
      lead_score_delta: 10,
      detected_objection: "price",
      buying_signal: true,
      recommended_next_action: "ask_daily_inquiry_volume",
      tool_requests: [{ tool: "SearchKnowledgeTool", input: { query: "pricing" } }],
      needs_human: false,
    });

    expect(result.intent).toBe("whatsapp_automation");
    expect(result.stage).toBe("discovery");
    expect(result.leadScoreDelta).toBe(10);
    expect(result.detectedObjection).toBe("price");
    expect(result.buyingSignal).toBe(true);
    expect(result.needsHuman).toBe(false);
    expect(result.toolRequests).toHaveLength(1);
  });

  it("falls back to safe defaults for missing or malformed fields", () => {
    const result = parseStructuredAgentResponse({});

    expect(result.intent).toBe("unknown");
    expect(result.stage).toBe("engaged");
    expect(result.leadScoreDelta).toBe(0);
    expect(result.detectedObjection).toBeNull();
    expect(result.buyingSignal).toBe(false);
    expect(result.needsHuman).toBe(false);
    expect(result.toolRequests).toEqual([]);
  });

  it("ignores non-array tool_requests", () => {
    const result = parseStructuredAgentResponse({ tool_requests: "not-an-array" });
    expect(result.toolRequests).toEqual([]);
  });

  it("handles completely non-object input", () => {
    const result = parseStructuredAgentResponse(null);
    expect(result.message).toContain("couldn't process");
  });
});
