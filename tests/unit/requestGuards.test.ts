/** @jest-environment node */
import { isSameOrigin, readJsonLimited, MAX_BODY_BYTES } from "@/lib/antispam/request";

const req = (headers: Record<string, string>, body = "{}") => new Request("https://ravesoftsolutions.com/api/contact", { method: "POST", headers, body });

describe("isSameOrigin", () => {
  it("allows same-origin browser posts", () => expect(isSameOrigin(req({ origin: "https://ravesoftsolutions.com", host: "ravesoftsolutions.com", "sec-fetch-site": "same-origin" }))).toBe(true));
  it("allows non-browser clients that send no Origin", () => expect(isSameOrigin(req({}))).toBe(true));
  it("blocks a different origin", () => expect(isSameOrigin(req({ origin: "https://evil.example", host: "ravesoftsolutions.com" }))).toBe(false));
  it("blocks look-alike hosts (exact match, not prefix/suffix)", () => {
    expect(isSameOrigin(req({ origin: "https://ravesoftsolutions.com.evil.io", host: "ravesoftsolutions.com" }))).toBe(false);
    expect(isSameOrigin(req({ origin: "https://evilravesoftsolutions.com", host: "ravesoftsolutions.com" }))).toBe(false);
  });
  it("blocks Sec-Fetch-Site: cross-site even if Origin is missing", () => expect(isSameOrigin(req({ "sec-fetch-site": "cross-site" }))).toBe(false));
  it("blocks a malformed Origin", () => expect(isSameOrigin(req({ origin: "not a url", host: "ravesoftsolutions.com" }))).toBe(false));
});

describe("readJsonLimited", () => {
  it("parses a normal body", async () => expect(await readJsonLimited(req({}, '{"a":1}'))).toEqual({ ok: true, body: { a: 1 } }));
  it("rejects invalid JSON with 422", async () => expect(await readJsonLimited(req({}, "{bad"))).toEqual({ ok: false, status: 422 }));
  it("rejects an oversized body with 413 even when Content-Length lies", async () => {
    const big = JSON.stringify({ x: "A".repeat(MAX_BODY_BYTES + 10) });
    expect(await readJsonLimited(req({ "content-length": "10" }, big))).toEqual({ ok: false, status: 413 });
  });
  it("rejects a declared oversized body without reading it", async () => expect(await readJsonLimited(req({ "content-length": String(MAX_BODY_BYTES + 1) }))).toEqual({ ok: false, status: 413 }));
});
