import { loadIntel } from "@/components/analytics/load";
import { Empty, FilterBar, Kpi, KpiGrid, NoAccess, PageTitle, Section, Status, Table, fmt } from "@/components/analytics/kit";
import { rateVital, vitals } from "@/lib/analytics/queries";

const UNIT: Record<string, string> = { LCP: "ms", INP: "ms", CLS: "", TTFB: "ms", LOAD: "ms" };
const show = (m: string, v: number | null | undefined) => (v == null ? "—" : m === "CLS" ? v.toFixed(3) : `${fmt(Math.round(v))} ${UNIT[m]}`);
const tone = (r: ReturnType<typeof rateVital>) => (r === "good" ? "ok" : r === "poor" ? "bad" : r ? "warn" : "off") as "ok" | "bad" | "warn" | "off";

export default async function PerformancePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const ctx = await loadIntel(searchParams);
  if (!ctx) return <NoAccess />;
  const { f } = ctx;
  const v = await vitals(f);
  const none = v.overall.every((o) => o.samples === 0);
  const cols = ["LCP", "INP", "CLS", "TTFB"];
  return (
    <div>
      <PageTitle title="Website Performance" subtitle="Real-user Core Web Vitals measured in visitors’ browsers (75th percentile, the same statistic Google reports). INP is only reported for pages where the visitor interacted." />
      <FilterBar f={f} show={["country", "device", "channel"]} />
      {none ? <Empty title="No performance samples yet" hint="Vitals are sent when a visitor leaves or hides the page, from browsers that support the Performance APIs (Chromium-based browsers report all three)." /> : (
        <>
          <KpiGrid>{v.overall.filter((o) => cols.includes(o.metric)).map((o) => <Kpi key={o.metric} label={`${o.metric} (p75)`} value={show(o.metric, o.p75)} hint={`${fmt(o.samples)} samples · ${rateVital(o.metric, o.p75) ?? "no rating"}`} accent={rateVital(o.metric, o.p75) === "poor"} />)}</KpiGrid>
          <Section className="mt-6" title="Mobile vs desktop">
            <Table head={[{ label: "Device" }, ...cols.map((c) => ({ label: `${c} p75`, right: true }))]}
              rows={v.byDevice.map((d) => [String(d.device), ...cols.map((c) => <span key={c}>{show(c, d[c] as number | null)} <Status tone={tone(rateVital(c, d[c] as number | null))}>{rateVital(c, d[c] as number | null) ?? "n/a"}</Status></span>)])} />
          </Section>
          <Section className="mt-6" title="By page" subtitle="Top 30 pages by samples">
            <Table head={[{ label: "Page" }, { label: "Samples", right: true }, ...cols.map((c) => ({ label: `${c} p75`, right: true }))]}
              rows={v.byPage.map((p) => [<span key="p" className="break-all">{String(p.path)}</span>, fmt(Number(p.samples)), ...cols.map((c) => show(c, p[c] as number | null))])} />
            {v.truncated && <p className="mt-2 text-xs text-amber-700">Based on the most recent 60,000 samples.</p>}
          </Section>
        </>
      )}
    </div>
  );
}
