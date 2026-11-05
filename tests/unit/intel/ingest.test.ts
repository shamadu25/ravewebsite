/** @jest-environment node */
import { makeDb } from "./fakeDb";

let db = makeDb();
jest.mock("@/lib/prisma", () => ({ get prisma() { return db; } }));

import { ingest, type RequestMeta } from "@/lib/analytics/collect";
import { recordLeadConversion, readTrackingIds, safeRecordLeadConversion } from "@/lib/analytics/lead";
import { geoFromHeaders } from "@/lib/analytics/classify";
import type { CollectPayload } from "@/lib/analytics/schema";

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";
const T0 = new Date("2026-11-05T10:00:00.000Z");
const at = (sec: number) => new Date(T0.getTime() + sec * 1000);
const meta = (now: Date, extra: Partial<RequestMeta> = {}): RequestMeta => ({ userAgent: UA, geo: geoFromHeaders((n) => ({ "x-vercel-ip-country": "GH", "x-vercel-ip-city": "Accra" } as Record<string, string>)[n] ?? null), ownHosts: ["ravesoftsolutions.com"], excludedPaths: ["/pay", "/admin"], now, ...extra });
let n = 0;
const ev = (type: string, o: Record<string, unknown> = {}) => ({ id: `evt_${String(++n).padStart(10, "0")}`, type, ...o });
const batch = (events: ReturnType<typeof ev>[], o: Partial<CollectPayload> = {}): CollectPayload => ({ v: 1, vid: "visitor_AAAA1111", sid: "session_AAAA1111", ctx: { path: "/", title: "Home", referrer: "", qs: {} }, events: events as never, ...o });
const pvEvent = (pv: string, path = "/", t?: number) => ev("page_view", { pv, path, t });

beforeEach(() => { db = makeDb(); n = 0; });

describe("visitor and session tracking", () => {
  it("creates a new visitor, session and page view on first visit", async () => {
    const r = await ingest(batch([pvEvent("pv_00000001")]), meta(at(0)));
    expect(r).toMatchObject({ accepted: 1, newSession: true, sid: "session_AAAA1111" });
    expect(db.analyticsVisitor.rows).toHaveLength(1);
    expect(db.analyticsSession.rows[0]).toMatchObject({ isNewVisitor: true, visitNumber: 1, pageViews: 1, landingPage: "/", countryCode: "GH", city: "Accra", geoSource: "edge_headers", device: "desktop", browser: "Chrome", os: "Windows" });
    expect(db.analyticsPageview.rows).toHaveLength(1);
  });

  it("continues the same session within 30 minutes (no new session, no new visitor)", async () => {
    await ingest(batch([pvEvent("pv_00000001")]), meta(at(0)));
    const r = await ingest(batch([pvEvent("pv_00000002", "/products/cliqpos")]), meta(at(25 * 60)));
    expect(r.newSession).toBe(false);
    expect(db.analyticsSession.rows).toHaveLength(1);
    expect(db.analyticsSession.rows[0]).toMatchObject({ pageViews: 2, exitPage: "/products/cliqpos" });
    expect(db.analyticsVisitor.rows[0].sessionCount).toBe(1);
  });

  it("expires a session after 30 minutes of inactivity and returns the new session id", async () => {
    await ingest(batch([pvEvent("pv_00000001")]), meta(at(0)));
    const r = await ingest(batch([pvEvent("pv_00000002", "/about")]), meta(at(31 * 60)));
    expect(r.newSession).toBe(true);
    expect(r.sid).not.toBe("session_AAAA1111");
    expect(db.analyticsSession.rows).toHaveLength(2);
  });

  it("recognises a returning visitor and counts previous visits", async () => {
    await ingest(batch([pvEvent("pv_00000001")]), meta(at(0)));
    await ingest(batch([pvEvent("pv_00000002")], { sid: "session_BBBB2222" }), meta(at(3 * 86400)));
    const s2 = db.analyticsSession.rows[1];
    expect(db.analyticsVisitor.rows).toHaveLength(1);
    expect(s2).toMatchObject({ isNewVisitor: false, visitNumber: 2 });
    expect(db.analyticsVisitor.rows[0].sessionCount).toBe(2);
  });

  it("does not let one visitor hijack another visitor's session id", async () => {
    await ingest(batch([pvEvent("pv_00000001")]), meta(at(0)));
    const r = await ingest(batch([pvEvent("pv_00000009")], { vid: "visitor_ZZZZ9999" }), meta(at(10)));
    expect(r.sid).not.toBe("session_AAAA1111");
    expect(db.analyticsVisitor.rows).toHaveLength(2);
  });

  it("never tracks excluded paths", async () => {
    const r = await ingest(batch([pvEvent("pv_00000001", "/pay/abc123token")]), meta(at(0)));
    expect(r.accepted).toBe(0);
    expect(db.analyticsEvent.rows).toHaveLength(0);
  });
});

describe("attribution capture", () => {
  const land = (qs: Record<string, string>, referrer = "") => batch([pvEvent("pv_00000001", "/get-started")], { ctx: { path: "/get-started", referrer, qs, title: "Get started" } });
  it("direct", async () => { await ingest(land({}), meta(at(0))); expect(db.analyticsSession.rows[0].channel).toBe("direct"); });
  it("organic search", async () => { await ingest(land({}, "https://www.google.com/search?q=pos+ghana"), meta(at(0))); expect(db.analyticsSession.rows[0]).toMatchObject({ channel: "organic_search", referrerDomain: "google.com", referrer: "https://www.google.com/search" }); });
  it("paid search via gclid", async () => { await ingest(land({ gclid: "Cj0KCQabc123" }), meta(at(0))); expect(db.analyticsSession.rows[0]).toMatchObject({ channel: "paid_search", clickIdType: "gclid" }); });
  it("social", async () => { await ingest(land({}, "https://l.facebook.com/"), meta(at(0))); expect(db.analyticsSession.rows[0].channel).toBe("social"); });
  it("referral", async () => { await ingest(land({}, "https://partner-blog.com/post"), meta(at(0))); expect(db.analyticsSession.rows[0].channel).toBe("referral"); });
  it("captures UTM campaign data and a clean landing URL", async () => {
    await ingest(land({ utm_source: "facebook", utm_medium: "paid_social", utm_campaign: "cliqpos_nov", utm_content: "video1", utm_term: "pos", fbclid: "IwAR123456", junk: "x" }), meta(at(0)));
    expect(db.analyticsSession.rows[0]).toMatchObject({ channel: "paid_social", utmSource: "facebook", utmMedium: "paid_social", utmCampaign: "cliqpos_nov", utmContent: "video1", utmTerm: "pos", clickIdType: "fbclid" });
    expect(db.analyticsSession.rows[0].landingPage).toBe("/get-started?utm_source=facebook&utm_medium=paid_social&utm_campaign=cliqpos_nov&utm_content=video1&utm_term=pos");
  });
  it("preserves first-touch forever and records last-touch per session", async () => {
    await ingest(land({ utm_source: "facebook", utm_medium: "paid_social", utm_campaign: "first_camp" }), meta(at(0)));
    await ingest(batch([pvEvent("pv_00000002", "/")], { sid: "session_BBBB2222", ctx: { path: "/", referrer: "https://www.google.com/", qs: {} } }), meta(at(2 * 86400)));
    await ingest(batch([pvEvent("pv_00000003", "/")], { sid: "session_CCCC3333", ctx: { path: "/", qs: { utm_source: "newsletter", utm_medium: "email", utm_campaign: "last_camp" } } }), meta(at(5 * 86400)));
    const v = db.analyticsVisitor.rows[0];
    expect(v).toMatchObject({ ftChannel: "paid_social", ftCampaign: "first_camp" });
    expect(db.analyticsSession.rows.map((s) => s.channel)).toEqual(["paid_social", "organic_search", "email"]);
    expect(db.analyticsSession.rows[2].utmCampaign).toBe("last_camp");
  });
});

describe("engagement and idempotency", () => {
  it("replaying the same batch (network retry) creates no duplicates and no extra counts", async () => {
    const b = batch([pvEvent("pv_00000001"), ev("cta_click", { path: "/", props: { label: "Get a quote" } })]);
    await ingest(b, meta(at(0)));
    const r = await ingest(b, meta(at(1)));
    expect(r.duplicates).toBe(2);
    expect(db.analyticsEvent.rows.filter((e) => e.type === "cta_click")).toHaveLength(1);
    expect(db.analyticsSession.rows[0].pageViews).toBe(1);
  });

  it("heartbeats are cumulative: retries add nothing, active time never exceeds elapsed time", async () => {
    await ingest(batch([pvEvent("pv_00000001")]), meta(at(0)));
    const hb = (eng: number, el: number) => batch([ev("engagement_heartbeat", { pv: "pv_00000001", props: { eng, el, scroll: 50 } })]);
    await ingest(hb(14, 15), meta(at(15)));
    await ingest(hb(14, 15), meta(at(16)));
    expect(db.analyticsSession.rows[0].engagedSeconds).toBe(14);
    await ingest(hb(29, 30), meta(at(30)));
    expect(db.analyticsSession.rows[0].engagedSeconds).toBe(29);
    await ingest(hb(9999, 9999), meta(at(31))); // forged huge value is capped by real elapsed time
    expect(db.analyticsSession.rows[0].engagedSeconds).toBeLessThanOrEqual(36);
    expect(db.analyticsPageview.rows[0].elapsedSeconds).toBeLessThanOrEqual(36);
    expect(db.analyticsPageview.rows[0].maxScroll).toBe(50);
  });

  it("a hidden tab that sends no heartbeats earns no engagement", async () => {
    await ingest(batch([pvEvent("pv_00000001")]), meta(at(0)));
    await ingest(batch([ev("cta_click", { path: "/" })]), meta(at(1800)));
    expect(db.analyticsSession.rows[0].engagedSeconds).toBe(0);
  });

  it("page_exit marks the exit page; scroll milestones keep the maximum", async () => {
    await ingest(batch([pvEvent("pv_00000001", "/pricing")]), meta(at(0)));
    await ingest(batch([ev("scroll", { pv: "pv_00000001", path: "/pricing", props: { depth: 25 } }), ev("scroll", { pv: "pv_00000001", path: "/pricing", props: { depth: 90 } }), ev("scroll", { pv: "pv_00000001", path: "/pricing", props: { depth: 50 } })]), meta(at(5)));
    await ingest(batch([ev("page_exit", { pv: "pv_00000001", props: { eng: 4, el: 6, scroll: 90 } })]), meta(at(7)));
    expect(db.analyticsPageview.rows[0]).toMatchObject({ maxScroll: 90, isExit: true, engagedSeconds: 4 });
    expect(db.analyticsSession.rows[0].exitPage).toBe("/pricing");
  });

  it("derives intent events (pricing/product/contact) from the path", async () => {
    await ingest(batch([pvEvent("pv_00000001", "/pricing"), pvEvent("pv_00000002", "/products/cliqpos"), pvEvent("pv_00000003", "/contact")]), meta(at(0)));
    expect(db.analyticsEvent.rows.map((e) => e.type)).toEqual(expect.arrayContaining(["pricing_view", "product_view", "contact_page_view"]));
  });

  it("silently discards server-only events sent by a browser", async () => {
    const r = await ingest(batch([pvEvent("pv_00000001"), ev("lead_created", { path: "/contact" }), ev("form_submit_success", {})]), meta(at(0)));
    expect(r.accepted).toBe(1);
    expect(db.analyticsEvent.rows.some((e) => e.type === "lead_created")).toBe(false);
  });

  it("stores no sensitive values even if a browser sends them", async () => {
    await ingest(batch([pvEvent("pv_00000001"), ev("form_field_interaction", { path: "/contact", props: { form: "contact", field: "email", email: "a@b.com", value: "secret", password: "x" } })]), meta(at(0)));
    const e = db.analyticsEvent.rows.find((x) => x.type === "form_field_interaction")!;
    expect(JSON.stringify(e.props)).not.toMatch(/a@b\.com|secret|"password"/);
    expect(e.props).toEqual({ form: "contact", field: "email" });
  });

  it("falls back to a labelled time-zone estimate when the host gives no geo headers", async () => {
    await ingest(batch([pvEvent("pv_00000001")], { ctx: { path: "/", tz: "Africa/Nairobi", qs: {} } }), meta(at(0), { geo: geoFromHeaders(() => null, "Africa/Nairobi") }));
    expect(db.analyticsSession.rows[0]).toMatchObject({ countryCode: "KE", geoSource: "timezone_estimate", city: null });
  });
});

describe("lead attribution (conversion recorded only by the server)", () => {
  const ids = { vid: "visitor_AAAA1111", sid: "session_AAAA1111" };
  async function journey() {
    await ingest(batch([pvEvent("pv_00000001", "/get-started")], { ctx: { path: "/get-started", qs: { utm_source: "facebook", utm_medium: "paid_social", utm_campaign: "cliqpos_nov" }, referrer: "" } }), meta(at(0)));
    await ingest(batch([ev("engagement_heartbeat", { pv: "pv_00000001", props: { eng: 20, el: 25, scroll: 50 } })]), meta(at(25)));
  }

  it("links the lead to visitor and session with first/last touch, country, device, engagement and service", async () => {
    await journey();
    const c = await recordLeadConversion({ leadId: 42, contactId: 7, ids, page: "/get-started?utm_source=x", service: "CliqPOS", now: at(60) });
    expect(c).toMatchObject({ leadId: 42, contactId: 7, visitorId: ids.vid, sessionId: ids.sid, attributed: true, ftChannel: "paid_social", ftCampaign: "cliqpos_nov", ltChannel: "paid_social", ltCampaign: "cliqpos_nov", countryCode: "GH", device: "desktop", pagesVisited: 1, previousVisits: 0, engagedSecondsBefore: 20, service: "CliqPOS", conversionPage: "/get-started", landingPage: expect.stringContaining("/get-started") });
    expect(db.analyticsSession.rows[0]).toMatchObject({ converted: true, leadId: 42 });
    expect(db.analyticsVisitor.rows[0].leadCount).toBe(1);
    expect(db.analyticsEvent.rows.filter((e) => e.type === "lead_created")).toHaveLength(1);
  });

  it("is idempotent: retries and duplicate hook calls never create a second conversion", async () => {
    await journey();
    await recordLeadConversion({ leadId: 42, ids, now: at(60) });
    await recordLeadConversion({ leadId: 42, ids, now: at(61) });
    await Promise.all([recordLeadConversion({ leadId: 42, ids }), recordLeadConversion({ leadId: 42, ids })]);
    expect(db.analyticsConversion.rows).toHaveLength(1);
    expect(db.analyticsVisitor.rows[0].leadCount).toBe(1);
    expect(db.analyticsEvent.rows.filter((e) => e.type === "lead_created")).toHaveLength(1);
  });

  it("uses the latest non-direct touch inside the window when the converting session was direct; first-touch stays", async () => {
    await journey();
    await ingest(batch([pvEvent("pv_00000002", "/contact")], { sid: "session_BBBB2222", ctx: { path: "/contact", qs: {}, referrer: "" } }), meta(at(3 * 86400)));
    const c = await recordLeadConversion({ leadId: 43, ids: { vid: ids.vid, sid: "session_BBBB2222" }, now: at(3 * 86400 + 90) });
    expect(c).toMatchObject({ ftChannel: "paid_social", ltChannel: "paid_social", ltCampaign: "cliqpos_nov", previousVisits: 1 });
  });

  it("outside the attribution window the direct session stays direct", async () => {
    await journey();
    await ingest(batch([pvEvent("pv_00000002", "/contact")], { sid: "session_BBBB2222", ctx: { path: "/contact", qs: {}, referrer: "" } }), meta(at(120 * 86400)));
    const c = await recordLeadConversion({ leadId: 44, ids: { vid: ids.vid, sid: "session_BBBB2222" }, now: at(120 * 86400 + 60) });
    expect(c).toMatchObject({ ftChannel: "paid_social", ltChannel: "direct" });
  });

  it("still records the lead (unattributed) when the visitor was not tracked", async () => {
    const c = await recordLeadConversion({ leadId: 50, ids: { vid: null, sid: null }, page: "/contact", now: at(0) });
    expect(c).toMatchObject({ leadId: 50, attributed: false, visitorId: null, conversionPage: "/contact" });
  });

  it("reads ids from cookies and rejects malformed ones", () => {
    const req = (cookie: string) => new Request("https://x.test/api/contact", { headers: { cookie } });
    expect(readTrackingIds(req("a=1; rs_vid=visitor_AAAA1111; rs_sid=session_AAAA1111"))).toEqual(ids);
    expect(readTrackingIds(req("rs_vid=bad'id; rs_sid=x"))).toEqual({ vid: null, sid: null });
  });

  it("analytics failure is swallowed — it can never break the enquiry flow", async () => {
    const spy = jest.spyOn(console, "error").mockImplementation(() => undefined);
    const orig = db.analyticsConversion.findUnique;
    db.analyticsConversion.findUnique = async () => { throw new Error("db down"); };
    await expect(safeRecordLeadConversion({ leadId: 1, ids })).resolves.toBeUndefined();
    db.analyticsConversion.findUnique = orig;
    spy.mockRestore();
  });
});
