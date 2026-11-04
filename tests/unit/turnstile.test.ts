/** @jest-environment node */
const prismaMock = { conversionEvent: { create: jest.fn().mockResolvedValue({}) } };
jest.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
import { guardForm, POLICIES } from "@/lib/antispam/guard";
import { issueFormToken } from "@/lib/antispam/formToken";
import { verifyTurnstile, turnstileEnabled } from "@/lib/antispam/turnstile";

const aged = () => issueFormToken(Date.now() - 60_000);
const base = (ip: string) => ({ ip, email: `${ip}@x.com`, name: "Kofi", message: "hello", formToken: aged() });
const realFetch = global.fetch;
afterEach(() => { global.fetch = realFetch; delete process.env.TURNSTILE_SECRET_KEY; delete process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY; jest.clearAllMocks(); });

describe("Turnstile (optional)", () => {
  it("is a no-op when not configured", async () => {
    expect(turnstileEnabled()).toBe(false);
    expect((await guardForm(POLICIES.contact, base("20.0.0.1"))).ok).toBe(true);
  });
  describe("when configured", () => {
    beforeEach(() => { process.env.TURNSTILE_SECRET_KEY = "s"; process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY = "k"; });
    it("rejects a missing token without calling Cloudflare", async () => {
      global.fetch = jest.fn() as never;
      const r = await guardForm(POLICIES.contact, base("20.0.0.2"));
      expect(r).toMatchObject({ ok: false, status: 422, reason: "turnstile_failed" });
      expect(global.fetch).not.toHaveBeenCalled();
    });
    it("accepts when Cloudflare says success", async () => {
      global.fetch = jest.fn().mockResolvedValue({ json: async () => ({ success: true }) }) as never;
      expect((await guardForm(POLICIES.contact, { ...base("20.0.0.3"), turnstileToken: "tok" })).ok).toBe(true);
    });
    it("rejects when Cloudflare says failure", async () => {
      global.fetch = jest.fn().mockResolvedValue({ json: async () => ({ success: false }) }) as never;
      expect((await guardForm(POLICIES.contact, { ...base("20.0.0.4"), turnstileToken: "bad" })).ok).toBe(false);
    });
    it("fails OPEN if Cloudflare is unreachable (real customers are never locked out)", async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error("network")) as never;
      expect(await verifyTurnstile("tok", "1.1.1.1")).toEqual({ ok: true, unreachable: true });
    });
  });
});

describe("guardForm ordering and logging", () => {
  it("honeypot is silent and logged as spam_blocked", async () => {
    const r = await guardForm(POLICIES.contact, { ...base("20.0.1.1"), honeypot: "x" });
    expect(r).toMatchObject({ ok: false, silent: true, reason: "honeypot" });
    expect(prismaMock.conversionEvent.create.mock.calls[0][0].data).toMatchObject({ eventType: "spam_blocked" });
  });
  it("rate-limit rejections are not written to the database (cannot be used to flood it)", async () => {
    let last;
    for (let i = 0; i < 8; i++) last = await guardForm(POLICIES.contact, base("20.0.1.2"));
    expect(last).toMatchObject({ ok: false, status: 429 });
    const logged = prismaMock.conversionEvent.create.mock.calls.length;
    expect(logged).toBe(0);
  });
  it("chat start needs a valid token but no content check", async () => {
    expect((await guardForm(POLICIES.chatStart, { ip: "20.0.1.3" })).ok).toBe(false);
    expect((await guardForm(POLICIES.chatStart, { ip: "20.0.1.4", formToken: issueFormToken() })).ok).toBe(true);
  });

  it("junk attempts using someone's email do not use up that person's quota", async () => {
    const email = "victim@example.com";
    for (let i = 0; i < 6; i++) await guardForm(POLICIES.contact, { ip: `30.0.0.${i}`, email, name: "x", message: "hi", formToken: null });
    const real = await guardForm(POLICIES.contact, { ip: "30.0.1.1", email, name: "Real Person", message: "I need a POS", formToken: aged() });
    expect(real.ok).toBe(true);
  });
});
