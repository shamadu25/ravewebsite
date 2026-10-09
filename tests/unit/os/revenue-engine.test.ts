/** @jest-environment node */
jest.mock("@/lib/prisma", () => ({ prisma: {} }));
import { templateDraft, MAX_TOUCHES } from "@/lib/os/outreach";
import { parseCsv } from "@/lib/os/csv";
import { agentReadiness } from "@/lib/os/readiness";
import { isoWeek } from "@/lib/os/week";
import { companyKnowledge } from "@/lib/os/agents/knowledge";

const opp = { companyName: "Accra Dental", contactName: "Dr Mensah", recommendedEmployees: ["AI Dental Receptionist"], painPoints: ["enquiries are handled manually"], industry: "Dental", suggestedOffer: "AI Dental Receptionist — $125/month", dealValueCents: 150000 };

describe("outreach cadence copy", () => {
  it("writes four different touches, each with an opt-out and a sign-off", () => {
    const drafts = Array.from({ length: MAX_TOUCHES }, (_, i) => templateDraft(opp, { touch: i + 1 }));
    expect(new Set(drafts.map((d) => d.body)).size).toBe(MAX_TOUCHES);
    for (const d of drafts) { expect(d.body).toMatch(/unsubscribe/i); expect(d.body).toMatch(/RaveSoft/); }
    expect(drafts[3].body).toMatch(/last note/i);
  });
  it("proposal states the monthly price only when one is known, and never invents one", () => {
    expect(templateDraft(opp, { purpose: "PROPOSAL" }).body).toMatch(/\$125\/month/);
    const noPrice = templateDraft({ ...opp, dealValueCents: 0 }, { purpose: "PROPOSAL" }).body;
    expect(noPrice).toMatch(/to be confirmed/i);
    expect(noPrice).not.toMatch(/\$\d/);
  });
});

describe("CSV import parsing", () => {
  it("handles quotes, commas in fields, CRLF and tabs", () => {
    const rows = parseCsv('company,industry,website\r\n"Smith, Jones & Co",Legal,https://sj.com\r\nKumasi Bistro\tRestaurant\t');
    expect(rows[1]).toEqual(["Smith, Jones & Co", "Legal", "https://sj.com"]);
    expect(rows[2].slice(0, 2)).toEqual(["Kumasi Bistro", "Restaurant"]);
  });
  it("skips blank lines", () => expect(parseCsv("a,b\n\n\nc,d\n")).toHaveLength(2));
});

describe("agent readiness is honest", () => {
  const keys = new Set(["content.weekly", "outreach.draft_send", "prospecting.research"]);
  const OLD = { ...process.env };
  afterEach(() => { process.env = { ...OLD }; });
  it("flags a content agent as blocked without an LLM, and working with one", () => {
    delete process.env.OPENAI_API_KEY; delete process.env.ANTHROPIC_API_KEY;
    expect(agentReadiness({ status: "ACTIVE", handler: "content.weekly", tools: [] }, keys).state).toBe("BLOCKED");
    process.env.OPENAI_API_KEY = "x";
    expect(agentReadiness({ status: "ACTIVE", handler: "content.weekly", tools: [] }, keys).state).toBe("WORKING");
  });
  it("outreach needs a connected channel; prospecting is limited (not blocked) without Places", () => {
    delete process.env.SMTP_HOST; delete process.env.GOOGLE_PLACES_API_KEY;
    expect(agentReadiness({ status: "ACTIVE", handler: "outreach.draft_send", tools: ["outreach.send"] }, keys).state).toBe("BLOCKED");
    expect(agentReadiness({ status: "ACTIVE", handler: "prospecting.research", tools: ["places.search"] }, keys).state).toBe("LIMITED");
    process.env.SMTP_HOST = "h"; process.env.SMTP_USER = "u"; process.env.SMTP_PASS = "p";
    expect(agentReadiness({ status: "ACTIVE", handler: "outreach.draft_send", tools: ["outreach.send"] }, keys).state).toBe("WORKING");
  });
  it("never reports a draft agent as working", () => {
    expect(agentReadiness({ status: "DRAFT", handler: null, tools: [] }, keys).state).toBe("NOT_ACTIVE");
  });
});

describe("company knowledge + weekly cadence", () => {
  it("builds grounded entries from the site's own data, including a claims policy", () => {
    const k = companyKnowledge();
    expect(k.some((e) => e.title === "Product: CliqPOS")).toBe(true);
    expect(k.some((e) => e.title === "Claims policy")).toBe(true);
    expect(k.filter((e) => e.section === "Support").length).toBeGreaterThan(3);
  });
  it("labels ISO weeks stably", () => {
    expect(isoWeek(new Date("2026-10-08T12:00:00Z"))).toBe("2026-W41");
    expect(isoWeek(new Date("2026-12-31T12:00:00Z"))).toBe("2026-W53");
  });
});
