/** @jest-environment node */
import { analyzeContent } from "@/lib/antispam/content";
import { issueFormToken, verifyFormToken } from "@/lib/antispam/formToken";
import { rateLimit } from "@/lib/ai/rateLimit";
import { clientIp } from "@/app/api/ai/_shared";
import { NextRequest } from "next/server";

describe("analyzeContent — genuine enquiries are NOT blocked", () => {
  const genuine = [
    { name: "Kofi Mensah", company: "Kofi Mart", email: "kofi@kofimart.com", message: "We have 3 retail shops in Accra and Kumasi and need a POS with inventory." },
    { name: "Aminata Diallo", message: "Bonjour, nous cherchons un logiciel de gestion hôtelière pour notre hôtel à Abidjan." },
    { name: "Tunde O.", message: "Need a crypto exchange dashboard and a forex reporting tool built. Budget is ready." },
    { name: "Dr. Bello", company: "Bello Medical Centre", message: "Our site is https://bellomedical.ng — we want a hospital management system." },
    { name: "Ama", message: "hi" },
    { name: "Li Wei", message: "Please quote for an ERP. Contact me on WhatsApp." },
  ];
  it.each(genuine)("passes: %j", (g) => expect(analyzeContent(g).spam).toBe(false));
  it("a lone odd-looking name is only a weak signal, not a block", () => expect(analyzeContent({ name: "xkqjzrtwpl", message: "hello there" }).spam).toBe(false));
});

describe("analyzeContent — spam is blocked", () => {
  const spam = [
    { name: "Mark", message: "Get first page of google with our SEO services! http://a.com http://b.com" },
    { name: "Jane", message: "Cheap viagra cialis online" },
    { name: "http://spamsite.com", message: "hello" },
    { name: "xkqjzrtwpl", message: "see www.getrich.top and www.cheap-loans.top" },
    { name: "Bob", email: "bob@mailinator.com", message: "I need a quote" },
    { name: "Eve", message: "Buy backlinks and guest posts today http://x.com http://y.com http://z.com" },
    { name: "Zed", message: "Make money fast! Click here: www.getrich.top" },
  ];
  it.each(spam)("blocks: %j", (s) => expect(analyzeContent(s).spam).toBe(true));
});

describe("form tokens", () => {
  const now = Date.now();
  it("accepts a token that has aged past the minimum", () => {
    expect(verifyFormToken(issueFormToken(now - 10_000), 4_000, now)).toEqual({ ok: true });
  });
  it("rejects missing, malformed and forged tokens", () => {
    expect(verifyFormToken(undefined, 0, now)).toMatchObject({ ok: false, reason: "missing" });
    expect(verifyFormToken("abc", 0, now)).toMatchObject({ ok: false, reason: "invalid" });
    const t = issueFormToken(now - 10_000);
    expect(verifyFormToken(t.slice(0, -2) + "00", 0, now)).toMatchObject({ ok: false, reason: "invalid" });
    expect(verifyFormToken(`${now - 10_000}.nonce.${"0".repeat(64)}`, 0, now)).toMatchObject({ ok: false, reason: "invalid" });
  });
  it("rejects a token used too fast (bot) or too old", () => {
    expect(verifyFormToken(issueFormToken(now - 500), 4_000, now)).toMatchObject({ ok: false, reason: "too_fast" });
    expect(verifyFormToken(issueFormToken(now - 3 * 3_600_000), 0, now)).toMatchObject({ ok: false, reason: "expired" });
  });
  it("limits how many submissions one token can authorise", () => {
    const t = issueFormToken(now - 10_000);
    const results = Array.from({ length: 7 }, () => verifyFormToken(t, 0, now).ok);
    expect(results).toEqual([true, true, true, true, true, false, false]);
  });
  it("rejects a token issued in the future", () => {
    expect(verifyFormToken(issueFormToken(now + 60_000), 0, now)).toMatchObject({ ok: false });
  });
});

describe("rateLimit", () => {
  it("allows up to max then blocks, per key and per window", () => {
    const k = `rl-${Math.random()}`;
    const t = 1_000_000;
    expect([1, 2, 3].map(() => rateLimit(k, 3, 1000, t))).toEqual([false, false, false]);
    expect(rateLimit(k, 3, 1000, t)).toBe(true);
    expect(rateLimit(k, 3, 1000, t + 1001)).toBe(false); // new window
  });
});

describe("clientIp", () => {
  const req = (xff: string) => new NextRequest("http://x/", { headers: { "x-forwarded-for": xff } });
  afterEach(() => { delete process.env.TRUSTED_PROXY_HOPS; });
  it("legacy default: left-most address", () => expect(clientIp(req("1.1.1.1, 2.2.2.2"))).toBe("1.1.1.1"));
  it("with TRUSTED_PROXY_HOPS=1 a spoofed left-most value is ignored", () => {
    process.env.TRUSTED_PROXY_HOPS = "1";
    expect(clientIp(req("6.6.6.6, 9.9.9.9"))).toBe("9.9.9.9");
  });
  it("with two trusted hops (e.g. Cloudflare + Apache) picks the right entry", () => {
    process.env.TRUSTED_PROXY_HOPS = "2";
    expect(clientIp(req("6.6.6.6, 8.8.8.8, 10.0.0.1"))).toBe("8.8.8.8");
  });
});
