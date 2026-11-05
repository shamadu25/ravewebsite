import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { conversionWhere, sessionWhere, type Filters } from "./filters";
import { dayKeys } from "./ranges";

export const num = (v: unknown): number => {
  if (v == null) return 0;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};
const rate = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 1000) / 10 : 0);
/** GA4-style: an "engaged session" lasts ≥10 s of active time, has ≥2 page views, or converts. A bounce is any other session. */
export const BOUNCE_SQL = Prisma.sql`CASE WHEN s.engaged_seconds >= 10 OR s.page_views >= 2 OR s.converted = 1 THEN 0 ELSE 1 END`;
const LIVE_WINDOW_MS = 5 * 60_000;

// ── Overview ─────────────────────────────────────────────────────────────────────────────────────
export interface Totals {
  sessions: number; uniqueVisitors: number; totalVisitors: number; pageViews: number; avgDuration: number; avgEngagement: number;
  pagesPerSession: number; bounceRate: number; newVisitors: number; returningVisitors: number; convertedSessions: number; conversionRate: number; leadsAttributed: number;
}

async function totalsFor(f: Filters, range: "cur" | "prev"): Promise<Totals> {
  const [r] = await prisma.$queryRaw<Array<Record<string, unknown>>>(Prisma.sql`
    SELECT COUNT(*) sessions, COUNT(DISTINCT s.visitor_ref) uniq, COUNT(DISTINCT s.visitor_ref, DATE(s.started_at)) total,
      COALESCE(SUM(s.page_views),0) pv, AVG(s.elapsed_seconds) avg_el, AVG(s.engaged_seconds) avg_eng, COALESCE(SUM(${BOUNCE_SQL}),0) bounces,
      COUNT(DISTINCT CASE WHEN s.is_new_visitor = 1 THEN s.visitor_ref END) new_v, COUNT(DISTINCT CASE WHEN s.is_new_visitor = 0 THEN s.visitor_ref END) ret_v,
      COALESCE(SUM(s.converted),0) conv
    FROM analytics_sessions s WHERE ${sessionWhere(f, "s", range)}`);
  const [l] = await prisma.$queryRaw<Array<{ n: unknown }>>(Prisma.sql`SELECT COUNT(*) n FROM analytics_conversions c WHERE ${conversionWhere(f, "c", range)}`);
  const sessions = num(r.sessions);
  return {
    sessions, uniqueVisitors: num(r.uniq), totalVisitors: num(r.total), pageViews: num(r.pv), avgDuration: Math.round(num(r.avg_el)), avgEngagement: Math.round(num(r.avg_eng)),
    pagesPerSession: sessions ? Math.round((num(r.pv) / sessions) * 100) / 100 : 0, bounceRate: rate(num(r.bounces), sessions),
    newVisitors: num(r.new_v), returningVisitors: num(r.ret_v), convertedSessions: num(r.conv), conversionRate: rate(num(r.conv), sessions), leadsAttributed: num(l.n),
  };
}

export async function liveCount(): Promise<number> {
  return prisma.analyticsSession.count({ where: { lastActivityAt: { gte: new Date(Date.now() - LIVE_WINDOW_MS) } } });
}

export async function overview(f: Filters) {
  const noDimension = !f.country && !f.channel && !f.campaign && !f.device;
  const [cur, prev, live, leadsTotal, leadsTotalPrev] = await Promise.all([
    totalsFor(f, "cur"), totalsFor(f, "prev"), liveCount(),
    // The existing leads table is authoritative for "Total Leads" (includes leads with no analytics context).
    noDimension ? prisma.lead.count({ where: { createdAt: { gte: f.from, lt: f.to } } }) : Promise.resolve(null),
    noDimension ? prisma.lead.count({ where: { createdAt: { gte: f.prevFrom, lt: f.prevTo } } }) : Promise.resolve(null),
  ]);
  return { cur, prev, live, leadsTotal, leadsTotalPrev };
}

export interface TrendPoint { day: string; sessions: number; visitors: number; pageViews: number; leads: number }
export async function trend(f: Filters): Promise<TrendPoint[]> {
  const [rows, leadRows, summaries] = await Promise.all([
    prisma.$queryRaw<Array<Record<string, unknown>>>(Prisma.sql`
      SELECT DATE(s.started_at) d, COUNT(*) sessions, COUNT(DISTINCT s.visitor_ref) visitors, COALESCE(SUM(s.page_views),0) pv
      FROM analytics_sessions s WHERE ${sessionWhere(f)} GROUP BY DATE(s.started_at)`),
    prisma.$queryRaw<Array<Record<string, unknown>>>(Prisma.sql`
      SELECT DATE(c.occurred_at) d, COUNT(*) n FROM analytics_conversions c WHERE ${conversionWhere(f)} GROUP BY DATE(c.occurred_at)`),
    // Days whose raw rows were purged by retention are filled from the rolled-up summaries (only when no dimension filter is active).
    !f.country && !f.channel && !f.campaign && !f.device
      ? prisma.analyticsDailySummary.groupBy({ by: ["day"], where: { day: { gte: f.from, lt: f.to } }, _sum: { sessions: true, newVisitors: true, pageViews: true, leads: true } })
      : Promise.resolve([]),
  ]);
  const key = (d: unknown) => (d instanceof Date ? d.toISOString() : String(d)).slice(0, 10);
  const map = new Map<string, TrendPoint>(dayKeys(f.from, f.to).map((d) => [d, { day: d, sessions: 0, visitors: 0, pageViews: 0, leads: 0 }]));
  for (const s of summaries) {
    const p = map.get(key(s.day));
    if (p) { p.sessions = s._sum.sessions ?? 0; p.visitors = s._sum.newVisitors ?? 0; p.pageViews = s._sum.pageViews ?? 0; p.leads = s._sum.leads ?? 0; }
  }
  for (const r of rows) { const p = map.get(key(r.d)); if (p) { p.sessions = num(r.sessions); p.visitors = num(r.visitors); p.pageViews = num(r.pv); } }
  for (const r of leadRows) { const p = map.get(key(r.d)); if (p) p.leads = num(r.n); }
  return [...map.values()];
}

// ── Breakdowns ───────────────────────────────────────────────────────────────────────────────────
export interface DimRow { key: string; label?: string; sessions: number; visitors: number; leads: number; conversionRate: number; avgEngagement: number; pageViews: number; bounceRate: number }

async function breakdown(f: Filters, dim: Prisma.Sql, dimLabel: Prisma.Sql | null, convDim: Prisma.Sql, opts: { limit?: number; where?: Prisma.Sql } = {}): Promise<DimRow[]> {
  const extra = opts.where ? Prisma.sql` AND ${opts.where}` : Prisma.empty;
  const rows = await prisma.$queryRaw<Array<Record<string, unknown>>>(Prisma.sql`
    SELECT ${dim} k, ${dimLabel ?? Prisma.sql`NULL`} lbl, COUNT(*) sessions, COUNT(DISTINCT s.visitor_ref) visitors, COALESCE(SUM(s.page_views),0) pv,
      AVG(s.engaged_seconds) eng, COALESCE(SUM(${BOUNCE_SQL}),0) bounces
    FROM analytics_sessions s WHERE ${sessionWhere(f)}${extra} GROUP BY k ORDER BY sessions DESC LIMIT ${opts.limit ?? 50}`);
  const leads = await prisma.$queryRaw<Array<Record<string, unknown>>>(Prisma.sql`
    SELECT ${convDim} k, COUNT(*) n FROM analytics_conversions c WHERE ${conversionWhere(f)} GROUP BY k`);
  const lm = new Map(leads.map((l) => [String(l.k ?? ""), num(l.n)]));
  return rows.map((r) => {
    const sessions = num(r.sessions), n = lm.get(String(r.k ?? "")) ?? 0;
    return { key: String(r.k ?? ""), label: r.lbl == null ? undefined : String(r.lbl), sessions, visitors: num(r.visitors), leads: n, conversionRate: rate(n, sessions), avgEngagement: Math.round(num(r.eng)), pageViews: num(r.pv), bounceRate: rate(num(r.bounces), sessions) };
  });
}

export const byChannel = (f: Filters) => breakdown(f, Prisma.sql`s.channel`, null, Prisma.sql`c.lt_channel`);
export const byCountry = (f: Filters) => breakdown(f, Prisma.sql`COALESCE(s.country_code,'')`, Prisma.sql`MAX(s.country)`, Prisma.sql`COALESCE(c.country_code,'')`, { limit: 250 });
export const byDevice = (f: Filters) => breakdown(f, Prisma.sql`s.device`, null, Prisma.sql`c.device`);
export const byBrowser = (f: Filters) => breakdown(f, Prisma.sql`COALESCE(s.browser,'Other')`, null, Prisma.sql`''`, { limit: 12 });
export const byCampaign = (f: Filters) =>
  breakdown(f, Prisma.sql`s.utm_campaign`, null, Prisma.sql`c.lt_campaign`, { where: Prisma.sql`s.utm_campaign IS NOT NULL` });
export const bySource = (f: Filters) =>
  breakdown(f, Prisma.sql`COALESCE(s.utm_source, s.referrer_domain, '(direct)')`, null, Prisma.sql`COALESCE(c.lt_source,'(direct)')`, { limit: 30 });

export async function regionsAndCities(f: Filters) {
  const q = (col: string) => prisma.$queryRaw<Array<Record<string, unknown>>>(Prisma.sql`
    SELECT s.country_code cc, ${Prisma.raw(`s.${col}`)} name, COUNT(*) sessions, COUNT(DISTINCT s.visitor_ref) visitors
    FROM analytics_sessions s WHERE ${sessionWhere(f)} AND ${Prisma.raw(`s.${col}`)} IS NOT NULL GROUP BY s.country_code, ${Prisma.raw(`s.${col}`)} ORDER BY sessions DESC LIMIT 25`);
  const [regions, cities] = await Promise.all([q("region"), q("city")]);
  const map = (r: Array<Record<string, unknown>>) => r.map((x) => ({ cc: String(x.cc ?? ""), name: String(x.name), sessions: num(x.sessions), visitors: num(x.visitors) }));
  return { regions: map(regions), cities: map(cities) };
}

export async function campaignMatrix(f: Filters) {
  const rows = await prisma.$queryRaw<Array<Record<string, unknown>>>(Prisma.sql`
    SELECT s.utm_campaign camp, COALESCE(s.utm_source,'') src, COALESCE(s.utm_medium,'') med, s.channel ch, COUNT(*) sessions, COUNT(DISTINCT s.visitor_ref) visitors, AVG(s.engaged_seconds) eng
    FROM analytics_sessions s WHERE ${sessionWhere(f)} AND s.utm_campaign IS NOT NULL GROUP BY camp, src, med, ch ORDER BY sessions DESC LIMIT 100`);
  const leads = await prisma.$queryRaw<Array<Record<string, unknown>>>(Prisma.sql`
    SELECT c.lt_campaign camp, COALESCE(c.lt_source,'') src, COALESCE(c.lt_medium,'') med, c.lt_channel ch, COUNT(*) n
    FROM analytics_conversions c WHERE ${conversionWhere(f)} AND c.lt_campaign IS NOT NULL GROUP BY camp, src, med, ch`);
  const lk = new Map(leads.map((l) => [`${l.camp}|${l.src}|${l.med}|${l.ch}`, num(l.n)]));
  const spend = await adSpendByCampaign(f);
  return rows.map((r) => {
    const sessions = num(r.sessions), n = lk.get(`${r.camp}|${r.src}|${r.med}|${r.ch}`) ?? 0;
    const sp = spend.get(String(r.camp)) ?? null;
    return { campaign: String(r.camp), source: String(r.src), medium: String(r.med), channel: String(r.ch), sessions, visitors: num(r.visitors), leads: n, conversionRate: rate(n, sessions), avgEngagement: Math.round(num(r.eng)), spendCents: sp, costPerLeadCents: sp != null && n > 0 ? Math.round(sp / n) : null };
  });
}

// ── Ad spend (administrator-entered; never estimated) ────────────────────────────────────────────
export async function adSpendByCampaign(f: Filters): Promise<Map<string, number>> {
  const rows = await prisma.analyticsAdSpend.groupBy({ by: ["campaign"], where: { day: { gte: f.from, lt: f.to }, currency: "USD" }, _sum: { amountCents: true } });
  return new Map(rows.filter((r) => r.campaign).map((r) => [r.campaign, r._sum.amountCents ?? 0]));
}
export async function adSpendByChannel(f: Filters): Promise<Map<string, number>> {
  const rows = await prisma.analyticsAdSpend.groupBy({ by: ["channel"], where: { day: { gte: f.from, lt: f.to }, currency: "USD" }, _sum: { amountCents: true } });
  return new Map(rows.map((r) => [r.channel, r._sum.amountCents ?? 0]));
}

// ── Pages ────────────────────────────────────────────────────────────────────────────────────────
export interface PageRow {
  path: string; title: string | null; views: number; uniqueVisitors: number; sessions: number; avgEngagement: number; avgElapsed: number; avgScroll: number;
  scroll50: number; scroll90: number; ctaClicks: number; formStarts: number; leadsAssisted: number; exitRate: number; conversionRate: number;
}
export async function pageStats(f: Filters, limit = 100): Promise<PageRow[]> {
  const rows = await prisma.$queryRaw<Array<Record<string, unknown>>>(Prisma.sql`
    SELECT p.path, MAX(p.title) title, COUNT(*) views, COUNT(DISTINCT p.visitor_ref) uv, COUNT(DISTINCT p.session_ref) sess,
      AVG(p.engaged_seconds) eng, AVG(p.elapsed_seconds) el, AVG(p.max_scroll) scr,
      SUM(p.max_scroll >= 50) s50, SUM(p.max_scroll >= 90) s90,
      SUM(p.id = (SELECT MAX(p2.id) FROM analytics_pageviews p2 WHERE p2.session_ref = p.session_ref)) exits,
      COUNT(DISTINCT CASE WHEN s.converted = 1 THEN p.session_ref END) assisted
    FROM analytics_pageviews p JOIN analytics_sessions s ON s.id = p.session_ref
    WHERE ${sessionWhere(f)} GROUP BY p.path ORDER BY views DESC LIMIT ${limit}`);
  const ev = await prisma.$queryRaw<Array<Record<string, unknown>>>(Prisma.sql`
    SELECT e.path, SUM(e.type = 'cta_click') cta, SUM(e.type = 'form_start') fs
    FROM analytics_events e JOIN analytics_sessions s ON s.id = e.session_ref
    WHERE ${sessionWhere(f)} AND e.type IN ('cta_click','form_start') GROUP BY e.path`);
  const em = new Map(ev.map((e) => [String(e.path), e]));
  return rows.map((r) => {
    const views = num(r.views), sessions = num(r.sess), e = em.get(String(r.path));
    return {
      path: String(r.path), title: r.title == null ? null : String(r.title), views, uniqueVisitors: num(r.uv), sessions, avgEngagement: Math.round(num(r.eng)), avgElapsed: Math.round(num(r.el)),
      avgScroll: Math.round(num(r.scr)), scroll50: rate(num(r.s50), views), scroll90: rate(num(r.s90), views), ctaClicks: num(e?.cta), formStarts: num(e?.fs),
      leadsAssisted: num(r.assisted), exitRate: rate(num(r.exits), views), conversionRate: rate(num(r.assisted), sessions),
    };
  });
}

// ── Sessions / live ──────────────────────────────────────────────────────────────────────────────
export async function sessionList(f: Filters, page: number, pageSize = 25) {
  const where = sessionWhere(f);
  const [rows, [c]] = await Promise.all([
    prisma.$queryRaw<Array<Record<string, unknown>>>(Prisma.sql`
      SELECT s.session_id, s.started_at, s.last_activity_at, s.country, s.country_code, s.city, s.device, s.browser, s.os, s.channel, s.utm_campaign, s.landing_page,
        s.exit_page, s.page_views, s.engaged_seconds, s.elapsed_seconds, s.converted, s.is_new_visitor, s.visit_number, v.visitor_id
      FROM analytics_sessions s JOIN analytics_visitors v ON v.id = s.visitor_ref WHERE ${where} ORDER BY s.started_at DESC LIMIT ${pageSize} OFFSET ${(Math.max(1, page) - 1) * pageSize}`),
    prisma.$queryRaw<Array<{ n: unknown }>>(Prisma.sql`SELECT COUNT(*) n FROM analytics_sessions s WHERE ${where}`),
  ]);
  return { rows, total: num(c.n), pageSize };
}

export async function liveSessions(limit = 100) {
  const since = new Date(Date.now() - LIVE_WINDOW_MS);
  const rows = await prisma.analyticsSession.findMany({
    where: { lastActivityAt: { gte: since } }, orderBy: { lastActivityAt: "desc" }, take: limit,
    include: { visitor: { select: { visitorId: true } } },
  });
  const now = Date.now();
  return rows.map((s) => ({
    sessionId: s.sessionId, visitorId: s.visitor.visitorId, country: s.country, countryCode: s.countryCode, city: s.city, device: s.device, browser: s.browser, os: s.os,
    currentPage: s.currentPage, landingPage: s.landingPage, channel: s.channel, source: s.utmSource ?? s.referrerDomain, campaign: s.utmCampaign,
    durationSeconds: Math.max(0, Math.round((s.lastActivityAt.getTime() - s.startedAt.getTime()) / 1000)), engagedSeconds: s.engagedSeconds, pageViews: s.pageViews,
    status: (now - s.lastActivityAt.getTime() < 60_000 ? "active" : "idle") as "active" | "idle", converted: s.converted, lastActivityAt: s.lastActivityAt.toISOString(),
  }));
}

export async function sessionTimeline(sessionId: string) {
  const session = await prisma.analyticsSession.findUnique({ where: { sessionId }, include: { visitor: true } });
  if (!session) return null;
  const [events, pageviews, conversion] = await Promise.all([
    prisma.analyticsEvent.findMany({ where: { sessionRef: session.id, type: { notIn: ["web_vital", "request_timing"] } }, orderBy: { occurredAt: "asc" }, take: 500 }),
    prisma.analyticsPageview.findMany({ where: { sessionRef: session.id }, orderBy: { startedAt: "asc" }, take: 200 }),
    prisma.analyticsConversion.findFirst({ where: { sessionRef: session.id } }),
  ]);
  return { session, events, pageviews, conversion };
}

// ── Lead attribution ─────────────────────────────────────────────────────────────────────────────
export async function leadAttribution(f: Filters, page: number, pageSize = 25) {
  const where = conversionWhere(f);
  const [rows, [c], first, last] = await Promise.all([
    prisma.$queryRaw<Array<Record<string, unknown>>>(Prisma.sql`SELECT c.* FROM analytics_conversions c WHERE ${where} ORDER BY c.occurred_at DESC LIMIT ${pageSize} OFFSET ${(Math.max(1, page) - 1) * pageSize}`),
    prisma.$queryRaw<Array<{ n: unknown }>>(Prisma.sql`SELECT COUNT(*) n FROM analytics_conversions c WHERE ${where}`),
    prisma.$queryRaw<Array<Record<string, unknown>>>(Prisma.sql`SELECT COALESCE(c.ft_channel,'unattributed') k, COUNT(*) n FROM analytics_conversions c WHERE ${where} GROUP BY k ORDER BY n DESC`),
    prisma.$queryRaw<Array<Record<string, unknown>>>(Prisma.sql`SELECT COALESCE(c.lt_channel,'unattributed') k, COUNT(*) n FROM analytics_conversions c WHERE ${where} GROUP BY k ORDER BY n DESC`),
  ]);
  return { rows, total: num(c.n), pageSize, firstTouch: first.map((r) => ({ key: String(r.k), n: num(r.n) })), lastTouch: last.map((r) => ({ key: String(r.k), n: num(r.n) })) };
}

// ── Performance & technical ──────────────────────────────────────────────────────────────────────
export function percentile(values: number[], p: number): number | null {
  if (!values.length) return null;
  const s = [...values].sort((a, b) => a - b);
  const idx = Math.min(s.length - 1, Math.max(0, Math.ceil((p / 100) * s.length) - 1));
  return s[idx];
}
export const VITAL_GOOD: Record<string, [number, number]> = { LCP: [2500, 4000], INP: [200, 500], CLS: [0.1, 0.25], TTFB: [800, 1800], LOAD: [3000, 6000] };
export function rateVital(metric: string, v: number | null): "good" | "needs-improvement" | "poor" | null {
  const t = VITAL_GOOD[metric];
  if (v == null || !t) return null;
  return v <= t[0] ? "good" : v <= t[1] ? "needs-improvement" : "poor";
}

export async function vitals(f: Filters) {
  const rows = await prisma.$queryRaw<Array<Record<string, unknown>>>(Prisma.sql`
    SELECT e.path, s.device, JSON_UNQUOTE(JSON_EXTRACT(e.props,'$.metric')) metric, CAST(JSON_EXTRACT(e.props,'$.val') AS DECIMAL(14,3)) val
    FROM analytics_events e JOIN analytics_sessions s ON s.id = e.session_ref
    WHERE e.type = 'web_vital' AND ${sessionWhere(f)} ORDER BY e.id DESC LIMIT 60000`);
  const groups = new Map<string, number[]>();
  const add = (k: string, v: number) => { const g = groups.get(k); if (g) g.push(v); else groups.set(k, [v]); };
  for (const r of rows) {
    const v = num(r.val), m = String(r.metric);
    add(`all|${m}|`, v); add(`device|${m}|${r.device}`, v); add(`page|${m}|${r.path}`, v);
  }
  const p75 = (m: string, scope: string, key = "") => percentile(groups.get(`${scope}|${m}|${key}`) ?? [], 75);
  const metrics = ["LCP", "INP", "CLS", "TTFB", "LOAD"];
  const overall = metrics.map((m) => ({ metric: m, p75: p75(m, "all"), samples: (groups.get(`all|${m}|`) ?? []).length }));
  const byDevice = ["desktop", "mobile", "tablet"].map((d) => ({ device: d, ...Object.fromEntries(metrics.map((m) => [m, p75(m, "device", d)])) })) as Array<Record<string, number | string | null>>;
  const pages = new Map<string, number>();
  for (const k of groups.keys()) if (k.startsWith("page|LCP|")) pages.set(k.slice(9), (groups.get(k) ?? []).length);
  const byPage = [...pages.entries()].sort((a, b) => b[1] - a[1]).slice(0, 30).map(([path, n]) => ({ path, samples: n, ...Object.fromEntries(metrics.map((m) => [m, p75(m, "page", path)])) })) as Array<Record<string, number | string | null>>;
  return { overall, byDevice, byPage, truncated: rows.length >= 60000 };
}

export async function technical(f: Filters) {
  const [errors, failed, formFail, formAttempts, timings] = await Promise.all([
    prisma.$queryRaw<Array<Record<string, unknown>>>(Prisma.sql`
      SELECT JSON_UNQUOTE(JSON_EXTRACT(e.props,'$.err')) err, JSON_UNQUOTE(JSON_EXTRACT(e.props,'$.src')) src, e.path, COUNT(*) n, COUNT(DISTINCT e.session_ref) sess, MAX(e.occurred_at) last_at
      FROM analytics_events e JOIN analytics_sessions s ON s.id = e.session_ref WHERE e.type = 'js_error' AND ${sessionWhere(f)} GROUP BY err, src, e.path ORDER BY n DESC LIMIT 40`),
    prisma.$queryRaw<Array<Record<string, unknown>>>(Prisma.sql`
      SELECT JSON_UNQUOTE(JSON_EXTRACT(e.props,'$.url')) url, JSON_UNQUOTE(JSON_EXTRACT(e.props,'$.status')) status, COUNT(*) n, AVG(CAST(JSON_EXTRACT(e.props,'$.ms') AS DECIMAL(12,2))) ms
      FROM analytics_events e JOIN analytics_sessions s ON s.id = e.session_ref WHERE e.type = 'request_failed' AND ${sessionWhere(f)} GROUP BY url, status ORDER BY n DESC LIMIT 40`),
    prisma.$queryRaw<Array<Record<string, unknown>>>(Prisma.sql`
      SELECT JSON_UNQUOTE(JSON_EXTRACT(e.props,'$.reason')) reason, COUNT(*) n FROM analytics_events e JOIN analytics_sessions s ON s.id = e.session_ref
      WHERE e.type = 'form_submit_failure' AND ${sessionWhere(f)} GROUP BY reason ORDER BY n DESC`),
    prisma.$queryRaw<Array<{ a: unknown; ok: unknown }>>(Prisma.sql`
      SELECT SUM(e.type = 'form_submit_attempt') a, SUM(e.type = 'lead_created') ok FROM analytics_events e JOIN analytics_sessions s ON s.id = e.session_ref
      WHERE e.type IN ('form_submit_attempt','lead_created') AND ${sessionWhere(f)}`),
    prisma.$queryRaw<Array<Record<string, unknown>>>(Prisma.sql`
      SELECT JSON_UNQUOTE(JSON_EXTRACT(e.props,'$.url')) url, COUNT(*) n, AVG(CAST(JSON_EXTRACT(e.props,'$.ms') AS DECIMAL(12,2))) ms
      FROM analytics_events e JOIN analytics_sessions s ON s.id = e.session_ref WHERE e.type = 'request_timing' AND ${sessionWhere(f)} GROUP BY url ORDER BY n DESC LIMIT 20`),
  ]);
  const attempts = num(formAttempts[0]?.a), ok = num(formAttempts[0]?.ok), failures = formFail.reduce((n, r) => n + num(r.n), 0);
  return {
    errors: errors.map((r) => ({ err: String(r.err), src: String(r.src ?? ""), path: String(r.path ?? ""), n: num(r.n), sessions: num(r.sess), last: r.last_at as Date })),
    failed: failed.map((r) => ({ url: String(r.url), status: String(r.status), n: num(r.n), ms: Math.round(num(r.ms)) })),
    formFailures: formFail.map((r) => ({ reason: String(r.reason), n: num(r.n) })),
    attempts, successes: ok, failures, failureRate: rate(failures, Math.max(attempts, failures + ok)),
    timings: timings.map((r) => ({ url: String(r.url), n: num(r.n), ms: Math.round(num(r.ms)) })),
  };
}

export async function recentLeadsWithJourney(limit = 8) {
  return prisma.analyticsConversion.findMany({ orderBy: { occurredAt: "desc" }, take: limit });
}
export async function recentActivity(limit = 12) {
  return prisma.analyticsEvent.findMany({
    where: { type: { in: ["page_view", "cta_click", "form_start", "lead_created", "whatsapp_click", "phone_click", "email_click"] } },
    orderBy: { id: "desc" }, take: limit, include: { session: { select: { sessionId: true, country: true, city: true, device: true, channel: true } } },
  });
}

/** Data-health summary used by Settings: proves what is (and is not) being collected. */
export async function health() {
  const [sessions, events, visitors, last, conversions] = await Promise.all([
    prisma.analyticsSession.count(), prisma.analyticsEvent.count(), prisma.analyticsVisitor.count(),
    prisma.analyticsEvent.findFirst({ orderBy: { id: "desc" }, select: { occurredAt: true } }), prisma.analyticsConversion.count(),
  ]);
  return { sessions, events, visitors, conversions, lastEventAt: last?.occurredAt ?? null };
}

// ── Behaviour ────────────────────────────────────────────────────────────────────────────────────
export async function behaviour(f: Filters) {
  const [transitions, entries, exits, journeys, depth] = await Promise.all([
    prisma.$queryRaw<Array<Record<string, unknown>>>(Prisma.sql`
      SELECT t.path a, t.nxt b, COUNT(*) n FROM (
        SELECT p.path, LEAD(p.path) OVER (PARTITION BY p.session_ref ORDER BY p.id) nxt, p.session_ref FROM analytics_pageviews p JOIN analytics_sessions s ON s.id = p.session_ref WHERE ${sessionWhere(f)}
      ) t WHERE t.nxt IS NOT NULL AND t.nxt <> t.path GROUP BY t.path, t.nxt ORDER BY n DESC LIMIT 20`),
    prisma.$queryRaw<Array<Record<string, unknown>>>(Prisma.sql`SELECT SUBSTRING_INDEX(s.landing_page,'?',1) p, COUNT(*) n FROM analytics_sessions s WHERE ${sessionWhere(f)} GROUP BY p ORDER BY n DESC LIMIT 10`),
    prisma.$queryRaw<Array<Record<string, unknown>>>(Prisma.sql`SELECT s.exit_page p, COUNT(*) n FROM analytics_sessions s WHERE ${sessionWhere(f)} AND s.exit_page IS NOT NULL GROUP BY p ORDER BY n DESC LIMIT 10`),
    prisma.$queryRaw<Array<Record<string, unknown>>>(Prisma.sql`
      SELECT s.session_id sid, s.channel, s.country_code cc, s.started_at, GROUP_CONCAT(p.path ORDER BY p.id SEPARATOR ' → ') path FROM analytics_sessions s JOIN analytics_pageviews p ON p.session_ref = s.id
      WHERE ${sessionWhere(f)} AND s.converted = 1 GROUP BY s.id ORDER BY s.started_at DESC LIMIT 15`),
    prisma.$queryRaw<Array<Record<string, unknown>>>(Prisma.sql`SELECT s.page_views pv, COUNT(*) n FROM analytics_sessions s WHERE ${sessionWhere(f)} GROUP BY s.page_views ORDER BY s.page_views LIMIT 12`),
  ]);
  const m = (r: Array<Record<string, unknown>>): Array<Record<string, unknown> & { n: number }> => r.map((x) => ({ ...x, n: num(x.n) }));
  return { transitions: m(transitions), entries: m(entries), exits: m(exits), journeys, depth: m(depth) };
}
