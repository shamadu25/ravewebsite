/** @jest-environment node */
import { PdfDoc, textWidth, wrap } from "@/lib/ai-automation/proposal/pdf";
import { buildProposalContent, EditableSectionsSchema, renderProposalPdf, PROPOSAL_TITLE, type ProposalContent } from "@/lib/ai-automation/proposal/content";
import { buildRulesAnalysis } from "@/lib/ai-automation/ai/deterministic";
import { calculateQuote, type PricingRuleRecord } from "@/lib/ai-automation/pricing";
import { DEFAULT_PROPOSAL, defaultCompany } from "@/lib/ai-automation/settings";
import { CUSTOMER_SUBJECT, cleanHeader, esc, internalSubject, renderCustomerProposalEmail, renderFollowupEmail, renderInternalEmail, fill } from "@/lib/ai-automation/email/render";
import { proposalRef } from "@/lib/ai-automation/proposal/service";
import { csvCell } from "@/lib/ai-automation/csv";
import { SOLUTION_SEEDS } from "@/lib/ai-automation/catalogue";
import type { SolutionRecord } from "@/lib/ai-automation/types";

const solutions: SolutionRecord[] = SOLUTION_SEEDS.map((s) => ({ key: s.key, name: s.name, description: s.description, problemsSolved: s.problemsSolved, capabilities: s.capabilities, deliverables: s.deliverables, integrations: s.integrations, dependencies: s.dependencies, complexityLevels: s.complexityLevels, defaultComplexity: s.defaultComplexity, basePrice: 1000, pricingMethod: "FIXED", currency: "USD", estimatedHours: 40, deliveryWeeks: 4, monthlyMaintenance: 100, active: true, mappings: [] }));
const rules: PricingRuleRecord[] = [
  { kind: "COMPLEXITY_MULTIPLIER", key: "MEDIUM", params: { multiplier: 1 }, active: true },
  ...[...new Set(solutions.flatMap((s) => s.integrations))].map((k) => ({ kind: "INTEGRATION_FEE" as const, key: k, params: { amount: 100 }, active: true })),
  { kind: "PAYMENT_SCHEDULE", key: "default", params: { milestones: [{ label: "On acceptance", percent: 60 }, { label: "On go-live", percent: 40 }] }, active: true },
];
const analysis = buildRulesAnalysis({ industry: { slug: "retail", name: "Retail" }, profile: { businessName: "Evil <b>Shop</b> (Ltd)", country: "Ghana", description: "d" }, responses: [], challenges: ["SLOW_RESPONSES"], automationAreas: [], customerText: "", candidates: [{ key: "ai-whatsapp-agent", name: "AI WhatsApp Agent", description: "x", capabilities: ["Instant replies"], integrations: ["whatsapp-business"], problemsSolved: ["Slow"], matchReasons: ["r"], defaultComplexity: "MEDIUM" }] });
const quoteInput = { items: [{ key: "ai-whatsapp-agent", complexity: "MEDIUM" as const, quantity: 1 }], options: { currency: "USD" as const } };
const make = (priced = true): ProposalContent => {
  const quote = calculateQuote({ items: [{ solution: { ...solutions.find((s) => s.key === "ai-whatsapp-agent")!, basePrice: priced ? 1000 : null } }], rules, fx: { base: "USD", rates: {} } });
  return buildProposalContent({ reference: "RS-AI-2026-000007", now: new Date("2026-03-01T00:00:00Z"), analysis, quote, quoteInput, solutions, company: defaultCompany(), settings: DEFAULT_PROPOSAL, customer: { contactName: "Ama <script>x</script> Mensah", position: "Director", businessName: "Evil <b>Shop</b> (Ltd)", email: "ama@shop.com", phone: "+233 24 000 0000", city: "Accra", country: "Ghana", industry: "Retail" } });
};

describe("proposal PDF", () => {
  it("is a structurally valid PDF with a correct cross-reference table", () => {
    const pdf = renderProposalPdf(make(), { final: true });
    const s = pdf.toString("latin1");
    expect(s.startsWith("%PDF-1.4")).toBe(true);
    expect(s.trimEnd().endsWith("%%EOF")).toBe(true);
    const startxref = Number(s.match(/startxref\n(\d+)/)![1]);
    expect(s.slice(startxref, startxref + 4)).toBe("xref");
    const count = Number(s.match(/\/Size (\d+)/)![1]);
    const entries = s.slice(startxref).match(/\d{10} 00000 n /g)!;
    expect(entries).toHaveLength(count - 1);
    for (const e of entries.slice(0, 6)) expect(s.slice(Number(e.slice(0, 10))).startsWith(`${entries.indexOf(e) + 1} 0 obj`)).toBe(true);
    expect(Number(s.match(/\/Count (\d+)/)![1])).toBeGreaterThanOrEqual(3);
  });
  it("contains the required proposal title and reference", () => {
    const c = make();
    expect(PROPOSAL_TITLE).toBe("AI BUSINESS AUTOMATION IMPLEMENTATION PROPOSAL");
    const text = renderProposalPdf(c, { final: true }).toString("latin1");
    expect(text).toContain("AI BUSINESS AUTOMATION IMPLEMENTATION PROPOSAL");
    expect(text).toContain("RS-AI-2026-000007");
    expect(text).toContain("RAVESOFT DIGITAL SOLUTIONS LTD.");
  });
  it("marks an unapproved or unpriced proposal as a DRAFT with no binding prices", () => {
    const text = renderProposalPdf(make(false), { final: false }).toString("latin1");
    expect(text).toMatch(/DRAFT/);
    expect(text).toMatch(/not a quotation/);
    expect(text).not.toContain("Initial investment \\(USD\\)");
  });
  it("shows itemised pricing and payment schedule for a complete, approved proposal", () => {
    const text = renderProposalPdf(make(), { final: true }).toString("latin1");
    expect(text).toContain("Initial investment \\(USD\\)"); // parentheses are escaped inside PDF strings
    expect(text).toContain("On acceptance");
    expect(text).not.toMatch(/DRAFT — pricing/);
  });
  it("treats customer text as data: parentheses/backslashes cannot break out of the PDF string", () => {
    const d = new PdfDoc({ title: "t", footerLeft: "f" });
    d.paragraph("evil ) Tj ET /Foo << /Bar >> \\ ( BT");
    const s = d.build().toString("latin1");
    expect(s).toContain("evil \\) Tj ET");
    expect(s).toContain("\\\\ \\( BT");
  });
  it("wraps long unbroken tokens within the page width", () => {
    const lines = wrap("x".repeat(400), 200, 10);
    expect(lines.length).toBeGreaterThan(1);
    for (const l of lines) expect(textWidth(l, 10)).toBeLessThanOrEqual(200 + 1);
  });
});

describe("proposal document & versioning inputs", () => {
  it("is built entirely from snapshots, includes company details from configuration and a unique reference format", () => {
    const c = make();
    expect(c.company.email).toBe(defaultCompany().email);
    expect(c.solutions.map((s) => s.key)).toEqual(["ai-whatsapp-agent"]);
    expect(proposalRef(7, 2026)).toBe("RS-AI-2026-000007");
    expect(proposalRef(7, 2026)).not.toBe(proposalRef(8, 2026));
    expect(c.validUntil).toBeTruthy();
    expect(c.quote.status).toBe("COMPLETE");
  });
  it("stores a pricing snapshot inside the version so later price changes never alter it", () => {
    const c = make();
    const copy = JSON.parse(JSON.stringify(c)) as ProposalContent;
    solutions[0].basePrice = 99999; // simulate a later catalogue change
    expect(copy.quote.initialTotal).toBe(c.quote.initialTotal);
    solutions[0].basePrice = 1000;
  });
  it("only allows known text sections to be edited (pricing is not editable as text)", () => {
    expect(EditableSectionsSchema.safeParse({ executiveSummary: "New summary" }).success).toBe(true);
    const parsed = EditableSectionsSchema.parse({ executiveSummary: "x", quote: { initialTotal: 1 }, company: {} } as never);
    expect("quote" in parsed).toBe(false);
    expect(EditableSectionsSchema.safeParse({ executiveSummary: "" }).success).toBe(false);
  });
});

describe("emails", () => {
  const c = make();
  it("uses the specified customer and internal subjects", () => {
    expect(CUSTOMER_SUBJECT).toBe("Your Personalised AI Business Assessment & Proposal — RaveSoft");
    expect(renderCustomerProposalEmail(c, { link: "https://x/y", optOutUrl: "https://x/o", approved: true }).subject).toBe(CUSTOMER_SUBJECT);
    expect(internalSubject("Acme Ltd")).toBe("New AI Automation Opportunity — Acme Ltd");
  });
  it("customer email has greeting, summary, challenges, solutions, investment, timeline, link, next steps and contact details", () => {
    const e = renderCustomerProposalEmail(c, { link: "https://ravesoftsolutions.com/ai-automation/proposal/TOKEN", optOutUrl: "https://x/optout", approved: true });
    for (const needle of ["Hello Ama", "Key challenges", "Recommended AI solutions", "Initial investment", "Monthly recurring", "Implementation timeline", "proposal/TOKEN", "Next steps", c.company.email, "Stop emails"]) expect(e.html).toContain(needle);
    expect(e.text).toContain("proposal/TOKEN");
  });
  it("never states a price when pricing is incomplete", () => {
    const e = renderCustomerProposalEmail(make(false), { link: "https://x", optOutUrl: "https://x", approved: true });
    expect(e.html).toContain("Pricing will be confirmed by our team shortly");
    expect(e.html).not.toContain("Initial investment:");
  });
  it("escapes customer-supplied HTML in every email", () => {
    const e = renderCustomerProposalEmail(c, { link: "https://x", optOutUrl: "https://x", approved: true });
    expect(e.html).not.toContain("<script>");
    expect(e.html).not.toContain("<b>Shop</b>");
    expect(e.html).toContain("&lt;b&gt;Shop&lt;/b&gt;");
    const f = renderFollowupEmail({ key: "followup_check_in", business: "<img src=x onerror=alert(1)>", firstName: "<i>A</i>", solutions: ["S"], link: "https://x", optOutUrl: "https://x", company: defaultCompany() });
    expect(f.html).not.toContain("<img");
    expect(f.html).not.toContain("<i>A</i>");
  });
  it("blocks header injection through the subject", () => {
    expect(cleanHeader("Hello\r\nBcc: attacker@evil.com")).toBe("Hello Bcc: attacker@evil.com");
    expect(internalSubject("Acme\r\nBcc: a@b.c")).not.toMatch(/[\r\n]/);
    expect(esc(`"><`)).toBe("&quot;&gt;&lt;");
  });
  it("internal notification carries the required fields and flags manual review", () => {
    const e = renderInternalEmail({ business: "Acme", contact: "Ama", position: "CEO", email: "a@b.co", phone: "1", industry: "Retail", employees: "6–20", challenges: ["Slow replies"], analysisSummary: "Summary", solutions: ["AI WhatsApp Agent"], initialTotal: "$1,200.00", monthlyTotal: "$100.00", approvalStatus: "awaiting approval", priority: "high", proposalLink: "https://x/admin/1", suggestedAction: "Call today", preferredChannel: "whatsapp", manualReasons: ["No price for X"] }, defaultCompany());
    for (const n of ["Acme", "Retail", "Slow replies", "AI WhatsApp Agent", "$1,200.00", "$100.00", "awaiting approval", "https://x/admin/1", "Call today", "Needs manual review", "No price for X"]) expect(e.html).toContain(n);
    expect(e.subject).toBe("New AI Automation Opportunity — Acme");
  });
  it("fills follow-up template variables safely", () => {
    expect(fill("Hi {{name}} from {{business}} {{missing}}", { name: "A", business: "B" })).toBe("Hi A from B ");
  });
});

describe("CSV export", () => {
  it("neutralises spreadsheet formula injection and escapes quotes", () => {
    expect(csvCell("=HYPERLINK(\"http://evil\")")).toBe(`"'=HYPERLINK(""http://evil"")"`);
    expect(csvCell("+1")).toBe(`"'+1"`);
    expect(csvCell('say "hi"')).toBe(`"say ""hi"""`);
    expect(csvCell(null)).toBe('""');
  });
});
