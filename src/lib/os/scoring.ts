/**
 * Opportunity scoring (spec §9). Deterministic and explainable: every point is traceable to a
 * factor, and factors with no evidence contribute nothing rather than a guessed value.
 */

export interface ProspectSignals {
  industry?: string | null;
  hasWebsite: boolean;
  websiteReachable?: boolean;
  /** Signals extracted from the website / provided by research. */
  bookingFlow?: boolean;
  whatsappContact?: boolean;
  contactForm?: boolean;
  phoneOnly?: boolean;
  manualEnquiryProcess?: boolean;
  hiringReceptionist?: boolean;
  liveChatPresent?: boolean;
  multiLocation?: boolean;
  employeeCount?: number | null;
  reviewCount?: number | null;
  hasEmail?: boolean;
  hasPhone?: boolean;
}

export interface ScoreFactor {
  key: string;
  label: string;
  max: number;
  points: number;
  evidence: string;
}

export interface OpportunityScore {
  score: number;
  factors: ScoreFactor[];
  confidence: number;
  grade: "A" | "B" | "C" | "D";
}

/** Industries where conversational AI employees have a proven fit; weights are configurable data. */
export const INDUSTRY_FIT: Record<string, number> = {
  dental: 1,
  clinic: 0.9,
  hotel: 0.95,
  "real estate": 0.95,
  restaurant: 0.8,
  beauty: 0.8,
  insurance: 0.75,
  automotive: 0.7,
  education: 0.7,
  pharmacy: 0.6,
  legal: 0.65,
  retail: 0.6,
  "professional services": 0.6,
};

function industryFit(industry?: string | null): number | null {
  if (!industry) return null;
  const key = industry.toLowerCase();
  const hit = Object.keys(INDUSTRY_FIT).find((k) => key.includes(k));
  return hit ? INDUSTRY_FIT[hit] : 0.4;
}

export function scoreOpportunity(s: ProspectSignals): OpportunityScore {
  const factors: ScoreFactor[] = [];
  const add = (key: string, label: string, max: number, ratio: number | null, evidence: string) => {
    const points = ratio === null ? 0 : Math.round(max * Math.max(0, Math.min(1, ratio)));
    factors.push({ key, label, max, points, evidence: ratio === null ? "No evidence" : evidence });
  };

  const fit = industryFit(s.industry);
  add("industry", "Industry fit", 20, fit, `Industry "${s.industry}"`);

  add(
    "digital",
    "Digital presence",
    10,
    s.hasWebsite ? (s.websiteReachable === false ? 0.3 : 1) : s.hasWebsite === false ? 0.1 : null,
    s.hasWebsite ? (s.websiteReachable === false ? "Website listed but unreachable" : "Website reachable") : "No website found"
  );

  const commsSignals = [s.bookingFlow, s.whatsappContact, s.contactForm, s.phoneOnly].filter(Boolean).length;
  add("comms", "Customer communication volume", 15, commsSignals ? Math.min(1, commsSignals / 3) : null, `${commsSignals} inbound channel signal(s)`);

  add("appointments", "Appointment complexity", 10, s.bookingFlow ? 1 : s.phoneOnly ? 0.6 : null, s.bookingFlow ? "Bookings are part of the business" : "Phone-only enquiries");

  const manual = [s.manualEnquiryProcess, s.phoneOnly && !s.liveChatPresent].filter(Boolean).length;
  add("manual", "Manual workflow signals", 15, manual ? Math.min(1, manual / 2 + 0.25) : null, "Enquiries handled manually / no automation seen");

  add("hiring", "Hiring signals", 10, s.hiringReceptionist ? 1 : null, "Hiring for a role an AI employee can cover");

  add("suitability", "AI suitability", 10, s.liveChatPresent ? 0.4 : commsSignals ? 1 : null, s.liveChatPresent ? "Has chat already (replacement angle weaker)" : "No automation in place");

  const size = s.multiLocation ? 1 : s.employeeCount != null ? Math.min(1, s.employeeCount / 30) : s.reviewCount != null ? Math.min(1, s.reviewCount / 150) : null;
  add("size", "Business size / ability to pay", 10, size, "Size proxy from locations / headcount / review volume");

  const reachable = (s.hasEmail ? 0.6 : 0) + (s.hasPhone ? 0.4 : 0);
  add("reach", "Reachability", 0, reachable || null, "Contact route available"); // informational; excluded from the total

  const total = factors.reduce((n, f) => n + f.points, 0);
  const maxScorable = factors.reduce((n, f) => (f.points > 0 || f.evidence !== "No evidence" ? n + f.max : n), 0);
  const evidenceCount = factors.filter((f) => f.max > 0 && f.evidence !== "No evidence").length;
  const scored = Math.min(100, total);
  const confidence = Math.round((evidenceCount / factors.filter((f) => f.max > 0).length) * 100) / 100;
  void maxScorable;

  return {
    score: scored,
    factors,
    confidence,
    grade: scored >= 75 ? "A" : scored >= 55 ? "B" : scored >= 35 ? "C" : "D",
  };
}

// ── Qualification (BANT+): Need, Budget, Authority, Urgency, Fit, Intent ─────────────────

export interface QualificationInput {
  need?: number;
  budget?: number;
  authority?: number;
  urgency?: number;
  fit?: number;
  intent?: number;
}

export type QualificationLevel = "HOT" | "WARM" | "COLD" | "UNQUALIFIED";

/** Each dimension is 0-5; unknown dimensions are omitted, and low coverage lowers confidence. */
export function qualify(input: QualificationInput): { level: QualificationLevel; total: number; confidence: number } {
  const dims: Array<keyof QualificationInput> = ["need", "budget", "authority", "urgency", "fit", "intent"];
  const known = dims.filter((d) => typeof input[d] === "number");
  const sum = known.reduce((n, d) => n + (input[d] as number), 0);
  const total = known.length ? Math.round((sum / (known.length * 5)) * 100) : 0;
  const confidence = known.length / dims.length;
  const level: QualificationLevel = total >= 75 ? "HOT" : total >= 50 ? "WARM" : total >= 25 ? "COLD" : "UNQUALIFIED";
  return { level, total, confidence };
}
