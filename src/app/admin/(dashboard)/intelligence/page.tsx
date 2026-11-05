import Link from "next/link";
import { loadIntel, previousOf } from "@/components/analytics/load";
import { AMBER, BLUE, BarList, Delta, Empty, FilterBar, Kpi, KpiGrid, LineChart, NoAccess, PageTitle, Section, Status, Table, chLabel, dur, fmt, pct } from "@/components/analytics/kit";
import { byChannel, byCountry, byDevice, overview, pageStats, recentActivity, recentLeadsWithJourney, trend } from "@/lib/analytics/queries";
import { buildInsights } from "@/lib/analytics/insights";
import { DEFAULT_FUNNEL, runFunnel } from "@/lib/analytics/funnels";
import { filterQuery } from "@/lib/analytics/filters";
import { countryName } from "@/lib/analytics/classify";
import { ago } from "@/components/os/ui";

export default async function OverviewPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const ctx = await loadIntel(searchParams);
  if (!ctx) return <NoAccess />;
  const { f } = ctx;
  const prevF = previousOf(f);
  const [ov, points, channels, prevChannels, countries, pages, devices, funnel, leads, activity] = await Promise.all([
    overview(f), trend(f), byChannel(f), byChannel(prevF), byCountry(f), pageStats(f, 8), byDevice(f), runFunnel(f, DEFAULT_FUNNEL), recentLeadsWithJourney(6), recentActivity(10),
  ]);
  const { cur, prev } = ov;
  const insights = buildInsights({ cur, prev, channels, prevChannels, pages, devices });
  const empty = cur.sessions === 0;
  const q = filterQuery(f);

  return (
    <div>
      <PageTitle title="Analytics Overview" subtitle="First-party data recorded by RaveSoft’s own tracker and lead system. Every number is computed from stored sessions and conversions." />
      <FilterBar f={f} />
      {empty && (
        <div className="mb-6"><Empty title="No visitors recorded in this period" hint="If the site has just been connected, open any public page in a normal (non-incognito, non-admin) browser, accept analytics if asked, and refresh this page. Your own admin browsing is deliberately excluded." /></div>
      )}
      <KpiGrid>
        <Kpi label="Total Visitors" value={fmt(cur.totalVisitors)} cur={cur.totalVisitors} prev={prev.totalVisitors} hint="Visitor-days" accent />
        <Kpi label="Unique Visitors" value={fmt(cur.uniqueVisitors)} cur={cur.uniqueVisitors} prev={prev.uniqueVisitors} />
        <Kpi label="Total Sessions" value={fmt(cur.sessions)} cur={cur.sessions} prev={prev.sessions} />
        <Kpi label="Live Visitors" value={fmt(ov.live)} hint="Active in the last 5 min" />
        <Kpi label="Page Views" value={fmt(cur.pageViews)} cur={cur.pageViews} prev={prev.pageViews} />
        <Kpi label="Avg. Session Duration" value={dur(cur.avgDuration)} cur={cur.avgDuration} prev={prev.avgDuration} />
        <Kpi label="Avg. Engagement Time" value={dur(cur.avgEngagement)} cur={cur.avgEngagement} prev={prev.avgEngagement} />
        <Kpi label="Pages / Session" value={String(cur.pagesPerSession)} cur={cur.pagesPerSession} prev={prev.pagesPerSession} />
        <Kpi label="Bounce Rate" value={pct(cur.bounceRate)} cur={cur.bounceRate} prev={prev.bounceRate} inverse />
        <Kpi label="New Visitors" value={fmt(cur.newVisitors)} cur={cur.newVisitors} prev={prev.newVisitors} />
        <Kpi label="Returning Visitors" value={fmt(cur.returningVisitors)} cur={cur.returningVisitors} prev={prev.returningVisitors} />
        <Kpi label="Total Leads" value={fmt(ov.leadsTotal ?? cur.leadsAttributed)} cur={ov.leadsTotal ?? cur.leadsAttributed} prev={ov.leadsTotalPrev ?? prev.leadsAttributed} hint={ov.leadsTotal == null ? "Attributed leads (filtered)" : `${cur.leadsAttributed} with analytics context`} />
        <Kpi label="Lead Conversion Rate" value={pct(cur.conversionRate)} cur={cur.conversionRate} prev={prev.conversionRate} hint="Converting sessions ÷ sessions" />
      </KpiGrid>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <Section className="xl:col-span-2" title="Traffic trend" subtitle={`Daily sessions and unique visitors · ${f.label}`}>
          {points.every((p) => p.sessions === 0) ? <Empty /> : <LineChart days={points.map((p) => p.day)} series={[{ key: "s", label: "Sessions", color: BLUE, values: points.map((p) => p.sessions) }, { key: "v", label: "Visitors", color: AMBER, values: points.map((p) => p.visitors) }]} />}
        </Section>
        <Section title="Leads per day" subtitle="From backend-confirmed lead records">
          {points.every((p) => p.leads === 0) ? <Empty /> : <LineChart height={200} days={points.map((p) => p.day)} series={[{ key: "l", label: "Leads", color: BLUE, values: points.map((p) => p.leads) }]} />}
        </Section>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Section title="Traffic acquisition" subtitle="Sessions by channel (methodology on Traffic Sources)" actions={<Link className="text-xs text-[#060297] underline" href={`/admin/intelligence/sources?${q}`}>Details</Link>}>
          <BarList rows={channels.map((c) => ({ label: chLabel(c.key), value: c.sessions, sub: `${c.leads} leads` }))} />
        </Section>
        <Section title="Geographic distribution" subtitle="IP-based, approximate — see Geographic Analytics" actions={<Link className="text-xs text-[#060297] underline" href={`/admin/intelligence/geo?${q}`}>Map</Link>}>
          <BarList rows={countries.slice(0, 8).map((c) => ({ label: c.key ? countryName(c.key) ?? c.key : "Unknown", value: c.sessions, sub: `${c.leads} leads` }))} />
        </Section>
        <Section title="Top-performing pages" actions={<Link className="text-xs text-[#060297] underline" href={`/admin/intelligence/pages?${q}`}>All pages</Link>}>
          <Table head={[{ label: "Page" }, { label: "Views", right: true }, { label: "Avg. engaged", right: true }, { label: "Conv.", right: true }]} rows={pages.map((p) => [<span key="p" className="break-all">{p.path}</span>, fmt(p.views), dur(p.avgEngagement), pct(p.conversionRate)])} />
        </Section>
        <Section title="Conversion funnel" subtitle="Distinct visitors, in order" actions={<Link className="text-xs text-[#060297] underline" href={`/admin/intelligence/funnels?${q}`}>Funnels</Link>}>
          {funnel.steps[0].visitors === 0 ? <Empty /> : <BarList rows={funnel.steps.map((s) => ({ label: s.label, value: s.visitors, sub: `${s.pctOfFirst}%` }))} />}
        </Section>
        <Section title="Recent lead submissions" subtitle="Confirmed by the existing lead backend" actions={<Link className="text-xs text-[#060297] underline" href={`/admin/intelligence/leads?${q}`}>Attribution</Link>}>
          <Table head={[{ label: "When" }, { label: "Service" }, { label: "Last touch" }, { label: "Country" }]} empty="No leads have been attributed yet."
            rows={leads.map((l) => [ago(l.occurredAt), l.service ?? "—", <span key="c">{chLabel(l.ltChannel)}{l.ltCampaign ? ` · ${l.ltCampaign}` : ""}{!l.attributed && <> <Status tone="off">no analytics context</Status></>}</span>, l.countryCode ?? "—"])} />
        </Section>
        <Section title="Recent visitor activity">
          <Table head={[{ label: "When" }, { label: "Activity" }, { label: "Where" }, { label: "Page" }]} empty="No activity yet."
            rows={activity.map((a) => [ago(a.occurredAt), <Link key="s" className="text-[#060297] underline" href={`/admin/intelligence/visitors/${a.session.sessionId}`}>{a.type.replace(/_/g, " ")}</Link>, [a.session.city, a.session.country].filter(Boolean).join(", ") || "—", <span key="p" className="break-all">{a.path ?? "—"}</span>])} />
        </Section>
      </div>

      <Section className="mt-6" title="Automated insights" subtitle="Observations come straight from stored data. Recommendations are labelled estimates. Nothing is shown until there is enough data.">
        {insights.length === 0 ? <p className="text-sm text-gray-500">Not enough data yet for reliable insights (needs ≥50 sessions in the period and comparable channel volumes).</p> : (
          <ul className="space-y-2">{insights.map((i, n) => (
            <li key={n} className="flex items-start gap-3 text-sm text-gray-800"><Status tone={i.kind === "recommendation" ? "warn" : i.severity === "positive" ? "ok" : i.severity === "warning" ? "bad" : "off"}>{i.kind === "recommendation" ? "Estimate" : "Observed"}</Status><span>{i.text}</span></li>
          ))}</ul>
        )}
        <p className="mt-3 text-xs text-gray-400">Change vs previous period: sessions <Delta cur={cur.sessions} prev={prev.sessions} />, converting sessions <Delta cur={cur.convertedSessions} prev={prev.convertedSessions} /></p>
      </Section>
    </div>
  );
}
