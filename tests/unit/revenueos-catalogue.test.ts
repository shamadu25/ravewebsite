/** @jest-environment node */
jest.mock("@/lib/prisma", () => ({ prisma: {} }));
import { SEED_PRODUCTS, ProductInput, matchSolutions, type CatalogueProduct } from "@/lib/revenueos/catalogue";

const cat: CatalogueProduct[] = SEED_PRODUCTS.map((p) => ({ key: p.key, name: p.name, targetIndustries: p.targetIndustries, problemsSolved: p.problemsSolved, supportedMarkets: p.supportedMarkets, availability: p.availability }));

describe("catalogue", () => {
  it("seeds all 10 product lines with no invented pricing", () => {
    expect(SEED_PRODUCTS).toHaveLength(10);
    expect(SEED_PRODUCTS.every((p) => !p.pricing)).toBe(true);
  });
  it("validates input", () => {
    expect(() => ProductInput.parse({ key: "Bad Key", name: "x", category: "y" })).toThrow();
  });
});

describe("solution matching", () => {
  it("requires observed evidence, not just industry", () => {
    expect(matchSolutions({ industry: "Roofing", observedGaps: [] }, cat)).toEqual([]);
  });
  it("matches a contractor with missed enquiries to AI Sales Automation", () => {
    const m = matchSolutions({ industry: "HVAC", observedGaps: ["Missed enquiries after hours: contact form only"] }, cat);
    expect(m[0].productKey).toBe("ai-sales-automation");
    expect(m[0].evidenceMatched.length).toBe(1);
  });
  it("never recommends discontinued products", () => {
    const c = cat.map((p) => (p.key === "ai-sales-automation" ? { ...p, availability: "DISCONTINUED" } : p));
    expect(matchSolutions({ industry: "HVAC", observedGaps: ["Missed enquiries"] }, c).some((m) => m.productKey === "ai-sales-automation")).toBe(false);
  });
  it("respects supported markets", () => {
    const c = cat.map((p) => (p.key === "clickpos" ? { ...p, supportedMarkets: ["Ghana"] } : p));
    const gaps = ["Inventory visibility problems across branches"];
    expect(matchSolutions({ industry: "Retail", country: "Kenya", observedGaps: gaps }, c).some((m) => m.productKey === "clickpos")).toBe(false);
    expect(matchSolutions({ industry: "Retail", country: "Ghana", observedGaps: gaps }, c).some((m) => m.productKey === "clickpos")).toBe(true);
  });
});
