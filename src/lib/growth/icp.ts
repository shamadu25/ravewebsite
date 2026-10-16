import type { IcpProfile, IcpWeights } from "./config";

/** Evidence-backed signals. A signal only counts when it carries a source URL. */
export const SIGNALS = ["service_inquiries", "quote_based", "multi_location", "multi_technician", "hiring", "paid_ads", "online_booking", "slow_followup", "crm_or_booking", "after_hours_gap"] as const;
export type SignalKey = (typeof SIGNALS)[number];

export interface SignalEvidence { signal: SignalKey; claim: string; sourceUrl: string }

export interface ScoreInput {
  industryMatch: boolean;
  evidence: SignalEvidence[];
  hasOfficialSite: boolean;
  hasPublicContact: boolean;
  /** Evidence that contradicts another piece (e.g. "24/7 answering" vs "slow follow-up"). */
  contradictions: number;
}

export interface Component { key: keyof IcpWeights; max: number; points: number; why: string }
export interface Scored {
  fitScore: number;
  readinessScore: number;
  components: Component[];
  confidence: number;
  useCase: string | null;
  decision: "QUALIFIED" | "REVIEW" | "REJECTED";
  reason: string;
}

const has = (e: SignalEvidence[], ...k: SignalKey[]) => e.filter((x) => k.includes(x.signal) && x.sourceUrl.trim()).length;
const ratio = (n: number, of: number) => Math.min(1, n / of);

export function scoreCompany(input: ScoreInput, p: Pick<IcpProfile, "weights" | "qualifyAt" | "minConfidence">): Scored {
  const w = p.weights;
  const e = input.evidence.filter((x) => x.sourceUrl.trim());
  const comp = (key: keyof IcpWeights, r: number, why: string): Component => ({ key, max: w[key], points: Math.round(w[key] * r), why });

  const pain = has(e, "slow_followup", "after_hours_gap", "service_inquiries");
  const size = has(e, "multi_location", "multi_technician");
  const demand = has(e, "hiring", "paid_ads", "online_booking");
  const useCaseSignals = has(e, "quote_based", "service_inquiries", "slow_followup", "crm_or_booking");

  const components = [
    comp("industryFit", input.industryMatch ? 1 : 0, input.industryMatch ? "Matches the active industry profile" : "Industry does not match the profile"),
    comp("operationalPain", ratio(pain, 2), `${pain} sourced pain signal(s)`),
    comp("sizeAbility", ratio(size, 2), `${size} sourced size signal(s)`),
    comp("demandGrowth", ratio(demand, 2), `${demand} sourced demand/growth signal(s)`),
    comp("useCaseClarity", ratio(useCaseSignals, 2), `${useCaseSignals} sourced use-case signal(s)`),
    comp("contactability", (input.hasOfficialSite ? 0.5 : 0) + (input.hasPublicContact ? 0.5 : 0), "Official site / public contact present"),
  ];
  const fitScore = Math.min(100, components.reduce((n, c) => n + c.points, 0));
  // Buying readiness is separate and deliberately based only on demand/pain behaviour, not on firmographic fit.
  const readinessScore = Math.round(100 * Math.min(1, (has(e, "hiring", "paid_ads") * 0.3 + has(e, "slow_followup", "after_hours_gap") * 0.25 + has(e, "service_inquiries", "online_booking") * 0.2)));
  const kinds = new Set(e.map((x) => x.signal)).size;
  const confidence = Math.round(Math.min(1, (kinds / 5) * 0.7 + (input.hasOfficialSite ? 0.2 : 0) + (input.hasPublicContact ? 0.1 : 0)) * 100) / 100;

  const useCase = has(e, "quote_based", "slow_followup") ? "Estimate follow-up and lead recovery" : has(e, "service_inquiries", "online_booking") ? "Instant enquiry response and qualification" : null;

  let decision: Scored["decision"]; let reason: string;
  if (!input.industryMatch) { decision = "REJECTED"; reason = "Industry mismatch."; }
  else if (!input.hasOfficialSite) { decision = "REJECTED"; reason = "No reliable identity (no official website)."; }
  else if (e.length === 0) { decision = "REJECTED"; reason = "No sourced evidence of fit."; }
  else if (input.contradictions > 0 || confidence < p.minConfidence) { decision = "REVIEW"; reason = input.contradictions > 0 ? "Contradictory evidence; human review required." : `Confidence ${confidence} below ${p.minConfidence}; human review required.`; }
  else if (fitScore >= p.qualifyAt) { decision = "QUALIFIED"; reason = `Fit ${fitScore} >= ${p.qualifyAt}. High fit is not proof of buying intent (readiness ${readinessScore}).`; }
  else { decision = "REJECTED"; reason = `Fit ${fitScore} below threshold ${p.qualifyAt}.`; }
  return { fitScore, readinessScore, components, confidence, useCase, decision, reason };
}

export function normaliseDomain(raw: string): string | null {
  try {
    const u = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
    const h = u.hostname.toLowerCase().replace(/^www\./, "");
    return /^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(h) ? h : null;
  } catch { return null; }
}
