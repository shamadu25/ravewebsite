/** @jest-environment node */
const sendMail = jest.fn();
jest.mock("nodemailer", () => ({ __esModule: true, default: { createTransport: () => ({ sendMail: (...a: unknown[]) => sendMail(...a) }) } }));
const persist = jest.fn();
const recordFail = jest.fn().mockResolvedValue(undefined);
jest.mock("@/lib/enquiry", () => ({ ...jest.requireActual("@/lib/enquiry"), persistEnquiry: (...a: unknown[]) => persist(...a), recordNotifyFailure: (...a: unknown[]) => recordFail(...a) }));
jest.mock("@/lib/prisma", () => ({ prisma: {} }));

import { POST } from "@/app/api/contact/route";

const req = (body: unknown, ip = "1.1.1.1") =>
  new Request("http://x/api/contact", { method: "POST", headers: { "content-type": "application/json", "x-forwarded-for": ip }, body: JSON.stringify(body) }) as never;
const good = { fullName: "Kofi", email: "k@x.com", message: "hello" };

beforeEach(() => { jest.clearAllMocks(); persist.mockResolvedValue({ leadId: 1, contactId: 2, duplicate: false }); sendMail.mockResolvedValue({}); });

describe("POST /api/contact", () => {
  it("saves the lead, then emails (old payload still works)", async () => {
    const res = await POST(req(good, "2.2.2.2"));
    expect(res.status).toBe(200);
    expect(persist.mock.invocationCallOrder[0]).toBeLessThan(sendMail.mock.invocationCallOrder[0]);
  });
  it("honeypot: silent success, nothing saved or sent", async () => {
    const res = await POST(req({ ...good, website: "http://spam" }, "3.3.3.3"));
    expect(res.status).toBe(200);
    expect(persist).not.toHaveBeenCalled();
    expect(sendMail).not.toHaveBeenCalled();
  });
  it("duplicate submission: success without a second email", async () => {
    persist.mockResolvedValue({ leadId: 1, contactId: 2, duplicate: true });
    const res = await POST(req(good, "4.4.4.4"));
    expect(res.status).toBe(200);
    expect(sendMail).not.toHaveBeenCalled();
  });
  it("SMTP failure after saving: still success, failure recorded on the lead", async () => {
    sendMail.mockRejectedValue(new Error("smtp down"));
    const res = await POST(req(good, "5.5.5.5"));
    expect(res.status).toBe(200);
    expect(recordFail).toHaveBeenCalledWith(1, 2, expect.any(Error));
  });
  it("database failure: email still goes out", async () => {
    persist.mockRejectedValue(new Error("db down"));
    const res = await POST(req(good, "6.6.6.6"));
    expect(res.status).toBe(200);
    expect(sendMail).toHaveBeenCalledTimes(1);
  });
  it("both fail: 500 so the visitor can retry", async () => {
    persist.mockRejectedValue(new Error("db down"));
    sendMail.mockRejectedValue(new Error("smtp down"));
    expect((await POST(req(good, "7.7.7.7"))).status).toBe(500);
  });
  it("invalid payload: 422", async () => {
    expect((await POST(req({ fullName: "", email: "bad", message: "" }, "8.8.8.8"))).status).toBe(422);
  });
});
