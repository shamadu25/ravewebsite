/**
 * Configurable priority score (spec §70):
 *   score = (revenue^wR * probability^wP * urgency^wU * strategic^wS) / effort^wE
 * Inputs are normalised to (0,1]; exponents are admin-editable so the model can change without code.
 */
export interface PriorityWeights {
  revenue: number;
  probability: number;
  urgency: number;
  strategic: number;
  effort: number;
}

export const DEFAULT_PRIORITY_WEIGHTS: PriorityWeights = { revenue: 1, probability: 1, urgency: 1, strategic: 0.5, effort: 1 };

export interface PriorityInput {
  revenueImpactUsd: number;
  probability: number; // 0-1
  urgency: number; // 0-1
  strategicValue: number; // 0-1
  effort: number; // 0-1 (1 = heavy)
}

const clamp = (n: number, lo = 0.01, hi = 1) => Math.max(lo, Math.min(hi, n));

export function priorityScore(i: PriorityInput, w: PriorityWeights = DEFAULT_PRIORITY_WEIGHTS): number {
  const revenue = clamp(Math.log10(Math.max(1, i.revenueImpactUsd) + 1) / 6); // $1M ≈ 1.0
  const raw =
    (Math.pow(revenue, w.revenue) * Math.pow(clamp(i.probability), w.probability) * Math.pow(clamp(i.urgency), w.urgency) * Math.pow(clamp(i.strategicValue), w.strategic)) /
    Math.pow(clamp(i.effort), w.effort);
  return Math.round(raw * 1000) / 10;
}

export function priorityBucket(score: number): "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" {
  return score >= 25 ? "CRITICAL" : score >= 12 ? "HIGH" : score >= 4 ? "MEDIUM" : "LOW";
}
