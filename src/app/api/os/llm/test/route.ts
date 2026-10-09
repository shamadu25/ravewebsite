import { api } from "@/lib/os/http";
import { completeWith, configuredProviders, modelNameFor, parseJsonLoose, type ModelTier } from "@/lib/os/llm";

export const maxDuration = 60;
const TIERS: ModelTier[] = ["fast", "standard", "strong"];

/** Live check of every configured provider × tier with one tiny call each (no fallback, so a wrong model ID shows up as its own error). */
export const POST = api("agent.configure", async () => {
  const rows = await Promise.all(
    configuredProviders().flatMap((provider) =>
      TIERS.map(async (tier) => {
        try {
          const r = await completeWith(provider, { tier, json: true, temperature: 0, system: "Reply with exactly this JSON and nothing else: {\"ok\":true}", user: "ping", timeoutMs: 25_000 });
          return { provider, tier, model: r.model, ok: parseJsonLoose<{ ok?: boolean }>(r.text)?.ok === true, latencyMs: r.latencyMs, costUsd: r.costUsd, error: null as string | null };
        } catch (e) {
          return { provider, tier, model: modelNameFor(provider, tier), ok: false, latencyMs: 0, costUsd: 0, error: e instanceof Error ? e.message.slice(0, 200) : "failed" };
        }
      })
    )
  );
  return { providers: configuredProviders(), rows };
});
