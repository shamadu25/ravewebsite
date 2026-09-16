import { AiProviderUnavailableError, LLMMessage, LLMProvider, LLMResponse } from "./types";

/**
 * Used when no LLM provider is configured (missing API key) or the assistant
 * is disabled. Always fails so callers fall back to the static "AI
 * unavailable" experience (spec §68) instead of a dead end.
 */
export class NullProvider implements LLMProvider {
  async chat(_messages: LLMMessage[]): Promise<LLMResponse> {
    throw new AiProviderUnavailableError("No AI provider is configured.");
  }
}
