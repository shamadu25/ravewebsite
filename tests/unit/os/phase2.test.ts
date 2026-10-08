/** @jest-environment node */
jest.mock("@/lib/prisma", () => ({ prisma: {} }));
import { forecast } from "@/lib/os/forecast";
import { evalCondition } from "@/lib/os/events";
import { validateWorkflow, WorkflowDefinition } from "@/lib/os/workflows";
import { toCsv } from "@/lib/os/csv";
import { chunkText } from "@/lib/os/brain";
import { hashPassword, verifyPassword } from "@/lib/os/users";
import { can } from "@/lib/os/rbac";
import { scoreOpportunity, qualify } from "@/lib/os/scoring";
import { recommendEmployees, DEFAULT_TEMPLATES } from "@/lib/os/recommend";
import { computeHealth } from "@/lib/os/health";

const seeded = (seed = 1) => () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;

describe("forecast", () => {
  it("orders scenarios and reports a probability from known pipeline only", () => {
    const r = forecast({ currentMrrUsd: 1000, monthsRemaining: 3, targetArrUsd: 20_000, monthlyChurn: null, rng: seeded(), opps: Array.from({ length: 20 }, () => ({ dealValueCents: 120_000, probability: 0.4, stage: "DEMO" })) });
    expect(r.conservativeArrUsd).toBeLessThanOrEqual(r.baseArrUsd);
    expect(r.baseArrUsd).toBeLessThanOrEqual(r.aggressiveArrUsd);
    expect(r.probabilityOfTarget).toBeGreaterThanOrEqual(0);
    expect(r.insufficientData.join()).toMatch(/Churn is unmeasured/);
  });
  it("says there is nothing to forecast with no MRR and no pipeline", () => {
    const r = forecast({ currentMrrUsd: 0, monthsRemaining: 3, targetArrUsd: 500_000, monthlyChurn: null, opps: [] });
    expect(r.baseArrUsd).toBe(0);
    expect(r.probabilityOfTarget).toBe(0);
    expect(r.insufficientData.join()).toMatch(/nothing to forecast/);
  });
  it("ignores won/lost deals in the open pipeline", () => {
    const r = forecast({ currentMrrUsd: 0, monthsRemaining: 3, targetArrUsd: 1000, monthlyChurn: null, rng: () => 0, opps: [{ dealValueCents: 10_000_000, probability: 1, stage: "WON" }] });
    expect(r.baseArrUsd).toBe(0);
  });
});

describe("rules & workflow validation", () => {
  it("evaluates conditions, including dotted paths", () => {
    expect(evalCondition({ field: "score", op: "gt", value: 80 }, { score: 91 })).toBe(true);
    expect(evalCondition({ field: "a.b", op: "eq", value: "x" }, { a: { b: "x" } })).toBe(true);
    expect(evalCondition({ field: "name", op: "contains", value: "dental" }, { name: "Accra Dental" })).toBe(true);
    expect(evalCondition(null, {})).toBe(true);
    expect(evalCondition({ field: "missing", op: "gt", value: 1 }, {})).toBe(false);
  });
  it("rejects workflows with dangling references or duplicate ids", () => {
    const bad = WorkflowDefinition.parse({ start: "a", nodes: [{ id: "a", type: "DELAY", minutes: 5, next: "ghost" }, { id: "a", type: "END" }] });
    const errs = validateWorkflow(bad).join(" ");
    expect(errs).toMatch(/Duplicate/);
    expect(errs).toMatch(/unknown node "ghost"/);
  });
  it("accepts a valid workflow and refuses unknown node types", () => {
    const ok = WorkflowDefinition.parse({ start: "a", nodes: [{ id: "a", type: "NOTIFICATION", severity: "LOW", title: "x", next: "b" }, { id: "b", type: "END" }] });
    expect(validateWorkflow(ok)).toEqual([]);
    expect(() => WorkflowDefinition.parse({ start: "a", nodes: [{ id: "a", type: "SHELL", cmd: "rm -rf" }] })).toThrow();
  });
});

describe("csv export", () => {
  it("escapes commas/quotes and neutralises spreadsheet formulas", () => {
    const out = toCsv([{ a: 'x,"y"', b: "=HYPERLINK(1)", c: "+1", d: null }]);
    expect(out.split("\n")[1]).toBe(`"x,""y""",'=HYPERLINK(1),'+1,`);
  });
});

describe("knowledge chunking", () => {
  it("splits long text on paragraph boundaries within the size limit", () => {
    const text = Array.from({ length: 10 }, (_, i) => `Paragraph ${i} ` + "word ".repeat(80)).join("\n\n");
    const chunks = chunkText(text, 1200);
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.every((c) => c.length <= 1300)).toBe(true);
    expect(chunks.join(" ")).toContain("Paragraph 9");
  });
});

describe("team passwords & permissions", () => {
  it("hashes with a random salt and verifies correctly", async () => {
    const h = await hashPassword("correct horse battery");
    expect(await verifyPassword("correct horse battery", h)).toBe(true);
    expect(await verifyPassword("wrong", h)).toBe(false);
    expect(await verifyPassword("x", "garbage")).toBe(false);
    expect(h).not.toBe(await hashPassword("correct horse battery"));
  });
  it("limits user management and exports by role", () => {
    expect(can("MANAGER", "user.manage")).toBe(false);
    expect(can("CEO", "user.manage")).toBe(true);
    expect(can("VIEWER", "report.export")).toBe(true);
    expect(can("SALES", "finance.read")).toBe(false);
  });
});

// Evaluation dataset (spec §74): known prospects with expected outcomes guard against scoring/recommendation regressions.
describe("agent evaluation dataset", () => {
  const cases = [
    { name: "Dental clinic, booking + WhatsApp + manual", signals: { industry: "Dental", hasWebsite: true, websiteReachable: true, bookingFlow: true, whatsappContact: true, manualEnquiryProcess: true, hasEmail: true, hasPhone: true, multiLocation: true }, minScore: 70, employee: "AI Dental Receptionist" },
    { name: "Hotel with chat already installed", signals: { industry: "Hotel", hasWebsite: true, websiteReachable: true, liveChatPresent: true, bookingFlow: true }, maxScore: 60, employee: "AI Reservations Employee" },
    { name: "Unknown industry, no website", signals: { industry: "Quantum Widgets", hasWebsite: false }, maxScore: 25, employee: undefined },
  ];
  it.each(cases)("$name", ({ signals, minScore, maxScore, employee }) => {
    const s = scoreOpportunity(signals);
    if (minScore) expect(s.score).toBeGreaterThanOrEqual(minScore);
    if (maxScore) expect(s.score).toBeLessThanOrEqual(maxScore);
    expect(recommendEmployees(signals.industry, DEFAULT_TEMPLATES).employees[0]).toBe(employee);
  });
  it("qualification: policy-compliant escalation when evidence is thin", () => {
    expect(qualify({ need: 5 }).confidence).toBeLessThan(0.5);
  });
  it("health: never GREEN without signals", () => {
    expect(computeHealth({ status: "ACTIVE", lastActiveAt: null, usage30d: null, usagePrev30d: null }).health).not.toBe("GREEN");
  });
});
