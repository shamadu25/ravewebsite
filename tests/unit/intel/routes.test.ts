/** @jest-environment node */
const ingest = jest.fn(async () => ({ sid: "session_AAAA1111", accepted: 1, duplicates: 0, newSession: true }));
const getSettings = jest.fn(async () => ({ enabled: true, consentMode: "opt_out", excludedPaths: [] as string[] }));
const verify = jest.fn(async (): Promise<{ email: string } | null> => null);
const getAdminSession = jest.fn(async (): Promise<{ email: string } | null> => null);
const findOsUser = jest.fn(async (): Promise<{ email: string; role: string; active: boolean } | null> => null);

jest.mock("@/lib/analytics/collect", () => ({ ingest: (...a: unknown[]) => (ingest as jest.Mock)(...a) }));
jest.mock("@/lib/analytics/settings", () => ({ getSettings: () => getSettings(), saveSettings: jest.fn(), DEFAULT_SETTINGS: {} }));
jest.mock("@/lib/auth/session", () => ({ SESSION_COOKIE: "rave_admin_session", verifySessionToken: () => verify(), getAdminSession: () => getAdminSession() }));
jest.mock("@/lib/prisma", () => ({ prisma: { osUser: { findUnique: () => findOsUser() }, osAuditLog: { findFirst: async () => null, create: async () => ({}) } } }));
jest.mock("@/lib/os/audit", () => ({ audit: jest.fn(async () => undefined) }));
jest.mock("@/lib/os/runtime", () => ({}));
jest.mock("@/lib/analytics/reports", () => ({ REPORTS: [{ id: "pages", label: "Pages" }], buildReport: jest.fn(async () => [{ path: "/", views: 3 }]) }));

import { NextRequest } from "next/server";
import { POST } from "@/app/api/intel/collect/route";
import { GET as EXPORT } from "@/app/api/intel/export/route";
import { POST as ADMIN } from "@/app/api/intel/admin/route";
import { GET as LIVE } from "@/app/api/intel/live/route";
import { can } from "@/lib/os/rbac";

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";
const good = { v: 1, vid: "visitor_AAAA1111", sid: "session_AAAA1111", ctx: { path: "/", qs: {} }, events: [{ id: "evt_00000001", type: "page_view" }] };
let ipN = 0;
const post = (body: unknown, h: Record<string, string> = {}) =>
  POST(new NextRequest("https://ravesoftsolutions.com/api/intel/collect", { method: "POST", body: typeof body === "string" ? body : JSON.stringify(body), headers: { "user-agent": UA, host: "ravesoftsolutions.com", "x-forwarded-for": `10.1.0.${++ipN}`, ...h } }));

beforeEach(() => { ingest.mockClear(); verify.mockResolvedValue(null); getAdminSession.mockResolvedValue(null); findOsUser.mockResolvedValue(null); getSettings.mockResolvedValue({ enabled: true, consentMode: "opt_out", excludedPaths: [] }); });

describe("collector endpoint", () => {
  it("accepts a valid batch and returns the session id", async () => { const r = await post(good); expect(r.status).toBe(200); expect(await r.json()).toEqual({ ok: true, sid: "session_AAAA1111" }); expect(ingest).toHaveBeenCalledTimes(1); });
  it.each([["malformed JSON", "{nope"], ["wrong schema", { v: 1, vid: "x" }], ["unknown event shape", { ...good, events: [{ id: "evt_00000001", type: "DROP TABLE users" }] }]])("rejects %s without touching the database", async (_n, b) => { const r = await post(b); expect([422]).toContain(r.status); expect(ingest).not.toHaveBeenCalled(); });
  it("rejects oversized payloads (413)", async () => { const r = await post(JSON.stringify({ ...good, pad: "x".repeat(20_000) })); expect(r.status).toBe(413); expect(ingest).not.toHaveBeenCalled(); });
  it("rejects cross-site posts", async () => { const r = await post(good, { origin: "https://evil.example", "sec-fetch-site": "cross-site" }); expect(r.status).toBe(403); expect(ingest).not.toHaveBeenCalled(); });
  it("drops bots silently", async () => { const r = await post(good, { "user-agent": "Mozilla/5.0 (compatible; Googlebot/2.1)" }); expect(r.status).toBe(204); expect(ingest).not.toHaveBeenCalled(); });
  it("excludes signed-in administrators (internal staff)", async () => { verify.mockResolvedValue({ email: "admin@x.com" }); const r = await post(good, { cookie: "rave_admin_session=abc" }); expect(r.status).toBe(204); expect(ingest).not.toHaveBeenCalled(); });
  it("honours the collection kill switch", async () => { getSettings.mockResolvedValue({ enabled: false, consentMode: "opt_out", excludedPaths: [] }); expect((await post(good)).status).toBe(204); expect(ingest).not.toHaveBeenCalled(); });
  it("opt-in mode records nothing without consent, and records with it", async () => {
    getSettings.mockResolvedValue({ enabled: true, consentMode: "opt_in", excludedPaths: [] });
    expect((await post(good)).status).toBe(204); expect(ingest).not.toHaveBeenCalled();
    expect((await post({ ...good, consent: true })).status).toBe(200); expect(ingest).toHaveBeenCalledTimes(1);
  });
  it("rate limits a single client (429) and recovers for others", async () => {
    const ip = { "x-forwarded-for": "203.0.113.77" };
    let last = 0;
    for (let i = 0; i < 125; i++) last = (await post({ ...good, vid: `visitor_RL${String(i).padStart(6, "0")}` }, ip)).status;
    expect(last).toBe(429);
    expect((await post(good)).status).toBe(200);
  });
  it("analytics errors never surface to the visitor", async () => { ingest.mockRejectedValueOnce(new Error("db down")); const spy = jest.spyOn(console, "error").mockImplementation(() => undefined); const r = await post(good); expect(r.status).toBe(202); spy.mockRestore(); });
});

describe("admin access control", () => {
  const exp = () => EXPORT(new NextRequest("https://ravesoftsolutions.com/api/intel/export?report=pages&range=7d"));
  it("unauthenticated users cannot export, read live data or change settings", async () => {
    expect((await exp()).status).toBe(401);
    expect((await LIVE(new NextRequest("https://x.test/api/intel/live"), { params: Promise.resolve({}) })).status).toBe(401);
    expect((await ADMIN(new NextRequest("https://x.test/api/intel/admin", { method: "POST", body: JSON.stringify({ action: "run_retention" }) }), { params: Promise.resolve({}) })).status).toBe(401);
  });
  it("a role without analytics permission is refused (403)", async () => {
    getAdminSession.mockResolvedValue({ email: "support@x.com" }); findOsUser.mockResolvedValue({ email: "support@x.com", role: "SUPPORT", active: true });
    expect((await exp()).status).toBe(403);
    expect((await LIVE(new NextRequest("https://x.test/api/intel/live"), { params: Promise.resolve({}) })).status).toBe(403);
  });
  it("a deactivated user loses access even with a valid cookie", async () => {
    getAdminSession.mockResolvedValue({ email: "m@x.com" }); findOsUser.mockResolvedValue({ email: "m@x.com", role: "MARKETING", active: false });
    expect((await exp()).status).toBe(401);
  });
  it("read-only roles can read but not manage", async () => {
    getAdminSession.mockResolvedValue({ email: "m@x.com" }); findOsUser.mockResolvedValue({ email: "m@x.com", role: "MARKETING", active: true });
    const r = await ADMIN(new NextRequest("https://x.test/api/intel/admin", { method: "POST", body: JSON.stringify({ action: "run_retention" }) }), { params: Promise.resolve({}) });
    expect(r.status).toBe(403);
  });
  it("an authorised export returns a CSV with BOM and a no-store header", async () => {
    getAdminSession.mockResolvedValue({ email: "m@x.com" }); findOsUser.mockResolvedValue({ email: "m@x.com", role: "MARKETING", active: true });
    const r = await exp();
    expect(r.status).toBe(200); expect(r.headers.get("content-type")).toMatch(/text\/csv/); expect(r.headers.get("cache-control")).toBe("no-store");
    const bytes = new Uint8Array(await r.arrayBuffer()); expect([...bytes.slice(0, 3)]).toEqual([0xef, 0xbb, 0xbf]); expect(new TextDecoder().decode(bytes)).toContain("path,views");
  });
  it("unknown reports are rejected", async () => {
    getAdminSession.mockResolvedValue({ email: "m@x.com" }); findOsUser.mockResolvedValue({ email: "m@x.com", role: "MARKETING", active: true });
    expect((await EXPORT(new NextRequest("https://x.test/api/intel/export?report=users_dump"))).status).toBe(400);
  });
  it("RBAC matrix", () => {
    for (const role of ["SUPER_ADMIN", "CEO", "EXECUTIVE", "MANAGER", "SALES", "MARKETING", "ENGINEERING"] as const) expect(can(role, "analytics.read")).toBe(true);
    for (const role of ["SUPPORT", "FINANCE", "VIEWER"] as const) expect(can(role, "analytics.read")).toBe(false);
    for (const role of ["SUPER_ADMIN", "CEO", "EXECUTIVE"] as const) expect(can(role, "analytics.manage")).toBe(true);
    for (const role of ["MANAGER", "SALES", "MARKETING", "ENGINEERING", "VIEWER"] as const) expect(can(role, "analytics.manage")).toBe(false);
  });
});
