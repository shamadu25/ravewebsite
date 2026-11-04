/** @jest-environment node */
const persist = jest.fn();
const recordFail = jest.fn().mockResolvedValue(undefined);
jest.mock("@/lib/enquiry", () => ({ ...jest.requireActual("@/lib/enquiry"), persistLandingEnquiry: (...a: unknown[]) => persist(...a), recordNotifyFailure: (...a: unknown[]) => recordFail(...a) }));
const notify = jest.fn();
jest.mock("@/lib/mail/notifications", () => ({ sendWebsiteLeadNotification: (...a: unknown[]) => notify(...a) }));
jest.mock("@/lib/prisma", () => ({ prisma: { conversionEvent: { create: jest.fn().mockResolvedValue({}) } } }));

import { handleLandingLead } from "@/lib/landingLead";
import { LandingEnquirySchema } from "@/lib/enquiry";
import { issueFormToken } from "@/lib/antispam/formToken";

let n = 0;
const body = (over: Record<string, unknown> = {}) => ({
  formType: "get_started", fullName: "Ama Mensah", businessName: "Ama Ltd", phone: "+233 24 123 4567", email: `ama${++n}${Math.random().toString(36).slice(2, 6)}@company.com`,
  businessType: "retail", solution: "pos", message: "Need a POS", submissionId: `sub-${n}-abcdefgh`, formToken: issueFormToken(Date.now() - 60_000),
  attribution: { first: { utm_source: "facebook", landingUrl: "/get-started?utm_source=facebook" }, latest: { utm_source: "facebook", utm_campaign: "c1", fbclid: "F1", landingUrl: "/get-started" } }, ...over,
});
const req = () => new Request("https://x/api/contact", { method: "POST", headers: { "x-forwarded-for": `9.9.${n}.${Math.floor(Math.random() * 250)}` } });
const run = async (b: unknown) => { const r = await handleLandingLead(req(), b); return { status: r.status, json: await r.json() }; };

beforeEach(() => { jest.clearAllMocks(); persist.mockResolvedValue({ leadId: 7, contactId: 3, duplicate: false }); notify.mockResolvedValue("sent"); });

describe("handleLandingLead", () => {
  it("saves the lead BEFORE sending the email, then succeeds", async () => {
    const r = await run(body());
    expect(r.status).toBe(200);
    expect(r.json).toMatchObject({ success: true });
    expect(persist.mock.invocationCallOrder[0]).toBeLessThan(notify.mock.invocationCallOrder[0]);
    expect(notify.mock.calls[0][0]).toMatchObject({ leadId: 7, solutionLabel: "POS / Retail Management Software", businessTypeLabel: "Retail / Supermarket / Wholesale" });
    expect(recordFail).not.toHaveBeenCalled();
  });

  it("database failure → error, NO success, NO email, no personal data in the response", async () => {
    persist.mockRejectedValue(new Error("db down"));
    const r = await run(body());
    expect(r.status).toBe(500);
    expect(r.json.success).toBeUndefined();
    expect(r.json.code).toBe("persist_failed");
    expect(notify).not.toHaveBeenCalled();
  });

  it("email failure → lead retained, success returned, failure recorded on the lead", async () => {
    notify.mockResolvedValue("failed");
    const r = await run(body());
    expect(r.status).toBe(200);
    expect(r.json.success).toBe(true);
    expect(recordFail).toHaveBeenCalledWith(7, 3, expect.any(Error));
  });

  it("mail not configured is also flagged, never lost", async () => {
    notify.mockResolvedValue("not_configured");
    expect((await run(body())).status).toBe(200);
    expect(recordFail).toHaveBeenCalled();
  });

  it("duplicate submission → success flagged as duplicate, and NO second email", async () => {
    persist.mockResolvedValue({ leadId: 7, contactId: 3, duplicate: true, duplicateKind: "similar" });
    const r = await run(body());
    expect(r.json).toMatchObject({ success: true, duplicate: "similar" });
    expect(notify).not.toHaveBeenCalled();
  });

  it("honeypot → fake success, nothing stored or sent", async () => {
    const r = await run(body({ website: "http://spam.io" }));
    expect(r.status).toBe(200);
    expect(persist).not.toHaveBeenCalled();
    expect(notify).not.toHaveBeenCalled();
  });

  it.each([
    ["missing token", { formToken: undefined }],
    ["token issued a moment ago", { formToken: issueFormToken() }],
  ])("anti-spam: %s → 422, nothing stored", async (_n, over) => {
    const r = await run(body(over));
    expect(r.status).toBe(422);
    expect(persist).not.toHaveBeenCalled();
  });

  it("spam content → 422", async () => {
    const r = await run(body({ message: "buy cheap backlinks SEO services http://a.com http://b.com http://c.com" }));
    expect(r.status).toBe(422);
    expect(persist).not.toHaveBeenCalled();
  });

  it("independent server-side validation returns field messages", async () => {
    const r = await run(body({ email: "nope", phone: "abc", fullName: "", solution: "hacked", businessType: "x" }));
    expect(r.status).toBe(422);
    expect(Object.keys(r.json.fields).sort()).toEqual(["businessType", "email", "fullName", "phone", "solution"]);
    expect(persist).not.toHaveBeenCalled();
  });

  it("passes sanitised data to persistence", async () => {
    await run(body({ fullName: "Ama\u0000  Mensah", message: "line1\r\n\r\n\r\n\r\nline2" }));
    const saved = persist.mock.calls[0][0];
    expect(saved.fullName).toBe("Ama Mensah");
    expect(saved.message).toBe("line1\n\nline2");
  });
});

describe("LandingEnquirySchema attribution validation", () => {
  const parse = (attribution: unknown) => LandingEnquirySchema.parse({ ...body(), attribution });
  it("keeps only site-relative landing URLs and http(s) referrers; drops junk dates", () => {
    const a = parse({ latest: { landingUrl: "https://evil.example/phish", referrer: "javascript:alert(1)", capturedAt: "not-a-date", utm_source: "fb" } }).attribution!.latest!;
    expect(a.landingUrl).toBe("");
    expect(a.referrer).toBe("");
    expect(a.capturedAt).toBe("");
    expect(a.utm_source).toBe("fb");
    expect(parse({ latest: { landingUrl: "//evil.example" } }).attribution!.latest!.landingUrl).toBe("");
  });
  it("strips unknown attribution keys and caps lengths", () => {
    const a = parse({ latest: { utm_source: "x".repeat(900), email: "leak@x.com" } }).attribution!.latest! as Record<string, unknown>;
    expect((a.utm_source as string).length).toBe(150);
    expect(a.email).toBeUndefined();
  });
});
