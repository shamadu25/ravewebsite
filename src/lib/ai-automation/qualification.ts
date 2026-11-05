/** Configurable, explainable lead qualification. A hidden budget is never a reason to downgrade a lead. */
import type { LeadPriority } from "./types";

export interface QualificationConfig {
  weights: { size: number; readiness: number; urgency: number; budget: number; complexity: number; fit: number; availability: number };
  thresholds: { high: number; medium: number };
}
export const DEFAULT_QUALIFICATION: QualificationConfig = {
  weights: { size: 15, readiness: 15, urgency: 20, budget: 15, complexity: 10, fit: 15, availability: 10 },
  thresholds: { high: 70, medium: 45 },
};

export interface QualificationInput {
  employees?: string; branches?: string; businessAge?: string; urgency?: string; timeline?: string; budget?: string; monthlyExpectation?: string; customInvestment?: string;
  challengeCount: number; areaCount: number; descriptionLength: number; hasWebsite: boolean; existingSoftware: boolean;
  matchedSolutions: number; pricedSolutions: number; customOnly: boolean; analysisFallback?: boolean;
}
export interface QualificationReason { criterion: string; score: number; weight: number; note: string }
export interface QualificationResult { score: number; classification: LeadPriority; reasons: QualificationReason[]; summary: string }

const pick = (map: Record<string, number>, key: string | undefined, fallback: number) => (key && key in map ? map[key] : fallback);

export function qualifyLead(i: QualificationInput, cfg: QualificationConfig = DEFAULT_QUALIFICATION): QualificationResult {
  const R: QualificationReason[] = [];
  const add = (criterion: string, score: number, note: string) => R.push({ criterion, score: Math.max(0, Math.min(100, Math.round(score))), weight: cfg.weights[criterion as keyof typeof cfg.weights] ?? 0, note });

  const size = pick({ "1_5": 25, "6_20": 55, "21_50": 80, "51_200": 95, more_than_200: 100 }, i.employees, 50) + (i.branches && ["4_10", "more_than_10"].includes(i.branches) ? 10 : 0);
  add("size", size, `Team size ${i.employees ? i.employees.replace(/_/g, "–") : "not given"}${i.branches ? `, ${i.branches.replace(/_/g, "–")} location(s)` : ""}.`);

  const age = pick({ less_than_1_year: 35, "1_3_years": 60, "4_10_years": 85, more_than_10_years: 90 }, i.businessAge, 55);
  const readiness = age * 0.6 + (i.hasWebsite ? 20 : 0) + (i.existingSoftware ? 20 : 0);
  add("readiness", readiness, `Established ${i.businessAge ? i.businessAge.replace(/_/g, " ") : "(age not given)"}${i.hasWebsite ? ", has a website" : ""}${i.existingSoftware ? ", already uses software tools" : ""}.`);

  const urg = pick({ immediately: 100, within_1_3_months: 80, within_3_6_months: 50, just_exploring: 20 }, i.urgency, 40);
  const tl = pick({ within_1_month: 100, "1_3_months": 80, "3_6_months": 50, more_than_6_months: 25, flexible: 45 }, i.timeline, 45);
  add("urgency", urg * 0.7 + tl * 0.3, `Urgency "${(i.urgency ?? "not given").replace(/_/g, " ")}", timeline "${(i.timeline ?? "not given").replace(/_/g, " ")}".`);

  // Budget: undisclosed/unsure scores neutral (50), never low.
  const undisclosed = !i.budget || ["prefer_not_to_say", "not_sure_yet"].includes(i.budget);
  const budget = undisclosed ? 50 : pick({ under_1_000: 25, "1_000_5_000": 55, "5_000_15_000": 80, "15_000_50_000": 95, over_50_000: 100 }, i.budget, 50);
  const invest = pick({ yes_if_it_fits_our_needs: 10, maybe_depending_on_the_proposal: 0, prefer_standard_solutions: -10, not_sure_yet: 0 }, i.customInvestment, 0);
  add("budget", budget + invest, undisclosed ? "Budget not disclosed — scored neutrally and not held against the lead." : `Stated budget "${i.budget!.replace(/_/g, " ")}".`);

  const complexity = Math.min(100, 30 + i.challengeCount * 10 + i.areaCount * 8);
  add("complexity", complexity, `${i.challengeCount} challenge(s) and ${i.areaCount} automation area(s) selected.`);

  const fit = Math.min(100, (i.matchedSolutions > 0 ? 50 : 0) + (i.areaCount > 0 ? 20 : 0) + Math.min(30, i.descriptionLength / 10));
  add("fit", fit, i.matchedSolutions > 0 ? `${i.matchedSolutions} catalogue solution(s) match their needs.` : "No catalogue solution matched clearly.");

  const availability = i.matchedSolutions === 0 ? 0 : (i.pricedSolutions / i.matchedSolutions) * 100;
  add("availability", availability, i.pricedSolutions === i.matchedSolutions && i.matchedSolutions > 0 ? "All matched solutions have approved pricing." : `${i.pricedSolutions} of ${i.matchedSolutions} matched solutions have approved pricing.`);

  const totalWeight = R.reduce((a, r) => a + r.weight, 0) || 1;
  const score = Math.round(R.reduce((a, r) => a + r.score * r.weight, 0) / totalWeight);

  let classification: LeadPriority = score >= cfg.thresholds.high ? "HIGH" : score >= cfg.thresholds.medium ? "MEDIUM" : "LOW";
  const manual: string[] = [];
  if (i.matchedSolutions === 0) manual.push("no catalogue solution matched");
  if (i.customOnly) manual.push("only a custom solution applies");
  if (i.analysisFallback) manual.push("AI analysis was unavailable (rules-based fallback used)");
  if (manual.length) classification = "MANUAL_REVIEW";

  const summary = classification === "MANUAL_REVIEW"
    ? `Manual review required: ${manual.join("; ")}. Indicative score ${score}/100.`
    : `${classification} priority — score ${score}/100 (high ≥ ${cfg.thresholds.high}, medium ≥ ${cfg.thresholds.medium}).`;
  return { score, classification, reasons: R, summary };
}
