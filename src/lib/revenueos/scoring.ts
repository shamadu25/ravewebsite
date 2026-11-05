/**
 * RevenueOS lead scoring (directive §6 Agent 7). 100 points, fully explainable.
 * Missing information scores 0 — it is never counted as positive evidence.
 */
export const SCORE_MAX = {
  productFit: 20,
  operationalOpportunity: 20,
  commercialFit: 15,
  decisionMaker: 15,
  buyingSignals: 15,
  verifiedContact: 10,
  geography: 5,
} as const;
export type ScoreComponentKey = keyof typeof SCORE_MAX;

/** Each component is 0..1 (fraction of its max) plus the evidence that justifies it. */
export interface ComponentInput { fraction: number; evidence: string }
export type ScoreInput = Partial<Record<ScoreComponentKey, ComponentInput>>;

export type Priority = "A" | "B" | "C" | "REJECT";
export interface Thresholds { a: number; b: number; c: number }
export const DEFAULT_THRESHOLDS: Thresholds = { a: 85, b: 70, c: 50 };

export interface ScoreComponent { key: ScoreComponentKey; max: number; points: number; evidence: string }
export interface LeadScoreResult { total: number; priority: Priority; components: ScoreComponent[]; autoOutreachEligible: boolean }

export function classify(total: number, t: Thresholds = DEFAULT_THRESHOLDS): Priority {
  if (total >= t.a) return "A";
  if (total >= t.b) return "B";
  if (total >= t.c) return "C";
  return "REJECT";
}

export function scoreLead(input: ScoreInput, t: Thresholds = DEFAULT_THRESHOLDS): LeadScoreResult {
  const components = (Object.keys(SCORE_MAX) as ScoreComponentKey[]).map((key): ScoreComponent => {
    const c = input[key];
    const evidence = c?.evidence?.trim() ?? "";
    // No evidence string => no points, regardless of the claimed fraction.
    const fraction = c && evidence && Number.isFinite(c.fraction) ? Math.min(1, Math.max(0, c.fraction)) : 0;
    return { key, max: SCORE_MAX[key], points: Math.round(fraction * SCORE_MAX[key] * 10) / 10, evidence: evidence || "No evidence" };
  });
  const total = Math.round(components.reduce((s, c) => s + c.points, 0));
  const priority = classify(total, t);
  return { total, priority, components, autoOutreachEligible: priority === "A" || priority === "B" };
}
