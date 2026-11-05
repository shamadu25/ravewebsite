/** @jest-environment node */
import { calculateQuote, validateRuleParams, money, type FxConfig, type PricingRuleRecord } from "@/lib/ai-automation/pricing";
import type { SolutionRecord } from "@/lib/ai-automation/types";
import { ZodError } from "zod";

const sol = (o: Partial<SolutionRecord> = {}): SolutionRecord => ({
  key: "ai-whatsapp-agent", name: "AI WhatsApp Agent", description: "d", problemsSolved: [], capabilities: [], deliverables: [], integrations: ["whatsapp-business", "crm"], dependencies: [],
  complexityLevels: ["LOW", "MEDIUM", "HIGH"], defaultComplexity: "MEDIUM", basePrice: 1000, pricingMethod: "FIXED", currency: "USD", estimatedHours: 40, deliveryWeeks: 3, monthlyMaintenance: 100, active: true, mappings: [], ...o,
});
const rule = (kind: PricingRuleRecord["kind"], key: string, params: Record<string, unknown>, active = true): PricingRuleRecord => ({ kind, key, params, active });
const FULL: PricingRuleRecord[] = [
  rule("COMPLEXITY_MULTIPLIER", "LOW", { multiplier: 0.8 }), rule("COMPLEXITY_MULTIPLIER", "MEDIUM", { multiplier: 1 }), rule("COMPLEXITY_MULTIPLIER", "HIGH", { multiplier: 1.5 }),
  rule("INTEGRATION_FEE", "whatsapp-business", { amount: 200 }), rule("INTEGRATION_FEE", "crm", { amount: 150 }),
  rule("PAYMENT_SCHEDULE", "default", { milestones: [{ label: "On acceptance", percent: 50 }, { label: "On go-live", percent: 50 }] }),
];
const FX: FxConfig = { base: "USD", rates: {} };
const NOW = new Date("2026-01-15T10:00:00Z");
const q = (items = [{ solution: sol() }], rules = FULL, options = {}, fx = FX) => calculateQuote({ items, rules, fx, options, now: NOW });

describe("pricing engine: deterministic calculation", () => {
  it("prices a complete quote from approved records only", () => {
    const r = q();
    expect(r.status).toBe("COMPLETE");
    expect(r.missing).toEqual([]);
    expect(r.initialSubtotal).toBe(1350); // 1000 solution + 200 + 150 integrations
    expect(r.monthlyTotal).toBe(100);
    expect(r.initialTotal).toBe(1350);
    expect(r.paymentSchedule.map((m) => m.amount)).toEqual([675, 675]);
  });
  it("applies complexity multipliers", () => {
    expect(q([{ solution: sol(), complexity: "HIGH" } as never]).initialTotal).toBe(1850);
    expect(q([{ solution: sol(), complexity: "LOW" } as never]).initialTotal).toBe(1150);
  });
  it("multiplies by quantity (number of agents) and charges each integration once", () => {
    const r = q([{ solution: sol(), quantity: 2 } as never]);
    expect(r.initialTotal).toBe(2350); // 2000 + 350 integrations once
    expect(r.monthlyTotal).toBe(200);
  });
  it("charges shared integrations once across solutions", () => {
    const r = q([{ solution: sol() }, { solution: sol({ key: "ai-lead-qualification-agent", name: "Lead Q", integrations: ["crm"] }) }]);
    expect(r.lines.filter((l) => l.kind === "INTEGRATION")).toHaveLength(2);
    expect(r.initialTotal).toBe(2350);
  });
  it("supports hourly pricing (rate × hours)", () => {
    const r = q([{ solution: sol({ pricingMethod: "HOURLY", basePrice: 50, estimatedHours: 20 }) }]);
    expect(r.lines.find((l) => l.kind === "IMPLEMENTATION")!.total).toBe(1000);
  });
  it("adds custom development, training, infrastructure and third-party API fees from rules", () => {
    const rules = [...FULL, rule("CUSTOM_DEV_RATE", "default", { hourly: 60 }), rule("TRAINING_FEE", "default", { perSession: 120 }), rule("INFRASTRUCTURE_FEE", "default", { monthly: 30 }), rule("THIRD_PARTY_API_FEE", "whatsapp-business", { oneTime: 10, monthly: 25 })];
    const r = q([{ solution: sol() }], rules, { additionalDevHours: 5, trainingSessions: 2 });
    expect(r.initialTotal).toBe(1350 + 300 + 240 + 10);
    expect(r.monthlyTotal).toBe(100 + 30 + 25);
  });
  it("enforces the minimum project fee", () => {
    const r = q([{ solution: sol({ basePrice: 10 }) }], [...FULL, rule("MIN_PROJECT_FEE", "default", { amount: 2000 })]);
    expect(r.initialTotal).toBe(2000);
    expect(r.lines.some((l) => l.kind === "ADJUSTMENT")).toBe(true);
  });
  it("applies volume and manual discounts and requires approval above the authorised limit", () => {
    const rules = [...FULL, rule("DISCOUNT", "vol", { minAgents: 2, percent: 5 }), rule("APPROVAL_THRESHOLD", "default", { maxDiscountPercent: 10 })];
    const two = [{ solution: sol() }, { solution: sol({ key: "b", name: "B", integrations: [] }) }];
    const ok = q(two, rules);
    expect(ok.discountTotal).toBeCloseTo(ok.initialSubtotal! * 0.05, 2);
    expect(ok.approval.required).toBe(false);
    const big = q(two, rules, { manualDiscountPercent: 10, manualDiscountReason: "launch partner" });
    expect(big.approval.required).toBe(true);
    expect(big.approval.reasons[0]).toMatch(/exceeds the authorised 10%/);
  });
  it("requires approval above the maximum initial total", () => {
    expect(q([{ solution: sol() }], [...FULL, rule("APPROVAL_THRESHOLD", "default", { maxInitialTotal: 1000 })]).approval.required).toBe(true);
  });
  it("checks minimum margin against configured cost rate and hours", () => {
    const rules = [...FULL, rule("MIN_MARGIN", "default", { percent: 50 }), rule("COST_RATE", "default", { hourly: 30 })];
    const r = q([{ solution: sol() }], rules); // cost 40h × 30 = 1200 on 1350 → margin ~11%
    expect(r.approval.required).toBe(true);
    expect(r.approval.reasons.join(" ")).toMatch(/below the minimum 50%/);
    expect(q([{ solution: sol({ estimatedHours: 5 }) }], rules).approval.required).toBe(false);
  });
  it("adds configured taxes to initial and recurring amounts", () => {
    const r = q([{ solution: sol() }], [...FULL, rule("TAX", "vat", { name: "VAT", percent: 15, appliesTo: "BOTH" })]);
    expect(r.initialTotal).toBe(money(1350 * 1.15));
    expect(r.monthlyTotal).toBe(115);
  });
  it("lists optional services but excludes them from totals", () => {
    const r = q([{ solution: sol() }], [...FULL, rule("OPTIONAL_SERVICE", "extra", { name: "Extra training", amount: 500 })], { optionalServices: ["extra"] });
    expect(r.lines.find((l) => l.kind === "OPTIONAL")!.included).toBe(false);
    expect(r.initialTotal).toBe(1350);
  });
  it("ignores inactive rules", () => {
    const rules = FULL.map((x) => (x.key === "crm" ? { ...x, active: false } : x));
    expect(q([{ solution: sol() }], rules).status).toBe("MANUAL_REVIEW");
  });
  it("keeps the payment schedule summing exactly to the total", () => {
    const rules = FULL.map((x) => (x.kind === "PAYMENT_SCHEDULE" ? rule("PAYMENT_SCHEDULE", "default", { milestones: [{ label: "a", percent: 33.33 }, { label: "b", percent: 33.33 }, { label: "c", percent: 33.34 }] }) : x));
    const r = q([{ solution: sol({ basePrice: 333.33 }) }], rules);
    expect(money(r.paymentSchedule.reduce((a, m) => a + m.amount, 0))).toBe(r.initialTotal);
  });
});

describe("pricing engine: unsupported pricing is flagged, never guessed", () => {
  it("flags a solution with no approved price and produces NO totals", () => {
    const r = q([{ solution: sol({ basePrice: null }) }]);
    expect(r.status).toBe("MANUAL_REVIEW");
    expect(r.missing.join(" ")).toMatch(/no approved price/);
    expect(r.initialTotal).toBeNull(); expect(r.monthlyTotal).toBeNull(); expect(r.paymentSchedule).toEqual([]);
    expect(r.approval.required).toBe(true);
  });
  it.each([
    ["missing maintenance price", sol({ monthlyMaintenance: null }), FULL, /maintenance/],
    ["missing integration fee", sol(), FULL.filter((x) => x.key !== "crm"), /integration fee/],
    ["missing complexity multiplier", sol(), FULL.filter((x) => !(x.kind === "COMPLEXITY_MULTIPLIER" && x.key === "MEDIUM")), /multiplier/],
    ["missing payment schedule", sol(), FULL.filter((x) => x.kind !== "PAYMENT_SCHEDULE"), /payment schedule/],
    ["hourly without hours", sol({ pricingMethod: "HOURLY", estimatedHours: null }), FULL, /estimated hours/],
    ["inactive solution", sol({ active: false }), FULL, /inactive/],
    ["unsupported complexity level", sol({ complexityLevels: ["LOW"] }), FULL, /does not offer/],
  ])("flags %s", (_n, s, rules, re) => {
    const r = q([{ solution: s }], rules);
    expect(r.status).toBe("MANUAL_REVIEW");
    expect(r.missing.join(" ")).toMatch(re);
    expect(r.initialTotal).toBeNull();
  });
  it("flags an empty quote and dev work with no rate", () => {
    expect(q([]).missing.join(" ")).toMatch(/No solutions selected/);
    expect(q([{ solution: sol() }], FULL, { additionalDevHours: 3 }).missing.join(" ")).toMatch(/hourly rate/);
  });
  it("flags unapproved optional services", () => {
    expect(q([{ solution: sol() }], FULL, { optionalServices: ["secret-deal"] }).status).toBe("MANUAL_REVIEW");
  });
});

describe("pricing engine: currencies", () => {
  const fx: FxConfig = { base: "USD", rates: { GHS: { rate: 15.5, source: "Manual — Bank of Ghana mid-rate", asOf: "2026-01-14T08:00:00Z" }, NGN: { rate: 0, source: "", asOf: "" } } };
  it("converts at the configured rate and records its source and timestamp", () => {
    const r = q([{ solution: sol() }], FULL, { currency: "GHS" }, fx);
    expect(r.status).toBe("COMPLETE");
    expect(r.currency).toBe("GHS");
    expect(r.initialTotal).toBe(money(1350 * 15.5));
    expect(r.fx).toEqual({ rate: 15.5, source: "Manual — Bank of Ghana mid-rate", asOf: "2026-01-14T08:00:00Z" });
    expect(r.paymentSchedule.reduce((a, m) => a + m.amount, 0)).toBeCloseTo(r.initialTotal!, 2);
  });
  it("never assumes a live rate: unconfigured or incomplete rates → manual review", () => {
    expect(q([{ solution: sol() }], FULL, { currency: "GBP" }, fx).status).toBe("MANUAL_REVIEW");
    expect(q([{ solution: sol() }], FULL, { currency: "NGN" }, fx).missing.join(" ")).toMatch(/exchange rate/);
  });
  it("needs no rate for the base currency", () => {
    expect(q([{ solution: sol() }], FULL, { currency: "USD" }, FX).fx).toBeNull();
  });
});

describe("pricing rule validation", () => {
  it("accepts valid params and rejects invalid ones", () => {
    expect(validateRuleParams("INTEGRATION_FEE", { amount: 10 })).toEqual({ amount: 10 });
    expect(() => validateRuleParams("INTEGRATION_FEE", { amount: -1 })).toThrow(ZodError);
    expect(() => validateRuleParams("COMPLEXITY_MULTIPLIER", { multiplier: 0 })).toThrow(ZodError);
    expect(() => validateRuleParams("PAYMENT_SCHEDULE", { milestones: [{ label: "a", percent: 40 }] })).toThrow(/100/);
    expect(validateRuleParams("TAX", { name: "VAT", percent: 12.5 }).appliesTo).toBe("BOTH");
  });
});
