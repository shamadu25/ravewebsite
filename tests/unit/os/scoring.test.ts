/** @jest-environment node */
import { qualify, scoreOpportunity } from "@/lib/os/scoring";
import { recommendEmployees, DEFAULT_TEMPLATES } from "@/lib/os/recommend";
import { priorityBucket, priorityScore } from "@/lib/os/priority";

jest.mock("@/lib/prisma", () => ({ prisma: {} }));

describe("opportunity scoring", () => {
  it("scores a dental clinic with manual booking highly", () => {
    const r = scoreOpportunity({ industry: "Dental", hasWebsite: true, websiteReachable: true, bookingFlow: true, whatsappContact: true, contactForm: true, manualEnquiryProcess: true, hiringReceptionist: true, multiLocation: true, hasEmail: true, hasPhone: true });
    expect(r.score).toBeGreaterThanOrEqual(75);
    expect(r.grade).toBe("A");
  });

  it("gives zero points (and low confidence) when there is no evidence", () => {
    const r = scoreOpportunity({ hasWebsite: false });
    expect(r.score).toBeLessThan(15);
    expect(r.confidence).toBeLessThan(0.5);
    expect(r.factors.find((f) => f.key === "hiring")?.points).toBe(0);
  });

  it("penalises an unreachable website", () => {
    const ok = scoreOpportunity({ industry: "Hotel", hasWebsite: true, websiteReachable: true });
    const bad = scoreOpportunity({ industry: "Hotel", hasWebsite: true, websiteReachable: false });
    expect(bad.score).toBeLessThan(ok.score);
  });
});

describe("qualification", () => {
  it("rates strong signals HOT with full confidence", () => {
    expect(qualify({ need: 5, budget: 4, authority: 5, urgency: 4, fit: 5, intent: 5 })).toMatchObject({ level: "HOT", confidence: 1 });
  });
  it("reports low confidence when most dimensions are unknown", () => {
    const q = qualify({ need: 5 });
    expect(q.confidence).toBeCloseTo(1 / 6);
  });
  it("marks empty input UNQUALIFIED", () => {
    expect(qualify({}).level).toBe("UNQUALIFIED");
  });
});

describe("AI employee recommender", () => {
  it.each([
    ["Accra Dental Clinic", "AI Dental Receptionist"],
    ["Boutique Hotel and Lodge", "AI Reservations Employee"],
    ["Prime Real Estate Agents", "AI Lead Qualification Employee"],
    ["Bistro & Catering", "AI Reservation Employee"],
  ])("%s → %s", (text, first) => {
    expect(recommendEmployees(text, DEFAULT_TEMPLATES).employees[0]).toBe(first);
  });
  it("returns nothing for unknown industries instead of guessing", () => {
    expect(recommendEmployees("Quantum Widgets", DEFAULT_TEMPLATES).template).toBeNull();
  });
  it("supports new verticals as data", () => {
    const extra = [...DEFAULT_TEMPLATES, { key: "vet", industry: "Veterinary", name: "AI Vet Receptionist", role: "r", description: "", keywords: ["vet", "veterinary"], employees: ["AI Vet Receptionist"], monthlyPriceUsd: 99 }];
    expect(recommendEmployees("City Veterinary Clinic", extra).employees[0]).toBe("AI Vet Receptionist");
  });
});

describe("priority score", () => {
  it("ranks bigger, likelier, more urgent, cheaper work higher", () => {
    const a = priorityScore({ revenueImpactUsd: 50_000, probability: 0.6, urgency: 0.9, strategicValue: 0.8, effort: 0.2 });
    const b = priorityScore({ revenueImpactUsd: 500, probability: 0.1, urgency: 0.2, strategicValue: 0.3, effort: 0.9 });
    expect(a).toBeGreaterThan(b);
    expect(priorityBucket(a)).not.toBe("LOW");
  });
  it("weights are configurable", () => {
    const input = { revenueImpactUsd: 10_000, probability: 0.5, urgency: 0.5, strategicValue: 0.5, effort: 0.5 };
    const base = priorityScore(input);
    const heavierEffort = priorityScore(input, { revenue: 1, probability: 1, urgency: 1, strategic: 0.5, effort: 2 });
    expect(heavierEffort).toBeGreaterThan(base); // effort < 1 in denominator: higher exponent boosts score
  });
});
