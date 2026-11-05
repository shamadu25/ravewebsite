import { AI_CONFIG } from "@/lib/ai/config";
import { chatProviderOrder, chatProviders, getLLMProvider, type ChatProviderInfo } from "@/lib/ai/providers";
import { AiProviderUnavailableError } from "@/lib/ai/providers/types";

export type ChatAiCause =
  | "disabled"
  | "no_key"
  | "invalid_key"
  | "quota_or_rate_limit"
  | "model_not_found"
  | "provider_error"
  | "network"
  | "unknown";

export interface ChatAiDiagnosis {
  cause: ChatAiCause;
  /** What is wrong, in plain words. */
  summary: string;
  /** What to do about it. */
  fix: string;
}

const PROVIDER_LABEL: Record<string, { label: string; envVar: string; billing: string }> = {
  openai: { label: "OpenAI", envVar: "OPENAI_API_KEY", billing: "platform.openai.com/settings/organization/billing" },
  anthropic: { label: "Anthropic", envVar: "ANTHROPIC_API_KEY", billing: "console.anthropic.com/settings/billing" },
  google: { label: "Google Gemini", envVar: "GEMINI_API_KEY", billing: "aistudio.google.com (API key & billing)" },
};

function diagnoseOne(message: string, provider: string | null): ChatAiDiagnosis {
  const p = PROVIDER_LABEL[provider ?? "openai"] ?? PROVIDER_LABEL.openai;
  const status = /status (\d{3})/i.exec(message)?.[1];
  if (/No AI provider is configured/i.test(message) || /API_KEY is not configured/i.test(message)) {
    return { cause: "no_key", summary: "The chat has no AI provider key (or the assistant is switched off).", fix: "Set OPENAI_API_KEY, ANTHROPIC_API_KEY or GEMINI_API_KEY (and make sure AI_AGENT_ENABLED is not \"false\") in your hosting environment variables, then redeploy." };
  }
  if (status === "401" || status === "403") {
    return { cause: "invalid_key", summary: `${p.label} rejected the API key (HTTP ${status}).`, fix: `The key is wrong, revoked, or from another project. Create a new one and update ${p.envVar}.` };
  }
  if (status === "429") {
    return { cause: "quota_or_rate_limit", summary: `${p.label} refused the request: out of credit or rate-limited (HTTP 429).`, fix: `Add credit or raise the spending limit (${p.billing}), then retry.` };
  }
  if (status === "404" || status === "400") {
    return { cause: "model_not_found", summary: `${p.label} does not accept the configured model (HTTP ${status}).`, fix: `Check the model setting for ${p.label} (${provider === "openai" || !provider ? `OPENAI_MODEL, currently "${AI_CONFIG.openai.model}"` : provider === "anthropic" ? "OS_ANTHROPIC_MODEL_FAST" : "OS_GEMINI_MODEL_FAST"}) and its base URL.` };
  }
  if (status && status.startsWith("5")) {
    return { cause: "provider_error", summary: `${p.label} had an outage or internal error (HTTP ${status}).`, fix: "Usually temporary. Check the provider's status page and retry." };
  }
  if (/Failed to reach the AI provider/i.test(message)) {
    return { cause: "network", summary: `The server could not reach ${p.label} (timeout or connection error).`, fix: "Check the base URL and that your host allows outbound HTTPS to the provider." };
  }
  return { cause: "unknown", summary: message ? `Unexpected error: ${message.slice(0, 200)}` : "Unknown error.", fix: "Look at the server logs for \"RaveSoft AI agent failed\"; if the message mentions the database, run `npm run db:push`." };
}

/**
 * Turns the error text the AI provider layer produces into a plain-language cause and fix. When several
 * providers were tried, the text is "[openai] … | [google] …" and every failure is explained.
 */
export function diagnoseChatAiError(message: string | null | undefined): ChatAiDiagnosis {
  const m = message ?? "";
  const parts = m.split(" | ").map((part) => {
    const tagged = /^\[(\w+)\]\s*([\s\S]*)$/.exec(part.trim());
    return tagged ? diagnoseOne(tagged[2], tagged[1]) : diagnoseOne(part, null);
  });
  if (parts.length <= 1) return parts[0];
  return { cause: parts[0].cause, summary: `Every AI provider failed. ${parts.map((d) => d.summary).join(" ")}`, fix: parts.map((d) => d.fix).join(" ") };
}

export interface ChatAiStatus {
  enabled: boolean;
  providers: Array<ChatProviderInfo & { position: number | null }>;
  anyConfigured: boolean;
}

/** Configuration the website chat actually reads, in the order it tries it. Never includes a key. */
export function chatAiStatus(): ChatAiStatus {
  const order = chatProviderOrder().map((p) => p.name);
  return {
    enabled: AI_CONFIG.enabled,
    providers: chatProviders().map((p) => ({ ...p, position: order.includes(p.name) ? order.indexOf(p.name) + 1 : null })),
    anyConfigured: order.length > 0,
  };
}

/** Sends one tiny real request through the same chain the chat uses and reports exactly what happened. */
export async function testChatAi(): Promise<{ ok: true; model: string; provider: string | null; latencyMs: number } | ({ ok: false } & ChatAiDiagnosis)> {
  if (!AI_CONFIG.enabled) return { ok: false, cause: "disabled", summary: "AI_AGENT_ENABLED is set to \"false\".", fix: "Remove it or set AI_AGENT_ENABLED=true, then redeploy." };
  try {
    const r = await getLLMProvider().chat([{ role: "user", content: 'Reply with the JSON {"ok":true}.' }]);
    return { ok: true, model: r.model, provider: r.provider ?? null, latencyMs: r.latencyMs };
  } catch (error) {
    const text = error instanceof AiProviderUnavailableError || error instanceof Error ? error.message : String(error);
    return { ok: false, ...diagnoseChatAiError(text) };
  }
}
