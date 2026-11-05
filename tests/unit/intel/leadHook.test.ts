/** @jest-environment node */
const sendMail = jest.fn();
jest.mock("nodemailer", () => ({ __esModule: true, default: { createTransport: () => ({ sendMail: (...a: unknown[]) => sendMail(...a) }) } }));
const persist = jest.fn();
jest.mock("@/lib/enquiry", () => ({ ...jest.requireActual("@/lib/enquiry"), persistEnquiry: (...a: unknown[]) => persist(...a), recordNotifyFailure: jest.fn().mockResolvedValue(undefined) }));
jest.mock("@/lib/prisma", () => ({ prisma: {} }));
const conversion = jest.fn();
const failure = jest.fn();
jest.mock("@/lib/analytics/lead", () => ({
  readTrackingIds: () => ({ vid: "visitor_AAAA1111", sid: "session_AAAA1111" }),
  // Run the task inline so assertions are deterministic; real code defers with next/server `after`.
  runAfterResponse: (task: () => Promise<void>) => { void task(); },
  // Mirror the real wrappers, which swallow every error (their behaviour is covered in ingest.test.ts).
  safeRecordLeadConversion: async (...a: unknown[]) => { try { await conversion(...a); } catch { /* swallowed */ } },
  safeRecordFormFailure: async (...a: unknown[]) => { try { await failure(...a); } catch { /* swallowed */ } },
}));

import { POST } from "@/app/api/contact/route";
import { issueFormToken } from "@/lib/antispam/formToken";

const req = (body: unknown, ip: string) => new Request("http://x/api/contact", { method: "POST", headers: { "content-type": "application/json", "x-forwarded-for": ip }, body: JSON.stringify(body) }) as never;
const good = () => ({ fullName: "Kofi", email: `k${Math.random().toString(36).slice(2)}@x.com`, message: "hello", page: "/contact", projectType: "POS", formToken: issueFormToken(Date.now() - 60_000) });

beforeEach(() => { jest.clearAllMocks(); persist.mockResolvedValue({ leadId: 11, contactId: 5, duplicate: false }); sendMail.mockResolvedValue({}); conversion.mockResolvedValue(undefined); failure.mockResolvedValue(undefined); });

describe("lead → analytics hook (email workflow unchanged)", () => {
  it("records the conversion only after the lead is persisted, with the lead id and tracking ids", async () => {
    const res = await POST(req(good(), "21.0.0.1"));
    expect(res.status).toBe(200);
    expect(conversion).toHaveBeenCalledWith(expect.objectContaining({ leadId: 11, contactId: 5, page: "/contact", service: "POS", ids: { vid: "visitor_AAAA1111", sid: "session_AAAA1111" } }));
    expect(persist.mock.invocationCallOrder[0]).toBeLessThan(conversion.mock.invocationCallOrder[0]);
    expect(sendMail).toHaveBeenCalledTimes(1); // existing notification still sent exactly once
  });
  it("persistence failed → no conversion is recorded (a failure event is), and the email path is unchanged", async () => {
    persist.mockRejectedValue(new Error("db down")); const spy = jest.spyOn(console, "error").mockImplementation(() => undefined);
    const res = await POST(req(good(), "21.0.0.2"));
    expect(res.status).toBe(200); expect(conversion).not.toHaveBeenCalled(); expect(failure).toHaveBeenCalledWith(expect.anything(), "/contact", "persist_failed"); expect(sendMail).toHaveBeenCalledTimes(1);
    spy.mockRestore();
  });
  it("an analytics outage cannot break the form or the email", async () => {
    conversion.mockRejectedValue(new Error("analytics down"));
    const res = await POST(req(good(), "21.0.0.3"));
    expect(res.status).toBe(200); expect(sendMail).toHaveBeenCalledTimes(1);
  });
  it("blocked submissions (honeypot) are neither converted nor counted as failures", async () => {
    const res = await POST(req({ ...good(), website: "http://spam" }, "21.0.0.4"));
    expect(res.status).toBe(200); expect(conversion).not.toHaveBeenCalled(); expect(failure).not.toHaveBeenCalled();
  });
  it("a missing form token is recorded as a guarded failure", async () => {
    const { formToken, ...noToken } = good(); void formToken;
    const res = await POST(req(noToken, "21.0.0.5"));
    expect(res.status).toBeGreaterThanOrEqual(400); expect(conversion).not.toHaveBeenCalled(); expect(failure).toHaveBeenCalled();
  });
  it("a duplicate re-submission re-invokes the idempotent hook (safe: one conversion per lead)", async () => {
    persist.mockResolvedValue({ leadId: 11, contactId: 5, duplicate: true });
    await POST(req(good(), "21.0.0.6"));
    expect(conversion).toHaveBeenCalledTimes(1); expect(sendMail).not.toHaveBeenCalled();
  });
});
