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

/** USD per 1M tokens [input, output]. Estimates for cost control — override with OS_PRICE_<MODEL>=in,out. A function lets a price change on a known date. */
type Price = [number, number] | (() => [number, number]);
const PRICES: Record<string, Price> = {
  "gpt-4o-mini": [0.15, 0.6],
  "gpt-4o": [2.5, 10],
  "claude-haiku-5-5": [1, 5],
  "claude-sonnet-5-5": [3, 15],
  "claude-opus-5-5": [15, 75],
  // Gemini — from Google's published paid-tier pricing (output includes thinking tokens). 3.8 Flash is promotional until 2026-12-31.
  "gemini-3.5-flash-lite": [0.3, 2.5],
  "gemini-3.8-flash": () => (Date.now() >= Date.UTC(2027, 0, 1) ? [1.5, 7.5] : [0.75, 3.75]),
  "gemini-3.1-pro": [2, 12],
  "gemini-2.5-flash-lite": [0.1, 0.4],
  "gemini-2.5-flash": [0.3, 2.5],
  "gemini-2.5-pro": [1.25, 10],
};

/** Providers return dated IDs (gpt-4o-mini-2024-07-18); match the longest known price key that prefixes the model name. */
export function priceKeyFor(model: string): string | null {
  return Object.keys(PRICES).filter((k) => model.toLowerCase().startsWith(k)).sort((a, b) => b.length - a.length)[0] ?? null;
}

export function estimateCostUsd(model: string, inTok: number, outTok: number): number {
  const key = priceKeyFor(model) ?? model;
  const override = process.env[`OS_PRICE_${key.toUpperCase().replace(/[^A-Z0-9]/g, "_")}`];
  const [pi, po] = override ? (override.split(",").map(Number) as [number, number]) : (typeof PRICES[key] === "function" ? (PRICES[key] as () => [number, number])() : (PRICES[key] as [number, number] | undefined)) ?? [3, 15]; // unknown models: conservative default
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

const gemini: Provider = {
  name: "google",
  available: () => !!process.env.GEMINI_API_KEY,
  // Defaults are the current 3.x family (verified live against Google's API); set OS_GEMINI_MODEL_FAST/STANDARD/STRONG to newer IDs from Google's model list. "Test models" on /admin/models verifies them live.
  modelFor: (tier) =>
    tier === "strong" ? (process.env.OS_GEMINI_MODEL_STRONG ?? "gemini-3.1-pro-preview") : tier === "standard" ? (process.env.OS_GEMINI_MODEL_STANDARD ?? "gemini-3.8-flash") : (process.env.OS_GEMINI_MODEL_FAST ?? "gemini-3.5-flash-lite"),
  async complete(model, o) {
    const base = process.env.GEMINI_BASE_URL ?? "https://generativelanguage.googleapis.com/v1beta";
    const res = await fetch(`${base}/models/${encodeURIComponent(model)}:generateContent`, {
      method: "POST",
      headers: { "x-goog-api-key": process.env.GEMINI_API_KEY ?? "", "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: o.system }] },
        contents: [{ role: "user", parts: [{ text: o.user }] }],
        generationConfig: { temperature: o.temperature ?? 0.3, ...(o.json ? { responseMimeType: "application/json" } : {}) },
      }),
      signal: AbortSignal.timeout(o.timeoutMs ?? 45_000),
    });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(`google ${res.status}: ${String(d?.error?.message ?? "request failed").slice(0, 160)}`);
    const text = (d?.candidates?.[0]?.content?.parts ?? []).map((p: { text?: string }) => p.text ?? "").join("");
    if (!text) throw new Error(`google returned no text (finish: ${d?.candidates?.[0]?.finishReason ?? "unknown"})`);
    return { text, model: d?.modelVersion ?? model, inputTokens: d?.usageMetadata?.promptTokenCount ?? 0, outputTokens: (d?.usageMetadata?.candidatesTokenCount ?? 0) + (d?.usageMetadata?.thoughtsTokenCount ?? 0) };
  },
};

const PROVIDERS: Provider[] = [openai, anthropic, gemini];

export function llmStatus(): { configured: boolean; providers: Array<{ name: string; available: boolean }> } {
  const providers = PROVIDERS.map((p) => ({ name: p.name, available: p.available() }));
  return { configured: providers.some((p) => p.available), providers };
}

export type ProviderName = "openai" | "anthropic" | "google";

/** Provider order for a tier: OS_PROVIDER_<TIER> (e.g. OS_PROVIDER_FAST=google) first, then OS_LLM_PROVIDER, then the rest. */
export function providerOrder(tier: ModelTier): Provider[] {
  const want = [process.env[`OS_PROVIDER_${tier.toUpperCase()}`], process.env.OS_LLM_PROVIDER].filter(Boolean);
  const rank = (p: Provider) => { const i = want.indexOf(p.name); return i === -1 ? 99 : i; };
  return [...PROVIDERS].sort((a, b) => rank(a) - rank(b)).filter((p) => p.available());
}

async function run(p: Provider, o: CompleteOptions): Promise<Completion> {
  const started = Date.now();
  const r = await p.complete(p.modelFor(o.tier), o);
  return { ...r, provider: p.name, latencyMs: Date.now() - started, costUsd: estimateCostUsd(r.model, r.inputTokens, r.outputTokens) };
}

/** Routes by tier and falls through to the next provider if one fails, so one outage never stops the workforce. */
export async function complete(o: CompleteOptions): Promise<Completion> {
  const ordered = providerOrder(o.tier);
  if (!ordered.length) throw new LlmUnavailableError("No LLM provider is configured (set OPENAI_API_KEY, ANTHROPIC_API_KEY or GEMINI_API_KEY).");
  let lastError: unknown;
  for (const p of ordered) {
    try { return await run(p, o); } catch (e) { lastError = e; }
  }
  throw new LlmUnavailableError(`All LLM providers failed: ${lastError instanceof Error ? lastError.message : "unknown"}`);
}

/** Run on one specific provider with NO fallback — used by model tests and comparisons so results are attributed correctly. */
export async function completeWith(provider: ProviderName, o: CompleteOptions): Promise<Completion> {
  const p = PROVIDERS.find((x) => x.name === provider);
  if (!p || !p.available()) throw new LlmUnavailableError(`${provider} is not configured.`);
  return run(p, o);
}

export const configuredProviders = (): ProviderName[] => PROVIDERS.filter((p) => p.available()).map((p) => p.name as ProviderName);
export const modelNameFor = (provider: ProviderName, tier: ModelTier) => PROVIDERS.find((p) => p.name === provider)?.modelFor(tier) ?? "";

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
