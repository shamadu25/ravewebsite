import { complete, llmStatus, parseJsonLoose } from "@/lib/os/llm";
import { AnalysisSchema, findInvalidSolutionKeys, findUnsupportedNumbers, type BusinessAnalysis } from "./schema";
import { buildRulesAnalysis } from "./deterministic";
import { SYSTEM_PROMPT, PROMPT_VERSION, buildUserPrompt } from "./prompt";
import type { AnalysisContext } from "./context";

export interface ProviderResult { output: unknown; provider: string; model: string }
/** Swap the AI model/vendor by implementing this interface; nothing else in the platform changes. */
export interface AnalysisProvider {
  name: string;
  isAvailable(): boolean;
  analyse(ctx: AnalysisContext, feedback?: string): Promise<ProviderResult>;
}

/** Default provider: the platform's existing multi-vendor router (OpenAI / Anthropic / Gemini by configuration). */
export const llmProvider: AnalysisProvider = {
  name: "llm-router",
  isAvailable: () => llmStatus().configured,
  async analyse(ctx, feedback) {
    const c = await complete({ tier: "standard", system: SYSTEM_PROMPT, user: buildUserPrompt(ctx, feedback), json: true, temperature: 0.2, timeoutMs: 55_000 });
    return { output: parseJsonLoose(c.text), provider: c.provider, model: c.model };
  },
};

/** Always-available fallback: derives the analysis from catalogue matches and customer facts only. */
export const rulesProvider: AnalysisProvider = {
  name: "rules",
  isAvailable: () => true,
  async analyse(ctx) { return { output: buildRulesAnalysis(ctx), provider: "rules", model: "deterministic-v1" }; },
};

export interface AnalysisRun { analysis: BusinessAnalysis; provider: string; model: string; promptVersion: string; status: "OK" | "FALLBACK"; note?: string }

/**
 * Orchestrates analysis: try each AI provider (with one corrective retry), validate against the schema and the guards
 * (catalogue keys only, no invented numbers), and fall back to the rules provider. Never throws for provider failures.
 */
export async function runAnalysis(ctx: AnalysisContext, providers: AnalysisProvider[] = [llmProvider]): Promise<AnalysisRun> {
  const allowed = ctx.candidates.map((c) => c.key);
  const customerText = ctx.customerText;
  let lastNote = "";

  for (const p of providers) {
    if (!p.isAvailable()) { lastNote = `${p.name} not configured`; continue; }
    let feedback: string | undefined;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const r = await p.analyse(ctx, feedback);
        const parsed = AnalysisSchema.safeParse(r.output);
        if (!parsed.success) { feedback = `Your last output failed validation: ${parsed.error.issues.slice(0, 5).map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")}`; lastNote = "schema validation failed"; continue; }
        const badKeys = findInvalidSolutionKeys(parsed.data, allowed);
        if (badKeys.length) { feedback = `You referenced solutions that are not in the candidate list: ${badKeys.join(", ")}. Use only the provided keys.`; lastNote = "unknown solution key"; continue; }
        const bad = findUnsupportedNumbers(parsed.data, customerText);
        if (bad.length) { feedback = `Remove invented figures (${bad.slice(0, 5).join(", ")}). Never state percentages, prices, savings or statistics the customer did not provide.`; lastNote = "unsupported numbers"; continue; }
        return { analysis: parsed.data, provider: r.provider, model: r.model, promptVersion: PROMPT_VERSION, status: "OK" };
      } catch (e) { lastNote = `${p.name} error: ${e instanceof Error ? e.message.slice(0, 120) : "unknown"}`; break; }
    }
  }
  const r = await rulesProvider.analyse(ctx);
  const parsed = AnalysisSchema.parse(r.output);
  return { analysis: parsed, provider: r.provider, model: r.model, promptVersion: PROMPT_VERSION, status: "FALLBACK", note: `Rules-based analysis used (${lastNote || "no AI provider configured"}).` };
}
