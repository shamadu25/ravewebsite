import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getLLMProvider, LLMMessage } from "@/lib/ai/providers";
import { AiProviderUnavailableError } from "@/lib/ai/providers/types";
import { buildSystemPrompt, VisitorPromptContext } from "@/lib/ai/guardrails/systemPrompt";
import { knowledgeContextFor } from "@/lib/services/knowledgeRetrieval";
import { currentProductionContent } from "@/lib/services/promptVersion";
import { parseStructuredAgentResponse, StructuredAgentResponse } from "@/lib/ai/support/structuredResponse";
import { TOOLS } from "@/lib/ai/tools";

export const AGENT_KEY = "rave_concierge";

export const DEFAULT_PROMPT = `Your job: greet visitors contextually, understand what they're trying to improve in their
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

Set recommended_next_action to "whatsapp_continue" (without setting needs_human) once you've
captured contact details and the visitor seems ready to keep talking, discuss pricing/next steps,
or explicitly prefers WhatsApp — this offers them a way to continue the conversation there with
full context carried over, not a handoff. Do not set it before any contact details are captured.`;

export async function runRaveConciergeAgent(
  conversationId: number,
  history: LLMMessage[],
  context: VisitorPromptContext
): Promise<StructuredAgentResponse> {
  const basePrompt = await currentProductionContent(AGENT_KEY, DEFAULT_PROMPT);
  const latestUserMessage = [...history].reverse().find((m) => m.role === "user")?.content ?? "";
  const knowledgeContext = await knowledgeContextFor(latestUserMessage);
  const systemPrompt = buildSystemPrompt(basePrompt, knowledgeContext, context);

  const messages: LLMMessage[] = [{ role: "system", content: systemPrompt }, ...history];

  const agentRun = await prisma.agentRun.create({
    data: { conversationId, agentKey: AGENT_KEY, status: "success" },
  });

  const llm = getLLMProvider();
  let llmResponse;

  try {
    llmResponse = await llm.chat(messages);
  } catch (error) {
    await prisma.agentRun.update({
      where: { id: agentRun.id },
      data: { status: "error", error: error instanceof Error ? error.message : String(error) },
    });

    if (error instanceof AiProviderUnavailableError) {
      throw error;
    }

    console.error("RaveConciergeAgent: LLM call failed", error);
    throw new AiProviderUnavailableError("The AI provider request failed.", { cause: error });
  }

  await prisma.agentRun.update({
    where: { id: agentRun.id },
    data: {
      model: llmResponse.model,
      inputTokens: llmResponse.inputTokens,
      outputTokens: llmResponse.outputTokens,
      latencyMs: llmResponse.latencyMs,
    },
  });

  let decoded: unknown = {};
  try {
    decoded = JSON.parse(llmResponse.content);
  } catch {
    decoded = {};
  }

  const structured = parseStructuredAgentResponse(decoded);

  await prisma.agentAction.create({
    data: {
      agentRunId: agentRun.id,
      actionType: "decision",
      payload: {
        intent: structured.intent,
        stage: structured.stage,
        recommendedNextAction: structured.recommendedNextAction,
        needsHuman: structured.needsHuman,
      },
    },
  });

  await executeToolRequests(structured, conversationId, agentRun.id);

  return structured;
}

async function executeToolRequests(
  structured: StructuredAgentResponse,
  conversationId: number,
  agentRunId: number
): Promise<void> {
  for (const request of structured.toolRequests) {
    const tool = TOOLS[request.tool];
    // conversation_id always comes from our trusted context, never the model's
    // output — the model must not be able to target a different conversation.
    const input = { ...request.input, conversation_id: conversationId };

    if (!tool) {
      continue;
    }

    const started = Date.now();
    let status = "success";
    let output: Record<string, unknown> = {};
    let error: string | null = null;

    try {
      output = await tool.execute(input);
    } catch (err) {
      status = "error";
      error = err instanceof Error ? err.message : String(err);
      console.warn("RaveConciergeAgent: tool execution failed", { tool: request.tool, error });
    }

    await prisma.toolCall.create({
      data: {
        agentRunId,
        toolName: request.tool,
        input: input as Prisma.InputJsonValue,
        output: output as Prisma.InputJsonValue,
        status,
        error,
        latencyMs: Date.now() - started,
      },
    });
  }
}
