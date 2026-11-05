import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { conversionWhere, type Filters } from "./filters";
import { byChannel, byCountry, byDevice, campaignMatrix, num, pageStats, trend } from "./queries";
import { DEFAULT_FUNNEL, runFunnel } from "./funnels";

export const REPORTS = [
  { id: "daily-traffic", label: "Daily traffic report" },
  { id: "weekly-traffic", label: "Weekly traffic report" },
  { id: "monthly-traffic", label: "Monthly traffic report" },
  { id: "geographic", label: "Geographic report" },
  { id: "campaigns", label: "Campaign report" },
  { id: "lead-attribution", label: "Lead attribution report" },
  { id: "pages", label: "Page performance report" },
  { id: "conversions", label: "Conversion (funnel) report" },
  { id: "engagement", label: "Visitor engagement report" },
] as const;
export type ReportId = (typeof REPORTS)[number]["id"];
export type Row = Record<string, string | number | null>;

function rollup(points: Awaited<ReturnType<typeof trend>>, keyOf: (day: string) => string): Row[] {
  const m = new Map<string, Row>();
  for (const p of points) {
    const k = keyOf(p.day);
    const r = m.get(k) ?? { period: k, sessions: 0, visitors: 0, page_views: 0, leads: 0 };
    r.sessions = (r.sessions as number) + p.sessions; r.page_views = (r.page_views as number) + p.pageViews; r.leads = (r.leads as number) + p.leads;
    // Distinct visitors cannot be summed across days; this column is the sum of daily uniques and is labelled as such.
    r.visitors = (r.visitors as number) + p.visitors;
    m.set(k, r);
  }
  return [...m.values()].map((r) => ({ ...r, visitors_sum_of_daily_uniques: r.visitors, visitors: undefined as never })).map(({ visitors, ...rest }) => { void visitors; return rest as Row; });
}
const weekKey = (day: string) => { const d = new Date(`${day}T00:00:00Z`); const dow = (d.getUTCDay() + 6) % 7; d.setUTCDate(d.getUTCDate() - dow); return `week of ${d.toISOString().slice(0, 10)}`; };

export async function buildReport(id: ReportId, f: Filters): Promise<Row[]> {
  switch (id) {
    case "daily-traffic": return rollup(await trend(f), (d) => d);
    case "weekly-traffic": return rollup(await trend(f), weekKey);
    case "monthly-traffic": return rollup(await trend(f), (d) => d.slice(0, 7));
    case "geographic": return (await byCountry(f)).map((r) => ({ country: r.label ?? r.key ?? "Unknown", country_code: r.key, sessions: r.sessions, visitors: r.visitors, leads: r.leads, conversion_rate_pct: r.conversionRate, avg_engagement_seconds: r.avgEngagement }));
    case "campaigns": return (await campaignMatrix(f)).map((r) => ({ campaign: r.campaign, source: r.source, medium: r.medium, channel: r.channel, sessions: r.sessions, visitors: r.visitors, leads: r.leads, conversion_rate_pct: r.conversionRate, spend_usd: r.spendCents == null ? null : r.spendCents / 100, cost_per_lead_usd: r.costPerLeadCents == null ? null : r.costPerLeadCents / 100 }));
    case "pages": return (await pageStats(f, 500)).map((r) => ({ path: r.path, title: r.title, views: r.views, unique_visitors: r.uniqueVisitors, sessions: r.sessions, avg_engaged_seconds: r.avgEngagement, avg_elapsed_seconds: r.avgElapsed, avg_scroll_pct: r.avgScroll, cta_clicks: r.ctaClicks, form_starts: r.formStarts, leads_assisted: r.leadsAssisted, exit_rate_pct: r.exitRate, conversion_rate_pct: r.conversionRate }));
    case "lead-attribution": {
      const rows = await prisma.$queryRaw<Array<Record<string, unknown>>>(Prisma.sql`SELECT c.* FROM analytics_conversions c WHERE ${conversionWhere(f)} ORDER BY c.occurred_at DESC LIMIT 5000`);
      // No name/email/phone: attribution exports carry ids and marketing fields only.
      return rows.map((r) => ({ lead_id: num(r.lead_id), occurred_at: new Date(r.occurred_at as Date).toISOString(), service: (r.service as string) ?? null, landing_page: (r.landing_page as string) ?? null, conversion_page: (r.conversion_page as string) ?? null, first_touch_channel: (r.ft_channel as string) ?? null, first_touch_source: (r.ft_source as string) ?? null, last_touch_channel: (r.lt_channel as string) ?? null, last_touch_source: (r.lt_source as string) ?? null, last_touch_medium: (r.lt_medium as string) ?? null, campaign: (r.lt_campaign as string) ?? null, referrer: (r.referrer as string) ?? null, country_code: (r.country_code as string) ?? null, device: (r.device as string) ?? null, pages_visited: num(r.pages_visited), previous_visits: num(r.previous_visits), engaged_seconds_before: num(r.engaged_seconds_before), attributed: r.attributed ? "yes" : "no" }));
    }
    case "conversions": {
      const r = await runFunnel(f, DEFAULT_FUNNEL);
      return r.steps.map((s, i) => ({ step: i + 1, label: s.label, visitors: s.visitors, pct_of_first: s.pctOfFirst, pct_of_previous: s.pctOfPrevious, drop_off_pct: s.dropOffPct, median_seconds_from_previous: s.medianSecondsFromPrevious }));
    }
    case "engagement": {
      const [ch, dv] = await Promise.all([byChannel(f), byDevice(f)]);
      return [...ch.map((r) => ({ dimension: "channel", value: r.key, sessions: r.sessions, visitors: r.visitors, avg_engagement_seconds: r.avgEngagement, bounce_rate_pct: r.bounceRate, conversion_rate_pct: r.conversionRate })),
        ...dv.map((r) => ({ dimension: "device", value: r.key, sessions: r.sessions, visitors: r.visitors, avg_engagement_seconds: r.avgEngagement, bounce_rate_pct: r.bounceRate, conversion_rate_pct: r.conversionRate }))];
    }
  }
}
