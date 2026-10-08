/**
 * Model routing (spec §41). Providers sit behind one interface; the tier (fast/standard/strong)
 * decides model choice, so cheap tasks never pay for strategic-grade models.
 */
export type ModelTier = "fast" | "standard" | "strong";

export interface CompleteOptions {
  tier: ModelTier;
  system: string;
  user: string;
  json?: boolean;
  temperature?: number;
  timeoutMs?: number;
}

export interface Completion {
  text: string;
  provider: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  latencyMs: number;
}

export class LlmUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LlmUnavailableError";
  }
}

interface Provider {
  name: string;
  available(): boolean;
  modelFor(tier: ModelTier): string;
  complete(model: string, o: CompleteOptions): Promise<Omit<Completion, "costUsd" | "provider" | "latencyMs">>;
}

/** USD per 1M tokens [input, output]. Estimates for cost control — override with OS_PRICE_<MODEL>=in,out. */
const PRICES: Record<string, [number, number]> = {
  "gpt-4o-mini": [0.15, 0.6],
  "gpt-4o": [2.5, 10],
  "claude-haiku-5-5": [1, 5],
  "claude-sonnet-5-5": [3, 15],
  "claude-opus-5-5": [15, 75],
};

export function estimateCostUsd(model: string, inTok: number, outTok: number): number {
  const override = process.env[`OS_PRICE_${model.toUpperCase().replace(/[^A-Z0-9]/g, "_")}`];
  const [pi, po] = override ? (override.split(",").map(Number) as [number, number]) : (PRICES[model] ?? [3, 15]);
  return Math.round(((inTok * pi + outTok * po) / 1_000_000) * 1e6) / 1e6;
}

const openai: Provider = {
  name: "openai",
  available: () => !!process.env.OPENAI_API_KEY && process.env.AI_AGENT_ENABLED !== "false",
  modelFor: (tier) =>
    tier === "strong"
      ? (process.env.OS_OPENAI_MODEL_STRONG ?? "gpt-4o")
      : tier === "standard"
        ? (process.env.OS_OPENAI_MODEL_STANDARD ?? process.env.OPENAI_MODEL ?? "gpt-4o-mini")
        : (process.env.OS_OPENAI_MODEL_FAST ?? process.env.OPENAI_MODEL ?? "gpt-4o-mini"),
  async complete(model, o) {
    const res = await fetch(`${process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1"}/chat/completions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        temperature: o.temperature ?? 0.3,
        messages: [
          { role: "system", content: o.system },
          { role: "user", content: o.user },
        ],
        ...(o.json ? { response_format: { type: "json_object" } } : {}),
      }),
      signal: AbortSignal.timeout(o.timeoutMs ?? 45_000),
    });
    if (!res.ok) throw new Error(`openai ${res.status}`);
    const d = await res.json();
    return { text: d?.choices?.[0]?.message?.content ?? "", model: d?.model ?? model, inputTokens: d?.usage?.prompt_tokens ?? 0, outputTokens: d?.usage?.completion_tokens ?? 0 };
  },
};

const anthropic: Provider = {
  name: "anthropic",
  available: () => !!process.env.ANTHROPIC_API_KEY,
  modelFor: (tier) =>
    tier === "strong" ? (process.env.OS_ANTHROPIC_MODEL_STRONG ?? "claude-opus-5-5") : tier === "standard" ? (process.env.OS_ANTHROPIC_MODEL_STANDARD ?? "claude-sonnet-5-5") : (process.env.OS_ANTHROPIC_MODEL_FAST ?? "claude-haiku-5-5"),
  async complete(model, o) {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": process.env.ANTHROPIC_API_KEY ?? "", "anthropic-version": "2023-06-01", "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        max_tokens: 2048,
        temperature: o.temperature ?? 0.3,
        system: o.json ? `${o.system}\n\nRespond with a single valid JSON object and nothing else.` : o.system,
        messages: [{ role: "user", content: o.user }],
      }),
      signal: AbortSignal.timeout(o.timeoutMs ?? 45_000),
    });
    if (!res.ok) throw new Error(`anthropic ${res.status}`);
    const d = await res.json();
    const text = (d?.content ?? []).filter((b: { type: string }) => b.type === "text").map((b: { text: string }) => b.text).join("");
    return { text, model: d?.model ?? model, inputTokens: d?.usage?.input_tokens ?? 0, outputTokens: d?.usage?.output_tokens ?? 0 };
  },
};

const PROVIDERS: Provider[] = [openai, anthropic];

export function llmStatus(): { configured: boolean; providers: Array<{ name: string; available: boolean }> } {
  const providers = PROVIDERS.map((p) => ({ name: p.name, available: p.available() }));
  return { configured: providers.some((p) => p.available), providers };
}

/** Preferred provider order: OS_LLM_PROVIDER first, then the rest. Falls through on provider failure. */
export async function complete(o: CompleteOptions): Promise<Completion> {
  const preferred = process.env.OS_LLM_PROVIDER;
  const ordered = [...PROVIDERS].sort((a, b) => (a.name === preferred ? -1 : b.name === preferred ? 1 : 0)).filter((p) => p.available());
  if (!ordered.length) throw new LlmUnavailableError("No LLM provider is configured (set OPENAI_API_KEY or ANTHROPIC_API_KEY).");

  let lastError: unknown;
  for (const p of ordered) {
    const started = Date.now();
    try {
      const r = await p.complete(p.modelFor(o.tier), o);
      return { ...r, provider: p.name, latencyMs: Date.now() - started, costUsd: estimateCostUsd(r.model, r.inputTokens, r.outputTokens) };
    } catch (e) {
      lastError = e;
    }
  }
  throw new LlmUnavailableError(`All LLM providers failed: ${lastError instanceof Error ? lastError.message : "unknown"}`);
}

/** Parse model JSON defensively — models sometimes wrap it in prose or fences. */
export function parseJsonLoose<T = unknown>(text: string): T | null {
  try {
    return JSON.parse(text) as T;
  } catch {
    const m = /\{[\s\S]*\}/.exec(text);
    if (!m) return null;
    try {
      return JSON.parse(m[0]) as T;
    } catch {
      return null;
    }
  }
}
