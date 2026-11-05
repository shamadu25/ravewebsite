import { loadIntel } from "@/components/analytics/load";
import { FilterBar, Kpi, KpiGrid, NoAccess, PageTitle, Section, Table, fmt, pct } from "@/components/analytics/kit";
import { technical } from "@/lib/analytics/queries";

export default async function TechnicalPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const ctx = await loadIntel(searchParams);
  if (!ctx) return <NoAccess />;
  const { f } = ctx;
  const t = await technical(f);
  return (
    <div>
      <PageTitle title="Technical Monitoring" subtitle="Browser errors, failed API calls and form failures observed from real visits. Bot traffic is filtered at ingest and not stored, so it does not appear here." />
      <FilterBar f={f} show={["device", "country"]} />
      <KpiGrid>
        <Kpi label="JS error events" value={fmt(t.errors.reduce((n, e) => n + e.n, 0))} />
        <Kpi label="Failed requests" value={fmt(t.failed.reduce((n, e) => n + e.n, 0))} hint="Same-origin /api calls with status ≥ 400 or network failure" />
        <Kpi label="Form submit attempts" value={fmt(t.attempts)} />
        <Kpi label="Form failure rate" value={pct(t.failureRate)} hint={`${fmt(t.failures)} server-observed failures · ${fmt(t.successes)} leads`} accent={t.failureRate >= 20} />
      </KpiGrid>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Section title="JavaScript errors"><Table head={[{ label: "Error" }, { label: "Page" }, { label: "Count", right: true }, { label: "Sessions", right: true }]} empty="No browser errors recorded."
          rows={t.errors.map((e) => [<span key="e" className="break-words">{e.err}<span className="block text-xs text-gray-400">{e.src}</span></span>, e.path, fmt(e.n), fmt(e.sessions)])} /></Section>
        <Section title="Failed requests"><Table head={[{ label: "Endpoint" }, { label: "Status" }, { label: "Count", right: true }, { label: "Avg ms", right: true }]} empty="No failed requests recorded."
          rows={t.failed.map((e) => [e.url, e.status === "0" ? "network error" : e.status, fmt(e.n), fmt(e.ms)])} /></Section>
        <Section title="Form submission failures" subtitle="Recorded by the server with a reason code only (never form contents)"><Table head={[{ label: "Reason" }, { label: "Count", right: true }]} empty="No failures recorded."
          rows={t.formFailures.map((e) => [e.reason.replace(/_/g, " "), fmt(e.n)])} /></Section>
        <Section title="API response times" subtitle="First 5 same-origin /api calls per page"><Table head={[{ label: "Endpoint" }, { label: "Samples", right: true }, { label: "Avg ms", right: true }]} empty="No timing samples yet."
          rows={t.timings.map((e) => [e.url, fmt(e.n), fmt(e.ms)])} /></Section>
      </div>
      <Section className="mt-6" title="Not yet covered"><p className="text-sm text-gray-600">Broken-link crawling is not implemented in this release (it needs a scheduled crawler). Use the SEO tooling already in use for link audits.</p></Section>
    </div>
  );
}
