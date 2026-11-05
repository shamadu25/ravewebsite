/** Industry-aware solution matching + complexity estimation. Pure and deterministic. */
import type { Complexity, SolutionRecord } from "./types";

export interface MatchInput { industrySlug: string; areas: string[]; challenges: string[]; limit?: number }
export interface SolutionMatch { solution: SolutionRecord; score: number; reasons: string[]; weak: boolean }

const AREA_LABEL: Record<string, string> = {
  AI_SALES: "AI sales", AI_MARKETING: "AI marketing", AI_SUPPORT: "AI customer support", AI_LEADGEN: "AI lead generation", AI_WHATSAPP: "AI WhatsApp",
  AI_BOOKING: "AI appointment booking", AI_FINANCE: "AI finance", AI_HR: "AI HR", AI_OPERATIONS: "AI operations", AI_BI: "AI business intelligence", AI_CUSTOM: "custom AI",
};
const CHALLENGE_LABEL: Record<string, string> = {
  MANUAL_WORK: "too much manual work", HIGH_COSTS: "high operating costs", SLOW_RESPONSES: "slow customer responses", LOST_SALES: "lost sales", POOR_FOLLOWUP: "poor lead follow-up",
  STAFF_MANAGEMENT: "inefficient staff management", POOR_REPORTING: "poor reporting", CUSTOMER_SERVICE: "customer service problems", SCHEDULING: "scheduling difficulties",
  INVENTORY: "inventory problems", INEFFICIENCY: "operational inefficiencies", OTHER: "other challenges",
};

export function matchSolutions(catalogue: SolutionRecord[], input: MatchInput): SolutionMatch[] {
  const notSure = input.areas.includes("NOT_SURE") || input.areas.length === 0;
  const limit = input.limit ?? 6;
  const scored: SolutionMatch[] = [];

  for (const s of catalogue) {
    if (!s.active) continue;
    const mapping = s.mappings.find((m) => m.industrySlug === input.industrySlug);
    const wantsCustom = input.areas.includes("AI_CUSTOM") && s.key === "ai-custom-solution";
    if (!mapping && !wantsCustom) continue;

    const areaHits = mapping ? mapping.areas.filter((a) => input.areas.includes(a)) : ["AI_CUSTOM"];
    const challengeHits = mapping ? mapping.challenges.filter((c) => input.challenges.includes(c)) : [];
    const base = mapping ? Math.max(0, 100 - mapping.priority) / 100 : 0.2; // priority acts as a tiebreaker (≤ 1 point)
    const score = (notSure ? 0 : areaHits.length * 3) + challengeHits.length * 2 + base;
    const reasons: string[] = [];
    if (areaHits.length && !notSure) reasons.push(`You asked about ${areaHits.map((a) => AREA_LABEL[a] ?? a).join(", ")}.`);
    if (challengeHits.length) reasons.push(`Addresses ${challengeHits.map((c) => CHALLENGE_LABEL[c] ?? c).join(", ")}.`);
    if (!reasons.length) reasons.push(`A core ${input.industrySlug.replace(/-/g, " ")} solution that often fits businesses like yours.`);
    scored.push({ solution: s, score, reasons, weak: areaHits.length === 0 && challengeHits.length === 0 });
  }
  scored.sort((a, b) => b.score - a.score || a.solution.name.localeCompare(b.solution.name));

  const strong = scored.filter((m) => !m.weak);
  // Never return nothing for a known industry: fall back to the top few core solutions, marked as weak matches.
  const picked = strong.length ? strong : scored.slice(0, 3);
  return picked.slice(0, limit);
}

export interface ComplexityProfile { employees?: string; branches?: string; integrationCount: number; existingSoftwareMentioned: boolean }

/** Complexity heuristic from customer-provided facts only. Admin can override per proposal item. */
export function estimateComplexity(p: ComplexityProfile): Complexity {
  let points = 0;
  if (p.integrationCount >= 5) points += 2; else if (p.integrationCount >= 3) points += 1;
  if (p.branches === "4_10" || p.branches === "more_than_10") points += 2; else if (p.branches === "2_3") points += 1;
  if (p.employees === "51_200" || p.employees === "more_than_200") points += 1;
  if (p.existingSoftwareMentioned) points += 0.5;
  return points >= 3 ? "HIGH" : points >= 1 ? "MEDIUM" : "LOW";
}
