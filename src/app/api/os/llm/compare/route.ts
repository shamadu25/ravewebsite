import { z } from "zod";
import { api, jsonBody } from "@/lib/os/http";
import { completeWith, configuredProviders, modelNameFor } from "@/lib/os/llm";
import { INTENT_SYSTEM, parseIntent } from "@/lib/os/reply-intent";
import { REPLY_DATASET } from "@/lib/os/evals/reply-intent";
import { audit } from "@/lib/os/audit";

export const maxDuration = 60;

/** Benchmarks each configured provider on the labelled reply dataset: accuracy, speed and cost, with the specific misses listed. */
export const POST = api("agent.configure", async ({ request, caller }) => {
  const { tier } = await jsonBody(request, z.object({ tier: z.enum(["fast", "standard", "strong"]).default("fast") }));
  const results = await Promise.all(configuredProviders().map(async (provider) => {
    let correct = 0, errors = 0, cost = 0, latency = 0, n = 0;
    const misses: Array<{ text: string; expected: string; got: string }> = [];
    const queue = REPLY_DATASET.map((d, i) => ({ d, i }));
    const worker = async () => {
      for (let item = queue.shift(); item; item = queue.shift()) {
        try {
          const r = await completeWith(provider, { tier, json: true, temperature: 0, system: INTENT_SYSTEM, user: `REPLY:\n"""${item.d.text}"""`, timeoutMs: 25_000 });
          const got = parseIntent(r.text);
          cost += r.costUsd; latency += r.latencyMs; n++;
          if (got === item.d.label) correct++; else misses.push({ text: item.d.text.slice(0, 90), expected: item.d.label, got: got ?? "UNPARSEABLE" });
        } catch { errors++; }
      }
    };
    await Promise.all([worker(), worker(), worker(), worker()]);
    return { provider, model: modelNameFor(provider, tier), answered: n, errors, accuracy: n ? correct / n : null, avgLatencyMs: n ? Math.round(latency / n) : null, costUsd: cost, costPer1000: n ? (cost / n) * 1000 : null, misses };
  }));
  await audit({ actor: caller.name, actorType: "HUMAN", action: "llm.compare", resource: "llm", input: { tier, size: REPLY_DATASET.length }, output: results.map((r) => ({ provider: r.provider, accuracy: r.accuracy })), ip: caller.ip });
  return { tier, size: REPLY_DATASET.length, results };
});
