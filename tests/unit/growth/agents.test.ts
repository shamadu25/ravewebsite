/** @jest-environment node */
process.env.GROWTH_SENDER_IDENTITY = "RaveSoft";
jest.mock("@/lib/prisma", () => ({ prisma: {} }));
jest.mock("@/lib/os/audit", () => ({ audit: jest.fn() }));
jest.mock("@/lib/os/crm", () => ({ logActivity: jest.fn(), setStage: jest.fn() }));
jest.mock("@/lib/os/llm", () => ({ complete: jest.fn(), LlmUnavailableError: class extends Error {}, parseJsonLoose: jest.fn() }));
jest.mock("@/lib/os/channels", () => ({ getChannelAdapter: jest.fn() }));
jest.mock("@/lib/os/outreach", () => ({ isOutboundPaused: jest.fn() }));

import { checkReplyPolicy, needsFounder, templateReply } from "@/lib/growth/agents/reply-agent";
import { BUILTIN_PROFILES } from "@/lib/growth/config";

const ok = { subject: "Re: Acme", senderIdentity: "RaveSoft" };

describe("reply policy", () => {
  it("accepts every shipped template", () => {
    for (const category of ["INTERESTED", "REQUESTING_DETAILS", "PRICING_QUESTION", "REFERRAL"] as const) {
      const m = templateReply({ category, firstName: "Sam", companyName: "Acme Roofing", sender: "RaveSoft", link: "https://cal.test/x" });
      expect(checkReplyPolicy({ subject: m.subject, body: m.body, senderIdentity: "RaveSoft" })).toEqual({ passed: true, issues: [] });
    }
  });
  it("blocks unapproved prices, guarantees, results and delivery dates", () => {
    const bad = (body: string) => checkReplyPolicy({ ...ok, body: `${body}\nRaveSoft` }).issues.map((i) => i.code);
    expect(bad("We can do it for $3,000.")).toContain("unapproved_price");
    expect(bad("Starts at $7,500.")).toEqual([]);
    expect(bad("We guarantee more bookings.")).toContain("hype");
    expect(bad("Our clients saw growth, see our case study.")).toContain("fake_proof");
    expect(bad("We will be live in 5 days.")).toContain("delivery_promise");
  });
  it("requires the sender identity in the body", () => {
    expect(checkReplyPolicy({ ...ok, body: "Hello there." }).issues.map((i) => i.code)).toContain("sender_in_body");
  });
});

describe("escalation and profiles", () => {
  it("routes contract, technical, legal and discount topics to the founder", () => {
    for (const t of ["Can you send the MSA?", "Do you integrate with ServiceTitan?", "Any discount?", "our lawyer will review"]) expect(needsFounder(t)).toBe(true);
    expect(needsFounder("Sounds interesting, tell me more")).toBe(false);
  });
  it("ships roofing, plumbing, remodeling and HVAC profiles", () => {
    expect(Object.keys(BUILTIN_PROFILES).sort()).toEqual(["us-hvac", "us-plumbing", "us-remodeling", "us-roofing"]);
  });
});
