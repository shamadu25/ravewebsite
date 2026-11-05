import { z } from "zod";
import { COMPLEXITIES } from "../types";

/** What kind of statement is this? The consultant must label every claim so facts, inferences and estimates are never blurred. */
export const BASES = ["CUSTOMER_PROVIDED", "INFERENCE", "ESTIMATE", "UNKNOWN"] as const;
export type Basis = (typeof BASES)[number];

const text = (n: number) => z.string().min(1).max(n);
const Claim = z.object({ text: text(500), basis: z.enum(BASES) });

export const RecommendationSchema = z.object({
  solutionKey: text(80),
  problemAddressed: text(500),
  whyRecommended: text(700),
  howItWorks: text(900),
  workflow: z.array(text(300)).min(1).max(8),
  requiredIntegrations: z.array(text(80)).max(12),
  keyCapabilities: z.array(text(240)).min(1).max(8),
  expectedOutcome: text(500),
  priority: z.enum(["HIGH", "MEDIUM", "LOW"]),
  complexity: z.enum(COMPLEXITIES),
});

/** NOTE: there are intentionally no price, saving, revenue or percentage fields anywhere in this schema. */
export const AnalysisSchema = z.object({
  businessOverview: z.object({ summary: text(1200), claims: z.array(Claim).max(10) }),
  operationalProblems: z.array(z.object({ problem: text(400), basis: z.enum(BASES) })).max(12),
  rootCauses: z.array(Claim).max(8),
  opportunities: z.array(z.object({ title: text(160), description: text(600), basis: z.enum(BASES) })).max(10),
  recommendations: z.array(RecommendationSchema).min(1).max(8),
  implementationScope: text(1200),
  implementationComplexity: z.enum(COMPLEXITIES),
  deliveryTimelineNote: text(400),
  expectedOutcomes: z.array(Claim).max(8),
  risks: z.array(text(400)).max(10),
  informationGaps: z.array(text(300)).max(10),
  nextSteps: z.array(text(300)).min(1).max(8),
  needsMoreInfo: z.boolean(),
});
export type BusinessAnalysis = z.infer<typeof AnalysisSchema>;
export type Recommendation = z.infer<typeof RecommendationSchema>;

/** Regexes for numbers that would be invented statistics/prices if the customer never supplied them. */
const UNSUPPORTED = [
  /\d[\d,.]*\s?%/g,
  /[$£€₵₦]\s?\d/g,
  /\b(?:USD|GHS|NGN|GBP|GH₵)\s?\d/gi,
  /\b\d+(?:\.\d+)?\s?(?:x|times)\s(?:more|faster|higher|increase|growth|return)/gi,
];

/** Returns the offending snippets (empty = clean). Numbers that appear verbatim in the customer's own input are allowed. */
export function findUnsupportedNumbers(analysis: BusinessAnalysis, customerInput: string): string[] {
  const hay = customerInput.toLowerCase();
  const out: string[] = [];
  const scan = (s: string) => {
    for (const re of UNSUPPORTED) {
      for (const m of s.matchAll(new RegExp(re.source, re.flags))) {
        const snippet = m[0].trim();
        if (!hay.includes(snippet.toLowerCase())) out.push(snippet);
      }
    }
  };
  const walk = (v: unknown) => {
    if (typeof v === "string") scan(v);
    else if (Array.isArray(v)) v.forEach(walk);
    else if (v && typeof v === "object") Object.values(v).forEach(walk);
  };
  walk(analysis);
  return [...new Set(out)];
}

/** Recommendations must reference catalogue solutions that were offered to the model. */
export function findInvalidSolutionKeys(analysis: BusinessAnalysis, allowed: string[]): string[] {
  return analysis.recommendations.map((r) => r.solutionKey).filter((k) => !allowed.includes(k));
}
