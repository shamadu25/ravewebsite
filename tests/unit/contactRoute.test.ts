/** @jest-environment node */
const sendMail = jest.fn();
jest.mock("nodemailer", () => ({ __esModule: true, default: { createTransport: () => ({ sendMail: (...a: unknown[]) => sendMail(...a) }) } }));
const persist = jest.fn();
const recordFail = jest.fn().mockResolvedValue(undefined);
jest.mock("@/lib/enquiry", () => ({ ...jest.requireActual("@/lib/enquiry"), persistEnquiry: (...a: unknown[]) => persist(...a), recordNotifyFailure: (...a: unknown[]) => recordFail(...a) }));
jest.mock("@/lib/prisma", () => ({ prisma: {} }));

import { POST } from "@/app/api/contact/route";
import { issueFormToken } from "@/lib/antispam/formToken";

const aged = () => issueFormToken(Date.now() - 60_000);

const req = (body: unknown, ip = "1.1.1.1") =>
  new Request("http://x/api/contact", { method: "POST", headers: { "content-type": "application/json", "x-forwarded-for": ip }, body: JSON.stringify(body) }) as never;
const good = () => ({ fullName: "Kofi", email: `k${Math.random().toString(36).slice(2)}@x.com`, message: "hello", formToken: aged() });

beforeEach(() => { jest.clearAllMocks(); persist.mockResolvedValue({ leadId: 1, contactId: 2, duplicate: false }); sendMail.mockResolvedValue({}); });

describe("POST /api/contact", () => {
  it("saves the lead, then emails (old payload still works)", async () => {
    const res = await POST(req(good(), "2.2.2.2"));
    expect(res.status).toBe(200);
    expect(persist.mock.invocationCallOrder[0]).toBeLessThan(sendMail.mock.invocationCallOrder[0]);
  });
  it("honeypot: silent success, nothing saved or sent", async () => {
    const res = await POST(req({ ...good(), website: "http://spam" }, "3.3.3.3"));
    expect(res.status).toBe(200);
    expect(persist).not.toHaveBeenCalled();
    expect(sendMail).not.toHaveBeenCalled();
  });
  it("duplicate submission: success without a second email", async () => {
    persist.mockResolvedValue({ leadId: 1, contactId: 2, duplicate: true });
    const res = await POST(req(good(), "4.4.4.4"));
    expect(res.status).toBe(200);
    expect(sendMail).not.toHaveBeenCalled();
  });
  it("SMTP failure after saving: still success, failure recorded on the lead", async () => {
    sendMail.mockRejectedValue(new Error("smtp down"));
    const res = await POST(req(good(), "5.5.5.5"));
    expect(res.status).toBe(200);
    expect(recordFail).toHaveBeenCalledWith(1, 2, expect.any(Error));
  });
  it("database failure: email still goes out", async () => {
    persist.mockRejectedValue(new Error("db down"));
    const res = await POST(req(good(), "6.6.6.6"));
    expect(res.status).toBe(200);
    expect(sendMail).toHaveBeenCalledTimes(1);
  });
  it("both fail: 500 so the visitor can retry", async () => {
    persist.mockRejectedValue(new Error("db down"));
    sendMail.mockRejectedValue(new Error("smtp down"));
    expect((await POST(req(good(), "7.7.7.7"))).status).toBe(500);
  });
  it("invalid payload: 422", async () => {
    expect((await POST(req({ fullName: "", email: "bad", message: "" }, "8.8.8.8"))).status).toBe(422);
  });

  it("rejects a request with no form token (script posting directly)", async () => {
    const { formToken: _t, ...noToken } = good(); void _t;
    const res = await POST(req(noToken, "10.0.0.1"));
    expect(res.status).toBe(422);
    expect(persist).not.toHaveBeenCalled();
    expect(sendMail).not.toHaveBeenCalled();
  });
  it("rejects a submission made instantly after the token was issued", async () => {
    const res = await POST(req({ ...good(), formToken: issueFormToken() }, "10.0.0.2"));
    expect(res.status).toBe(422);
    expect(sendMail).not.toHaveBeenCalled();
  });
  it("rejects a forged token", async () => {
    const res = await POST(req({ ...good(), formToken: `${Date.now() - 60000}.abcd.deadbeef` }, "10.0.0.3"));
    expect(res.status).toBe(422);
  });
  it("blocks spam content even with a valid token", async () => {
    const res = await POST(req({ ...good(), message: "Boost your ranking with cheap backlinks and SEO services http://a.com http://b.com http://c.com" }, "10.0.0.4"));
    expect(res.status).toBe(422);
    expect(persist).not.toHaveBeenCalled();
  });
  it("lets a genuine enquiry with one link through", async () => {
    const res = await POST(req({ ...good(), message: "We run 3 pharmacies in Kumasi and want a POS. Our current site: https://example.com/pharmacy" }, "10.0.0.5"));
    expect(res.status).toBe(200);
    expect(persist).toHaveBeenCalled();
  });
  it("limits one IP to 5 submissions per 10 minutes", async () => {
    const codes: number[] = [];
    for (let i = 0; i < 7; i++) codes.push((await POST(req(good(), "10.0.0.6"))).status);
    expect(codes.slice(0, 5).every((c) => c === 200)).toBe(true);
    expect(codes.slice(5)).toEqual([429, 429]);
  });
  it("limits one email address to 3 submissions per hour", async () => {
    const email = "same@x.com";
    const codes: number[] = [];
    for (let i = 0; i < 4; i++) codes.push((await POST(req({ ...good(), email, message: `m${i}` }, `10.1.0.${i}`))).status);
    expect(codes).toEqual([200, 200, 200, 429]);
  });
});
