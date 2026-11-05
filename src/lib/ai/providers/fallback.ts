import { AiProviderUnavailableError, LLMMessage, LLMProvider, LLMResponse } from "./types";

export interface NamedProvider {
  name: string;
  provider: LLMProvider;
}

/** After a provider fails, skip it for this long (unless every provider is cooling down) so a dead primary
 * does not add its timeout to every single visitor message. */
export const COOLDOWN_MS = 60_000;

const cooldownUntil = new Map<string, number>();

/** Test hook. */
export function resetCooldowns(): void {
  cooldownUntil.clear();
}

/**
 * Tries each configured provider in order and answers with the first that works. Failures are collected so the
 * admin sees exactly why every provider failed: "[openai] …status 429. | [google] …status 503."
 */
export class FallbackProvider implements LLMProvider {
  constructor(
    private readonly chain: NamedProvider[],
    private readonly now: () => number = Date.now
  ) {}

  async chat(messages: LLMMessage[]): Promise<LLMResponse> {
    const t = this.now();
    const ready = this.chain.filter((p) => (cooldownUntil.get(p.name) ?? 0) <= t);
    // Everything is cooling down: better to retry than to refuse the visitor outright.
    const order = ready.length > 0 ? ready : this.chain;

    const failures: string[] = [];
    for (const { name, provider } of order) {
      try {
        const res = await provider.chat(messages);
        cooldownUntil.delete(name);
        return { ...res, provider: name };
      } catch (error) {
        cooldownUntil.set(name, this.now() + COOLDOWN_MS);
        const message = error instanceof Error ? error.message : String(error);
        failures.push(`[${name}] ${message}`);
        console.warn("[ai] provider failed, trying next", { provider: name, message });
      }
    }
    throw new AiProviderUnavailableError(failures.join(" | "));
  }
}
