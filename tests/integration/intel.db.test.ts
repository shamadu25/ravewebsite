/** @jest-environment node */
/*
 * Real-database integration test for RaveSoft Intelligence. SKIPPED unless INTEL_TEST_DATABASE_URL points at a SCRATCH
 * MySQL/MariaDB database whose schema was pushed (`DATABASE_URL=… npx prisma db push`). It DELETES all analytics_* rows.
 *   INTEL_TEST_DATABASE_URL=mysql://u:p@127.0.0.1:3307/rave npx jest tests/integration
 */
const URL_ = process.env.INTEL_TEST_DATABASE_URL;
const d = URL_ ? describe : describe.skip;
if (URL_) process.env.DATABASE_URL = URL_;

/* eslint-disable @typescript-eslint/no-require-imports */
d("RaveSoft Intelligence on a real database", () => {
  const prisma = URL_ ? require("@/lib/prisma").prisma : null;
  const { ingest } = URL_ ? require("@/lib/analytics/collect") : ({} as never);
  const { recordLeadConversion, recordFormFailure } = URL_ ? require("@/lib/analytics/lead") : ({} as never);
  const Q = URL_ ? require("@/lib/analytics/queries") : ({} as never);
  const { parseFilters } = URL_ ? require("@/lib/analytics/filters") : ({} as never);
  const { runFunnel, DEFAULT_FUNNEL } = URL_ ? require("@/lib/analytics/funnels") : ({} as never);
  const { buildReport, REPORTS } = URL_ ? require("@/lib/analytics/reports") : ({} as never);
  const { runRetention, evaluateAlerts, deleteVisitorData } = URL_ ? require("@/lib/analytics/maintenance") : ({} as never);
  const { geoFromHeaders } = URL_ ? require("@/lib/analytics/classify") : ({} as never);

  const UA = (m: boolean) => (m ? "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 Version/17.5 Mobile/15E148 Safari/604.1" : "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36");
  const NOW = new Date();
  const ago = (s: number) => new Date(NOW.getTime() - s * 1000);
  let n = 0;
  const id = (p: string) => `${p}${String(++n).padStart(10, "0")}`;

  async function visit(o: { vid: string; sid: string; at: Date; cc: string; mobile?: boolean; qs?: Record<string, string>; referrer?: string; pages: string[]; events?: Array<{ type: string; path?: string; props?: Record<string, unknown> }>; engaged?: number }) {
    const geo = geoFromHeaders((h: string) => ({ "x-vercel-ip-country": o.cc, "x-vercel-ip-city": "Accra" } as Record<string, string>)[h] ?? null);
    const m = { userAgent: UA(!!o.mobile), geo, ownHosts: ["ravesoftsolutions.com"], excludedPaths: ["/pay", "/admin"] };
    let t = o.at;
    for (let i = 0; i < o.pages.length; i++) {
      const pv = id("pv_");
      await ingest({ v: 1, vid: o.vid, sid: o.sid, ctx: { path: o.pages[i], title: o.pages[i], referrer: o.referrer, qs: o.qs ?? {}, tz: "Africa/Accra" }, events: [{ id: id("ev_"), type: "page_view", path: o.pages[i], pv, t: t.getTime() }] }, { ...m, now: t });
      t = new Date(t.getTime() + 20_000);
      await ingest({ v: 1, vid: o.vid, sid: o.sid, events: [{ id: id("ev_"), type: "engagement_heartbeat", pv, props: { eng: Math.floor((o.engaged ?? 15) / o.pages.length), el: 19, scroll: 50 } }, { id: id("ev_"), type: "scroll", path: o.pages[i], pv, props: { depth: 50 } }] }, { ...m, now: t });
    }
    if (o.events?.length) await ingest({ v: 1, vid: o.vid, sid: o.sid, events: o.events.map((e) => ({ id: id("ev_"), type: e.type, path: e.path ?? o.pages[o.pages.length - 1], props: e.props })) }, { ...m, now: t });
  }

  beforeAll(async () => {
    for (const t of ["analytics_events", "analytics_pageviews", "analytics_conversions", "analytics_sessions", "analytics_visitors", "analytics_daily_summaries", "analytics_ad_spend"]) await prisma.$executeRawUnsafe(`DELETE FROM ${t}`);
    await prisma.osAlert.deleteMany({ where: { category: "analytics" } });
    const fb = { utm_source: "facebook", utm_medium: "paid_social", utm_campaign: "cliqpos_nov", fbclid: "IwAR12345678" };
    // A: Ghana, mobile, paid social → full funnel → lead
    await visit({ vid: "visitor_A0000001", sid: "session_A0000001", at: ago(3600), cc: "GH", mobile: true, qs: fb, pages: ["/get-started", "/products/cliqpos", "/contact"], engaged: 45,
      events: [{ type: "cta_click", props: { label: "Get a quote" } }, { type: "form_start", props: { form: "lead" } }, { type: "form_submit_attempt" }] });
    await recordLeadConversion({ leadId: 9001, contactId: 1, ids: { vid: "visitor_A0000001", sid: "session_A0000001" }, page: "/contact", service: "CliqPOS", now: ago(3500) });
    // B: Nigeria, desktop, organic → bounce
    await visit({ vid: "visitor_B0000002", sid: "session_B0000002", at: ago(7200), cc: "NG", referrer: "https://www.google.com/", pages: ["/"], engaged: 2 });
    // C: Ghana desktop direct → product pages, JS error + failed request + vitals
    await visit({ vid: "visitor_C0000003", sid: "session_C0000003", at: ago(1800), cc: "GH", pages: ["/", "/services/pos-erp", "/pricing"], engaged: 60,
      events: [{ type: "js_error", props: { err: "x is undefined", src: "/_next/a.js", line: 3 } }, { type: "request_failed", props: { url: "/api/contact", status: 500, ms: 900 } }, { type: "web_vital", props: { metric: "LCP", val: 2100 } }, { type: "web_vital", props: { metric: "CLS", val: 0.04 } }, { type: "web_vital", props: { metric: "INP", val: 180 } }] });
    // A returns later (new session) via organic → returning visitor, first touch must stay paid_social
    await visit({ vid: "visitor_A0000001", sid: "session_A0000009", at: ago(600), cc: "GH", mobile: true, referrer: "https://www.google.com/", pages: ["/about"], engaged: 12 });
    await recordFormFailure({ vid: "visitor_C0000003", sid: "session_C0000003" }, "/contact", "guard_rate_limited");
    await prisma.analyticsAdSpend.create({ data: { day: new Date(NOW.toISOString().slice(0, 10)), channel: "paid_social", campaign: "cliqpos_nov", amountCents: 5000, source: "manual" } });
  });
  afterAll(async () => { await prisma.$disconnect(); });

  const f = () => parseFilters({ range: "7d" });

  it("overview KPIs are computed from the stored rows", async () => {
    const o = await Q.overview(f());
    expect(o.cur).toMatchObject({ sessions: 4, uniqueVisitors: 3, convertedSessions: 1, leadsAttributed: 1, newVisitors: 3, returningVisitors: 1 });
    expect(o.cur.pageViews).toBe(8);
    expect(o.cur.conversionRate).toBe(25);
    expect(o.cur.bounceRate).toBe(25); // only B is a bounce (1 page, 2 s); A converted, C is multi-page, A's return has 12 s engaged
  });
  it("first touch persists, last touch follows", async () => {
    const v = await prisma.analyticsVisitor.findUnique({ where: { visitorId: "visitor_A0000001" } });
    expect(v).toMatchObject({ ftChannel: "paid_social", ftCampaign: "cliqpos_nov", sessionCount: 2, leadCount: 1 });
    const c = await prisma.analyticsConversion.findUnique({ where: { leadId: 9001 } });
    expect(c).toMatchObject({ ftChannel: "paid_social", ltChannel: "paid_social", ltCampaign: "cliqpos_nov", countryCode: "GH", device: "mobile", service: "CliqPOS", attributed: true, previousVisits: 0 });
  });
  it("conversion idempotency holds in MySQL under concurrency", async () => {
    await Promise.all([1, 2, 3, 4].map(() => recordLeadConversion({ leadId: 9001, ids: { vid: "visitor_A0000001", sid: "session_A0000001" } })));
    expect(await prisma.analyticsConversion.count({ where: { leadId: 9001 } })).toBe(1);
    expect(await prisma.analyticsEvent.count({ where: { type: "lead_created" } })).toBe(1);
  });
  it("trend, breakdowns and filters", async () => {
    const t = await Q.trend(f());
    expect(t.reduce((a: number, p: { sessions: number }) => a + p.sessions, 0)).toBe(4);
    expect(t.reduce((a: number, p: { leads: number }) => a + p.leads, 0)).toBe(1);
    const ch = await Q.byChannel(f());
    expect(Object.fromEntries(ch.map((r: { key: string; sessions: number }) => [r.key, r.sessions]))).toEqual({ paid_social: 1, organic_search: 2, direct: 1 });
    expect(ch.find((r: { key: string }) => r.key === "paid_social").leads).toBe(1);
    const co = await Q.byCountry(f());
    expect(co.find((r: { key: string }) => r.key === "GH")).toMatchObject({ sessions: 3, leads: 1 });
    const gh = await Q.overview(parseFilters({ range: "7d", country: "NG" }));
    expect(gh.cur.sessions).toBe(1);
    expect((await Q.overview(parseFilters({ range: "7d", device: "mobile" }))).cur.sessions).toBe(2);
    expect((await Q.overview(parseFilters({ range: "7d", channel: "paid_social" }))).cur.sessions).toBe(1);
    expect((await Q.overview(parseFilters({ range: "7d", campaign: "cliqpos_nov" }))).cur.sessions).toBe(1);
    expect((await Q.byDevice(f())).length).toBe(2);
    expect((await Q.regionsAndCities(f())).cities[0].name).toBe("Accra");
  });
  it("campaign matrix joins entered spend → cost per lead", async () => {
    const [c] = await Q.campaignMatrix(f());
    expect(c).toMatchObject({ campaign: "cliqpos_nov", sessions: 1, leads: 1, spendCents: 5000, costPerLeadCents: 5000 });
  });
  it("page analytics", async () => {
    const p = await Q.pageStats(f());
    const home = p.find((r: { path: string }) => r.path === "/");
    expect(home).toMatchObject({ views: 2, sessions: 2 });
    const contact = p.find((r: { path: string }) => r.path === "/contact");
    expect(contact).toMatchObject({ views: 1, leadsAssisted: 1, formStarts: 1, ctaClicks: 1, exitRate: 100 });
    expect(p[0].avgScroll).toBeGreaterThan(0);
  });
  it("sessions list, timeline, live and behaviour queries", async () => {
    const l = await Q.sessionList(f(), 1, 2);
    expect(l.total).toBe(4); expect(l.rows).toHaveLength(2);
    const tl = await Q.sessionTimeline("session_A0000001");
    expect(tl.events.map((e: { type: string }) => e.type)).toEqual(expect.arrayContaining(["page_view", "cta_click", "form_start", "lead_created", "contact_page_view", "product_view"]));
    expect(tl.conversion.leadId).toBe(9001);
    expect(await Q.liveCount()).toBe(0); // all test sessions ended > 5 min ago… except the returning one below
    const b = await Q.behaviour(f());
    expect(b.transitions.length).toBeGreaterThan(0); expect(b.journeys.length).toBe(1);
  });
  it("lead attribution view", async () => {
    const a = await Q.leadAttribution(f(), 1);
    expect(a.total).toBe(1); expect(a.firstTouch).toEqual([{ key: "paid_social", n: 1 }]);
  });
  it("funnel: ordered, distinct visitors, backend-confirmed final step", async () => {
    const r = await runFunnel(f(), DEFAULT_FUNNEL);
    expect(r.steps.map((s: { visitors: number }) => s.visitors)).toEqual([3, 2, 1, 1, 1]);
    expect(r.conversionRate).toBeCloseTo(33.3, 1);
    expect(r.steps[1].dropOffPct).toBeCloseTo(33.3, 1);
    const custom = await runFunnel(f(), { id: "x", name: "pricing→form", steps: [{ label: "p", kind: "path", value: "/pricing" }, { label: "f", kind: "event", value: "form_start" }] });
    expect(custom.steps.map((s: { visitors: number }) => s.visitors)).toEqual([1, 0]);
  });
  it("performance and technical monitoring", async () => {
    const v = await Q.vitals(f());
    expect(v.overall.find((o: { metric: string }) => o.metric === "LCP")).toMatchObject({ p75: 2100, samples: 1 });
    const t = await Q.technical(f());
    expect(t.errors[0]).toMatchObject({ err: "x is undefined", n: 1 }); expect(t.failed[0]).toMatchObject({ url: "/api/contact", status: "500" });
    expect(t.formFailures[0]).toMatchObject({ reason: "guard_rate_limited", n: 1 }); expect(t.attempts).toBe(1);
  });
  it("every report builds and exports from stored data", async () => {
    for (const r of REPORTS) { const rows = await buildReport(r.id, f()); expect(Array.isArray(rows)).toBe(true); }
    const attr = await buildReport("lead-attribution", f());
    expect(attr).toHaveLength(1); expect(JSON.stringify(attr)).not.toMatch(/@|phone|email/i);
    expect((await buildReport("geographic", f())).find((r: Record<string, unknown>) => r.country_code === "GH")).toMatchObject({ sessions: 3, leads: 1 });
  });
  it("alerts run cleanly (no false alarms on tiny baselines)", async () => {
    const r = await evaluateAlerts(NOW);
    expect(r.raised).toEqual([]);
  });
  it("retention rolls old days into summaries before purging, keeps recent data", async () => {
    const old = new Date(NOW.getTime() - 400 * 86_400_000);
    await visit({ vid: "visitor_OLD00001", sid: "session_OLD00001", at: old, cc: "KE", pages: ["/old"], engaged: 20 });
    const before = await prisma.analyticsSession.count();
    const r = await runRetention(NOW);
    expect(r.deleted).toBeGreaterThan(0);
    expect(await prisma.analyticsSession.count()).toBe(before - 1);
    const sum = await prisma.analyticsDailySummary.findFirst({ where: { countryCode: "KE" } });
    expect(sum).toMatchObject({ sessions: 1, pageViews: 1 });
    const again = await runRetention(NOW); // idempotent
    expect(again.deleted).toBe(0);
    expect(await prisma.analyticsDailySummary.count({ where: { countryCode: "KE" } })).toBe(1);
    expect((await Q.overview(f())).cur.sessions).toBe(4);
  });
  it("data deletion removes a visitor's rows but keeps the lead conversion (de-identified)", async () => {
    expect((await deleteVisitorData("visitor_A0000001", "test")).deleted).toBe(true);
    expect(await prisma.analyticsSession.count({ where: { sessionId: { in: ["session_A0000001", "session_A0000009"] } } })).toBe(0);
    const c = await prisma.analyticsConversion.findUnique({ where: { leadId: 9001 } });
    expect(c).toMatchObject({ visitorId: null, sessionId: null, visitorRef: null });
  });
});
