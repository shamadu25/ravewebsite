import { AI_CONFIG } from "@/lib/ai/config";
import { getLLMProvider } from "@/lib/ai/providers";
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

/** Turns the error text the AI provider layer produces into a plain-language cause and fix. */
export function diagnoseChatAiError(message: string | null | undefined): ChatAiDiagnosis {
  const m = message ?? "";
  if (/No AI provider is configured/i.test(m) || /OPENAI_API_KEY is not configured/i.test(m)) {
    return { cause: "no_key", summary: "The chat has no OpenAI API key (or the assistant is switched off).", fix: "Set OPENAI_API_KEY (and make sure AI_AGENT_ENABLED is not \"false\") in your hosting environment variables, then redeploy." };
  }
  const status = /status (\d{3})/i.exec(m)?.[1];
  if (status === "401" || status === "403") {
    return { cause: "invalid_key", summary: `OpenAI rejected the API key (HTTP ${status}).`, fix: "The key is wrong, revoked, or from a different project. Create a new key at platform.openai.com/api-keys and update OPENAI_API_KEY." };
  }
  if (status === "429") {
    return { cause: "quota_or_rate_limit", summary: "OpenAI refused the request: the account is out of credit or rate-limited (HTTP 429).", fix: "Add billing credit / raise the spending limit at platform.openai.com/settings/organization/billing, then retry." };
  }
  if (status === "404" || status === "400") {
    return { cause: "model_not_found", summary: `OpenAI does not accept the configured model (HTTP ${status}).`, fix: `Check OPENAI_MODEL (currently "${AI_CONFIG.openai.model}") and OPENAI_BASE_URL. Use a model your account can access, e.g. gpt-4o-mini.` };
  }
  if (status && status.startsWith("5")) {
    return { cause: "provider_error", summary: `OpenAI had an outage or internal error (HTTP ${status}).`, fix: "Usually temporary. Check status.openai.com and retry." };
  }
  if (/Failed to reach the AI provider/i.test(m)) {
    return { cause: "network", summary: "The server could not connect to the AI provider.", fix: "Check OPENAI_BASE_URL and that your host allows outbound HTTPS to the provider." };
  }
  return { cause: "unknown", summary: m ? `Unexpected error: ${m.slice(0, 200)}` : "Unknown error.", fix: "Look at the server logs for \"RaveSoft AI agent failed\"; if the message mentions the database, run `npm run db:push`." };
}

export interface ChatAiStatus {
  enabled: boolean;
  keyConfigured: boolean;
  model: string;
  baseUrl: string;
}

/** Configuration the website chat actually reads. Never includes the key itself. */
export function chatAiStatus(): ChatAiStatus {
  return { enabled: AI_CONFIG.enabled, keyConfigured: Boolean(AI_CONFIG.openai.apiKey), model: AI_CONFIG.openai.model, baseUrl: AI_CONFIG.openai.baseUrl };
}

/** Sends one tiny real request through the same provider the chat uses and reports exactly what happened. */
export async function testChatAi(): Promise<{ ok: true; model: string; latencyMs: number } | ({ ok: false } & ChatAiDiagnosis)> {
  if (!AI_CONFIG.enabled) return { ok: false, cause: "disabled", summary: "AI_AGENT_ENABLED is set to \"false\".", fix: "Remove it or set AI_AGENT_ENABLED=true, then redeploy." };
  try {
    const r = await getLLMProvider().chat([{ role: "user", content: 'Reply with the JSON {"ok":true}.' }]);
    return { ok: true, model: r.model, latencyMs: r.latencyMs };
  } catch (error) {
    const text = error instanceof AiProviderUnavailableError || error instanceof Error ? error.message : String(error);
    return { ok: false, ...diagnoseChatAiError(text) };
  }
}
