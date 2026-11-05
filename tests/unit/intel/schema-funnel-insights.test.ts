/** @jest-environment node */
import { CollectSchema, SERVER_ONLY_EVENTS, cleanProps, campaignParams } from "@/lib/analytics/schema";
import { allowedType } from "@/lib/analytics/collect";
import { computeFunnel, sanitizeFunnel } from "@/lib/analytics/funnels";
import { buildInsights } from "@/lib/analytics/insights";
import { sanitizeSettings, DEFAULT_SETTINGS } from "@/lib/analytics/settings";
import { percentile, rateVital } from "@/lib/analytics/queries";
import { toCsv } from "@/lib/os/csv";

const base = { v: 1, vid: "vis_12345678", sid: "ses_12345678", events: [{ id: "evt_12345678", type: "page_view" }] };
describe("event payload validation", () => {
  it("accepts a valid payload", () => expect(CollectSchema.safeParse(base).success).toBe(true));
  it.each([
    ["bad version", { ...base, v: 2 }], ["short visitor id", { ...base, vid: "x" }], ["id with unsafe chars", { ...base, vid: "a'b\"c<script>" }], ["no events", { ...base, events: [] }],
    ["30 events", { ...base, events: Array.from({ length: 30 }, (_, i) => ({ id: `evt_${String(i).padStart(8, "0")}`, type: "click" })) }], ["bad event type", { ...base, events: [{ id: "evt_12345678", type: "DROP TABLE" }] }],
  ])("rejects %s", (_n, p) => expect(CollectSchema.safeParse(p).success).toBe(false));
  it("the browser cannot claim server-confirmed outcomes", () => {
    for (const t of ["lead_created", "form_submit_success", "form_submit_failure", "session_end"]) { expect(SERVER_ONLY_EVENTS.has(t)).toBe(true); expect(allowedType(t)).toBe(false); }
    expect(allowedType("cta_click")).toBe(true); expect(allowedType("custom_demo_watched")).toBe(true); expect(allowedType("made_up")).toBe(false);
  });
  it("only whitelisted campaign params survive", () => expect(campaignParams({ utm_source: "x", password: "hunter2", gclid: "abc" })).toEqual({ utm_source: "x", gclid: "abc" }));
});

describe("sensitive input masking", () => {
  it("drops keys that could hold personal or sensitive values, keeps benign metadata", () => {
    const p = cleanProps({ email: "a@b.c", phone: "0244", message: "hi", password: "x", card_number: "4111", value: "secret", fullName: "A B", token: "t", label: "Get a quote", form: "contact", depth: 50, field: "email", ok: true });
    expect(p).toEqual({ label: "Get a quote", form: "contact", depth: 50, field: "email", ok: true });
  });
  it("rejects non-object props and invalid keys", () => { expect(cleanProps("x")).toBeUndefined(); expect(cleanProps([1])).toBeUndefined(); expect(cleanProps({ "bad key!": 1 })).toBeUndefined(); });
  it("truncates long strings", () => expect((cleanProps({ label: "x".repeat(500) })!.label as string).length).toBe(120));
});

describe("funnel maths", () => {
  const t = (o: Record<number, number[]>) => new Map(Object.entries(o).map(([k, v]) => [Number(k), v]));
  it("counts distinct visitors, enforces order, reports drop-off and time between stages", () => {
    const r = computeFunnel(["visit", "product", "contact", "form", "lead"], [
      t({ 1: [100], 2: [100], 3: [100], 4: [100] }),
      t({ 1: [160], 2: [90], 3: [200] }), // visitor 2 saw product BEFORE visiting → does not count
      t({ 1: [220], 3: [260] }),
      t({ 1: [300, 305] }),
      t({ 1: [400] }),
    ]);
    expect(r.steps.map((s) => s.visitors)).toEqual([4, 2, 2, 1, 1]);
    expect(r.steps[1]).toMatchObject({ pctOfFirst: 50, pctOfPrevious: 50, dropOffPct: 50 });
    expect(r.steps[3].dropOffPct).toBe(50);
    expect(r.steps[1].medianSecondsFromPrevious).toBeGreaterThanOrEqual(60);
    expect(r.conversionRate).toBe(25);
  });
  it("never double counts a visitor with many events", () => expect(computeFunnel(["a", "b"], [t({ 1: [1, 2, 3, 4] }), t({ 1: [5, 6, 7] })]).steps.map((s) => s.visitors)).toEqual([1, 1]));
  it("handles empty data", () => expect(computeFunnel(["a", "b"], [new Map(), new Map()]).conversionRate).toBe(0));
  it("validates custom funnel definitions", () => {
    expect(sanitizeFunnel({ name: "Pricing", steps: [{ kind: "path", value: "/pricing" }, { kind: "event", value: "form_start" }] }).steps).toHaveLength(2);
    expect(() => sanitizeFunnel({ name: "", steps: [] })).toThrow(); expect(() => sanitizeFunnel({ name: "x", steps: [{ kind: "any_page" }] })).toThrow();
    expect(() => sanitizeFunnel({ name: "x", steps: [{ kind: "event", value: "a; DROP" }, { kind: "any_page" }] })).toThrow();
    expect(() => sanitizeFunnel({ name: "x", steps: [{ kind: "path", value: "pricing" }, { kind: "any_page" }] })).toThrow();
  });
});

describe("insights only from sufficient data", () => {
  const T = (o: Partial<Record<string, number>> = {}) => ({ sessions: 200, uniqueVisitors: 150, totalVisitors: 150, pageViews: 400, avgDuration: 60, avgEngagement: 30, pagesPerSession: 2, bounceRate: 40, newVisitors: 100, returningVisitors: 50, convertedSessions: 10, conversionRate: 5, leadsAttributed: 10, ...o });
  const row = (key: string, sessions: number, conv = 5) => ({ key, sessions, visitors: sessions, leads: 0, conversionRate: conv, avgEngagement: 10, pageViews: sessions, bounceRate: 10 });
  it("says nothing with too little data", () => expect(buildInsights({ cur: T({ sessions: 10 }), prev: T(), channels: [], prevChannels: [], pages: [], devices: [] })).toEqual([]));
  it("reports a real channel change as an observation", () => {
    const i = buildInsights({ cur: T(), prev: T(), channels: [row("organic_search", 122)], prevChannels: [row("organic_search", 100)], pages: [], devices: [] });
    expect(i[0]).toMatchObject({ kind: "observation" }); expect(i[0].text).toMatch(/Organic search traffic increased by 22%/);
  });
  it("ignores channels below the sample floor", () => expect(buildInsights({ cur: T(), prev: T(), channels: [row("email", 10)], prevChannels: [row("email", 2)], pages: [], devices: [] })).toEqual([]));
  it("labels inferences as estimates, separate from facts", () => {
    const pages = [{ path: "/products/cliqpos", title: null, views: 500, uniqueVisitors: 450, sessions: 450, avgEngagement: 20, avgElapsed: 30, avgScroll: 50, scroll50: 40, scroll90: 10, ctaClicks: 4, formStarts: 0, leadsAssisted: 8, exitRate: 50, conversionRate: 1.8 }];
    const i = buildInsights({ cur: T(), prev: T(), channels: [], prevChannels: [], pages: [{ ...pages[0], conversionRate: 1.1 }], devices: [] });
    expect(i.map((x) => x.kind)).toEqual(["observation", "recommendation"]); expect(i[1].text).toMatch(/Estimate/);
  });
  it("mobile vs desktop", () => expect(buildInsights({ cur: T(), prev: T(), channels: [], prevChannels: [], pages: [], devices: [row("mobile", 300, 1.5), row("desktop", 300, 4)] })[0].text).toMatch(/Mobile visitors have a lower conversion rate/));
});

describe("settings, vitals and csv", () => {
  it("settings are clamped to safe bounds", () => {
    const s = sanitizeSettings({ rawRetentionDays: 1, attributionWindowDays: 99999, consentMode: "weird" as never, excludedPaths: ["/a", "bad", 5] as never });
    expect(s.rawRetentionDays).toBe(7); expect(s.attributionWindowDays).toBe(365); expect(s.consentMode).toBe("opt_out"); expect(s.excludedPaths).toEqual(["/a"]);
    expect(DEFAULT_SETTINGS.excludedPaths).toEqual(expect.arrayContaining(["/pay", "/admin"]));
  });
  it("percentile + Core Web Vitals thresholds", () => {
    expect(percentile([1, 2, 3, 4, 100], 75)).toBe(4); expect(percentile([], 75)).toBeNull();
    expect(rateVital("LCP", 2000)).toBe("good"); expect(rateVital("LCP", 3000)).toBe("needs-improvement"); expect(rateVital("LCP", 5000)).toBe("poor"); expect(rateVital("CLS", 0.05)).toBe("good"); expect(rateVital("INP", null)).toBeNull();
  });
  it("CSV exports neutralise spreadsheet formulas", () => expect(toCsv([{ page: "=HYPERLINK(\"x\")", n: 1 }])).toContain("'=HYPERLINK"));
});
