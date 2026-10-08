/**
 * Pipeline Monte Carlo (spec §34). Transparent by construction: it only models revenue we can see —
 * current MRR plus open opportunities at their stage probability. It does NOT assume future prospecting,
 * and it applies churn only if a measured rate is supplied.
 */
export interface ForecastOpp { dealValueCents: number; probability: number; stage: string }
export interface ForecastInput {
  currentMrrUsd: number;
  opps: ForecastOpp[];
  monthsRemaining: number;
  targetArrUsd: number;
  /** Measured monthly churn (0-1) or null if unmeasured. */
  monthlyChurn: number | null;
  sims?: number;
  rng?: () => number;
}
export interface ForecastResult {
  conservativeArrUsd: number; baseArrUsd: number; aggressiveArrUsd: number;
  probabilityOfTarget: number;
  assumptions: string[];
  insufficientData: string[];
}

export function forecast(i: ForecastInput): ForecastResult {
  const rng = i.rng ?? Math.random;
  const sims = i.sims ?? 2000;
  const insufficient: string[] = [];
  const open = i.opps.filter((o) => !["WON", "LOST", "NURTURE"].includes(o.stage) && o.dealValueCents > 0);
  if (!open.length && i.currentMrrUsd === 0) insufficient.push("No MRR and no open pipeline — nothing to forecast from.");
  if (i.monthlyChurn == null) insufficient.push("Churn is unmeasured; forecast assumes zero churn (optimistic).");

  const outcomes: number[] = [];
  for (let s = 0; s < sims; s++) {
    let mrr = i.currentMrrUsd;
    for (const o of open) if (rng() < o.probability) mrr += o.dealValueCents / 100 / 12;
    if (i.monthlyChurn) mrr *= Math.pow(1 - i.monthlyChurn, Math.max(0, i.monthsRemaining));
    outcomes.push(mrr * 12);
  }
  outcomes.sort((a, b) => a - b);
  const q = (p: number) => Math.round(outcomes[Math.min(outcomes.length - 1, Math.floor(p * outcomes.length))]);
  return {
    conservativeArrUsd: q(0.1), baseArrUsd: q(0.5), aggressiveArrUsd: q(0.9),
    probabilityOfTarget: outcomes.filter((x) => x >= i.targetArrUsd).length / outcomes.length,
    assumptions: ["Only current MRR and the existing open pipeline are modelled.", "Each opportunity closes with its stage probability; deal value is annual and converted to MRR.", "Future prospecting and expansion are excluded, so this is a floor, not a plan."],
    insufficientData: insufficient,
  };
}
