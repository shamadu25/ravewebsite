/** @jest-environment node */
import { matchSolutions, estimateComplexity } from "@/lib/ai-automation/matching";
import { qualifyLead, DEFAULT_QUALIFICATION, type QualificationInput } from "@/lib/ai-automation/qualification";
import { SOLUTION_SEEDS } from "@/lib/ai-automation/catalogue";
import type { SolutionRecord } from "@/lib/ai-automation/types";

const catalogue: SolutionRecord[] = SOLUTION_SEEDS.map((s) => ({
  key: s.key, name: s.name, description: s.description, problemsSolved: s.problemsSolved, capabilities: s.capabilities, deliverables: s.deliverables, integrations: s.integrations, dependencies: s.dependencies,
  complexityLevels: s.complexityLevels, defaultComplexity: s.defaultComplexity, basePrice: null, pricingMethod: "FIXED", currency: "USD", estimatedHours: null, deliveryWeeks: null, monthlyMaintenance: null, active: true,
  mappings: Object.entries(s.industries).map(([industrySlug, priority]) => ({ industrySlug, priority, areas: s.areas, challenges: s.challenges })),
}));
const names = (slug: string, areas: string[], challenges: string[]) => matchSolutions(catalogue, { industrySlug: slug, areas, challenges }).map((m) => m.solution.name);

describe("industry solution matching", () => {
  it("recommends relevant real estate agents for a WhatsApp/lead-follow-up business", () => {
    const n = names("real-estate", ["AI_WHATSAPP", "AI_LEADGEN"], ["SLOW_RESPONSES", "POOR_FOLLOWUP"]);
    expect(n).toEqual(expect.arrayContaining(["AI Property Sales Agent", "AI WhatsApp Agent", "AI Lead Recovery Agent"]));
    expect(n).not.toContain("AI Patient Enquiry Agent");
  });
  it("never returns solutions from other industries", () => {
    const hc = names("healthcare", ["NOT_SURE"], ["SCHEDULING"]);
    expect(hc.some((x) => /Property|Dispatch|Fee Reminder|Reservation/.test(x))).toBe(false);
    expect(hc).toContain("AI Appointment Booking Agent");
  });
  it("uses challenges when the customer is not sure what to automate", () => {
    const n = names("retail", ["NOT_SURE"], ["INVENTORY"]);
    expect(n[0]).toBe("AI Inventory Alert Agent");
  });
  it("matches education fee follow-up", () => {
    expect(names("education", ["AI_FINANCE"], ["POOR_FOLLOWUP"])[0]).toBe("AI Fee Reminder Agent");
  });
  it("always returns something for a known industry, marked as weak matches", () => {
    const m = matchSolutions(catalogue, { industrySlug: "logistics", areas: ["AI_HR"], challenges: [] });
    expect(m.length).toBeGreaterThan(0);
    expect(m.every((x) => x.weak)).toBe(true);
  });
  it("offers the custom solution when custom AI is requested, in any industry", () => {
    expect(names("hospitality", ["AI_CUSTOM"], [])).toContain("Custom AI Solution");
  });
  it("skips inactive solutions and caps results", () => {
    const off = catalogue.map((s) => (s.key === "ai-property-sales-agent" ? { ...s, active: false } : s));
    const n = matchSolutions(off, { industrySlug: "real-estate", areas: ["AI_SALES", "AI_WHATSAPP", "AI_LEADGEN", "AI_BOOKING"], challenges: ["LOST_SALES"], limit: 4 });
    expect(n.length).toBeLessThanOrEqual(4);
    expect(n.map((x) => x.solution.key)).not.toContain("ai-property-sales-agent");
  });
  it("explains each match", () => {
    for (const m of matchSolutions(catalogue, { industrySlug: "real-estate", areas: ["AI_SALES"], challenges: ["LOST_SALES"] })) expect(m.reasons.length).toBeGreaterThan(0);
  });
  it("estimates complexity from customer facts only", () => {
    expect(estimateComplexity({ integrationCount: 1, existingSoftwareMentioned: false })).toBe("LOW");
    expect(estimateComplexity({ integrationCount: 3, branches: "2_3", existingSoftwareMentioned: true })).toBe("MEDIUM");
    expect(estimateComplexity({ integrationCount: 5, branches: "more_than_10", employees: "51_200", existingSoftwareMentioned: true })).toBe("HIGH");
  });
});

const base: QualificationInput = { employees: "21_50", branches: "2_3", businessAge: "4_10_years", urgency: "within_1_3_months", timeline: "1_3_months", budget: "5_000_15_000", customInvestment: "yes_if_it_fits_our_needs", challengeCount: 3, areaCount: 2, descriptionLength: 200, hasWebsite: true, existingSoftware: true, matchedSolutions: 4, pricedSolutions: 4, customOnly: false };

describe("lead qualification", () => {
  it("classifies a strong lead as HIGH with explanations for every criterion", () => {
    const r = qualifyLead(base);
    expect(r.classification).toBe("HIGH");
    expect(r.reasons.map((x) => x.criterion).sort()).toEqual(["availability", "budget", "complexity", "fit", "readiness", "size", "urgency"]);
    expect(r.reasons.every((x) => x.note.length > 5)).toBe(true);
    expect(r.summary).toMatch(/HIGH priority/);
  });
  it("classifies a small, exploring business as LOW", () => {
    const r = qualifyLead({ ...base, employees: "1_5", branches: "1", businessAge: "less_than_1_year", urgency: "just_exploring", timeline: "more_than_6_months", budget: "under_1_000", customInvestment: "prefer_standard_solutions", challengeCount: 1, areaCount: 1, descriptionLength: 20, hasWebsite: false, existingSoftware: false, matchedSolutions: 1, pricedSolutions: 0 });
    expect(r.classification).toBe("LOW");
  });
  it("does not reject a customer for not disclosing their budget", () => {
    const hidden = qualifyLead({ ...base, budget: "prefer_not_to_say" });
    const unsure = qualifyLead({ ...base, budget: "not_sure_yet" });
    const missing = qualifyLead({ ...base, budget: undefined });
    expect(hidden.reasons.find((x) => x.criterion === "budget")!.score).toBeGreaterThanOrEqual(50);
    expect(hidden.reasons.find((x) => x.criterion === "budget")!.note).toMatch(/not held against/);
    expect(hidden.classification).not.toBe("LOW");
    expect(unsure.classification).toBe(hidden.classification);
    expect(missing.classification).toBe(hidden.classification);
  });
  it.each([
    ["no matching solution", { matchedSolutions: 0, pricedSolutions: 0 }],
    ["custom-only", { customOnly: true }],
    ["AI fallback used", { analysisFallback: true }],
  ])("flags manual review: %s", (_n, patch) => {
    const r = qualifyLead({ ...base, ...patch });
    expect(r.classification).toBe("MANUAL_REVIEW");
    expect(r.summary).toMatch(/Manual review required/);
  });
  it("honours configurable weights and thresholds", () => {
    const strict = qualifyLead(base, { ...DEFAULT_QUALIFICATION, thresholds: { high: 99, medium: 98 } });
    expect(strict.classification).toBe("LOW");
    const urgencyOnly = qualifyLead(base, { weights: { size: 0, readiness: 0, urgency: 100, budget: 0, complexity: 0, fit: 0, availability: 0 }, thresholds: { high: 70, medium: 45 } });
    expect(urgencyOnly.score).toBe(urgencyOnly.reasons.find((x) => x.criterion === "urgency")!.score);
  });
});
