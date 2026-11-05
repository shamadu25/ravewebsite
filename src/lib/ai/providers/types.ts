export interface LLMMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface LLMResponse {
  content: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
  /** Which provider answered (set when several are configured). */
  provider?: string;
}

export interface LLMProvider {
  chat(messages: LLMMessage[]): Promise<LLMResponse>;
}

/** Thrown when no AI provider is configured/reachable (spec §68 — no dead end, fall back gracefully). */
export class AiProviderUnavailableError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "AiProviderUnavailableError";
  }
}

/** Per-request time limit for a chat provider, so a hung provider falls through to the next in time. */
export const REQUEST_TIMEOUT_MS = 15_000;
