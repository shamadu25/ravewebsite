/** @jest-environment node */
import { scoreCompany, normaliseDomain, type SignalEvidence } from "@/lib/growth/icp";
import { checkPolicy, contentHash } from "@/lib/growth/policy";
import { SnovClient, SnovNotConfiguredError, SnovError, mapVerification } from "@/lib/growth/snov";
import { keywordCategory } from "@/lib/growth/replies";
import { rate, fmtRate } from "@/lib/growth/funnel";
import { evidenceFromWebsite } from "@/lib/growth/discovery";
import { DEFAULT_WEIGHTS } from "@/lib/growth/config";

const P = { weights: DEFAULT_WEIGHTS, qualifyAt: 60, minConfidence: 0.4 };
const ev = (signal: SignalEvidence["signal"], sourceUrl = "https://a.com"): SignalEvidence => ({ signal, claim: signal, sourceUrl });

describe("scoreCompany", () => {
  it("ignores evidence without a source URL", () => {
    const r = scoreCompany({ industryMatch: true, hasOfficialSite: true, hasPublicContact: true, contradictions: 0, evidence: [ev("service_inquiries", ""), ev("quote_based", " ")] }, P);
    expect(r.decision).toBe("REJECTED");
    expect(r.components.find((c) => c.key === "operationalPain")?.points).toBe(0);
  });
  it("weights sum to 100 and a fully evidenced company qualifies with separate readiness", () => {
    expect(Object.values(DEFAULT_WEIGHTS).reduce((a, b) => a + b, 0)).toBe(100);
    const e = [ev("service_inquiries"), ev("slow_followup"), ev("multi_location"), ev("multi_technician"), ev("hiring"), ev("paid_ads"), ev("quote_based"), ev("crm_or_booking")];
    const r = scoreCompany({ industryMatch: true, hasOfficialSite: true, hasPublicContact: true, contradictions: 0, evidence: e }, P);
    expect(r.fitScore).toBe(100);
    expect(r.decision).toBe("QUALIFIED");
    expect(r.readinessScore).toBeLessThanOrEqual(100);
  });
  it("sends contradictory evidence to human review even with a high score", () => {
    const e = [ev("service_inquiries"), ev("slow_followup"), ev("multi_location"), ev("multi_technician"), ev("hiring"), ev("paid_ads"), ev("quote_based")];
    expect(scoreCompany({ industryMatch: true, hasOfficialSite: true, hasPublicContact: true, contradictions: 1, evidence: e }, P).decision).toBe("REVIEW");
  });
  it("rejects wrong industry and missing identity", () => {
    expect(scoreCompany({ industryMatch: false, hasOfficialSite: true, hasPublicContact: true, contradictions: 0, evidence: [ev("hiring")] }, P).decision).toBe("REJECTED");
    expect(scoreCompany({ industryMatch: true, hasOfficialSite: false, hasPublicContact: true, contradictions: 0, evidence: [ev("hiring")] }, P).decision).toBe("REJECTED");
  });
  it("respects custom weights", () => {
    const r = scoreCompany({ industryMatch: true, hasOfficialSite: true, hasPublicContact: false, contradictions: 0, evidence: [ev("hiring")] }, { ...P, weights: { ...DEFAULT_WEIGHTS, industryFit: 50, operationalPain: 0, sizeAbility: 0, demandGrowth: 50, useCaseClarity: 0, contactability: 0 } });
    expect(r.fitScore).toBe(50 + 25);
  });
});

describe("normaliseDomain", () => {
  it("strips scheme, www and path; rejects junk", () => {
    expect(normaliseDomain("https://www.Acme-HVAC.com/contact")).toBe("acme-hvac.com");
    expect(normaliseDomain("acme.com")).toBe("acme.com");
    expect(normaliseDomain("not a domain")).toBeNull();
  });
});

describe("checkPolicy", () => {
  const good = { subject: "Enquiry handling at Acme", toEmail: "o@acme.com", senderIdentity: "RaveSoft", postalAddress: "1 Main St, Austin TX", touch: 1, body: `Hello Acme team,\n\nHow quickly do after-hours enquiries get a reply?\n\nRaveSoft\n1 Main St, Austin TX\n\nReply "unsubscribe" and we will stop.` };
  it("passes a clean message", () => expect(checkPolicy(good).passed).toBe(true));
  it.each([
    ["guarantee", { body: good.body + " We guarantee 10x leads." }, "hype"],
    ["case study", { body: good.body + " See our case study." }, "fake_proof"],
    ["fake reply subject", { subject: "Re: hello" }, "deceptive_subject"],
    ["fake familiarity", { body: good.body + " As we discussed" }, "fake_familiarity"],
    ["fact claim", { body: good.body + " You are losing calls." }, "unsupported_claim"],
    ["no opt-out", { body: "Hello,\n\nRaveSoft\n1 Main St, Austin TX" }, "opt_out"],
    ["no postal address", { postalAddress: "" }, "postal_address"],
    ["bad recipient", { toEmail: "nope" }, "recipient"],
  ])("blocks %s", (_n, over, code) => {
    const r = checkPolicy({ ...good, ...over });
    expect(r.passed).toBe(false);
    expect(r.issues.map((i) => i.code)).toContain(code);
  });
  it("hash changes with any bound field", () => {
    const base = { toEmail: "a@b.com", senderIdentity: "S", subject: "s", body: "b" };
    const h = contentHash(base);
    for (const k of Object.keys(base) as Array<keyof typeof base>) expect(contentHash({ ...base, [k]: base[k] + "x" })).not.toBe(h);
    expect(contentHash({ ...base, toEmail: "A@B.com" })).toBe(h);
  });
});

describe("Snov", () => {
  it("throws awaiting-credentials error and never calls the network", async () => {
    const f = jest.fn();
    const c = new SnovClient({ fetchImpl: f as never });
    delete process.env.SNOV_CLIENT_ID; delete process.env.SNOV_CLIENT_SECRET;
    await expect(c.verify("a@b.com")).rejects.toBeInstanceOf(SnovNotConfiguredError);
    expect(f).not.toHaveBeenCalled();
  });
  it("authenticates, starts and polls a verification task", async () => {
    const calls: string[] = [];
    const f = jest.fn(async (url: string) => {
      calls.push(url);
      const body = url.endsWith("access_token") ? { access_token: "t", expires_in: 3600 }
        : url.includes("verification/start") ? { data: { task_hash: "h" } }
        : { status: "completed", data: [{ email: "a@b.com", result: { smtp_status: "valid", is_valid_format: true, is_disposable: false } }] };
      return { ok: true, status: 200, json: async () => body } as Response;
    });
    const c = new SnovClient({ clientId: "i", clientSecret: "s", fetchImpl: f as never, sleep: async () => undefined });
    const v = await c.verify("a@b.com");
    expect(mapVerification(v)).toBe("VERIFIED");
    expect(calls[0]).toBe("https://api.snov.io/v1/oauth/access_token");
    expect(calls[1]).toBe("https://api.snov.io/v2/email-verification/start");
  });
  it("maps provider errors", async () => {
    const mk = (status: number) => new SnovClient({ clientId: "i", clientSecret: "s", fetchImpl: (async () => ({ ok: false, status, json: async () => ({}) })) as never });
    await expect(mk(429).accessToken()).rejects.toMatchObject({ kind: "rate_limit" });
    await expect(mk(401).accessToken()).rejects.toMatchObject({ kind: "auth" });
    await expect(mk(402).accessToken()).rejects.toBeInstanceOf(SnovError);
  });
  it("never marks catch-all, unknown, disposable or invalid as VERIFIED", () => {
    expect(mapVerification({ email: "x", smtpStatus: "unknown", unknownReason: "catchall" })).toBe("RISKY");
    expect(mapVerification({ email: "x", smtpStatus: "unknown", unknownReason: "greylist" })).toBe("MANUAL_REVIEW");
    expect(mapVerification({ email: "x", smtpStatus: "valid", isDisposable: true })).toBe("RISKY");
    expect(mapVerification({ email: "x", smtpStatus: "not_valid" })).toBe("INVALID");
  });
});

describe("replies + funnel + evidence", () => {
  it("fast-paths stop and complaint phrases", () => {
    expect(keywordCategory("please remove me from your list")?.category).toBe("UNSUBSCRIBE");
    expect(keywordCategory("this is spam, I will report you")?.category).toBe("COMPLAINT");
    expect(keywordCategory("I am out of office until Monday")?.category).toBe("OUT_OF_OFFICE");
    expect(keywordCategory("sounds interesting, tell me more")).toBeNull();
  });
  it("rates are N/A on zero denominators", () => {
    expect(rate(1, 0)).toBeNull();
    expect(fmtRate(rate(1, 0))).toBe("N/A");
    expect(rate(1, 3)).toBe(33.3);
  });
  it("evidence only from reachable pages and cites the page", () => {
    const a = { url: "https://a.com/", reachable: true, title: null, description: null, emails: [], phones: [], textExcerpt: "free estimate today! we are hiring technicians", signals: { bookingFlow: true, contactForm: true } } as never;
    const e = evidenceFromWebsite(a);
    expect(e.map((x) => x.signal)).toEqual(expect.arrayContaining(["online_booking", "quote_based", "service_inquiries", "hiring"]));
    expect(e.every((x) => x.sourceUrl === "https://a.com/")).toBe(true);
    expect(evidenceFromWebsite({ ...(a as object), reachable: false } as never)).toEqual([]);
  });
});
