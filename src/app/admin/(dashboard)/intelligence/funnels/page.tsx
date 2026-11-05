import { loadIntel } from "@/components/analytics/load";
import { Empty, FilterBar, NoAccess, PageTitle, Section, Table, dur, fmt, pct } from "@/components/analytics/kit";
import FunnelBuilder from "@/components/analytics/FunnelBuilder";
import ApiButton from "@/components/os/ApiButton";
import { listFunnels, runFunnel } from "@/lib/analytics/funnels";
import { can } from "@/lib/os/rbac";

export default async function FunnelsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const ctx = await loadIntel(searchParams);
  if (!ctx) return <NoAccess />;
  const { f, caller } = ctx;
  const funnels = await listFunnels();
  const results = await Promise.all(funnels.map((d) => runFunnel(f, d)));
  const manage = can(caller.role, "analytics.manage");
  return (
    <div>
      <PageTitle title="Conversion Funnels" subtitle="Counts distinct visitors. A visitor reaches a step only through an event that happened at or after the previous step, and is counted once per step. Final-step conversions come from backend-confirmed leads." />
      <FilterBar f={f} />
      <div className="space-y-6">
        {funnels.map((d, n) => {
          const r = results[n];
          return (
            <Section key={d.id} title={d.name} subtitle={r.steps[0].visitors ? `Overall conversion ${pct(r.conversionRate)}` : undefined}
              actions={d.id !== "default" && manage ? <ApiButton label="Delete" variant="secondary" url="/api/intel/admin" method="POST" body={{ action: "funnel_delete", id: d.id }} confirm="Delete this funnel definition? Stored analytics data is not affected." /> : undefined}>
              {r.steps[0].visitors === 0 ? <Empty /> : (
                <>
                  <ol className="space-y-3">{r.steps.map((s, i) => (
                    <li key={i}>
                      <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm"><span className="font-medium text-gray-900">{i + 1}. {s.label}</span><span className="tabular-nums text-gray-600">{fmt(s.visitors)} visitors{i > 0 && <> · {pct(s.pctOfPrevious)} continued · <span className="text-red-700">{pct(s.dropOffPct)} dropped</span></>}</span></div>
                      <div className="mt-1 h-3 overflow-hidden rounded-full bg-gray-100" role="presentation"><div className="h-full rounded-full" style={{ width: `${Math.max(1, s.pctOfFirst)}%`, background: i === r.steps.length - 1 ? "#FFB200" : "#060297" }} /></div>
                    </li>))}</ol>
                  <div className="mt-4"><Table head={[{ label: "Step" }, { label: "Visitors", right: true }, { label: "% of first", right: true }, { label: "% of previous", right: true }, { label: "Median time from previous", right: true }]}
                    rows={r.steps.map((s) => [s.label, fmt(s.visitors), pct(s.pctOfFirst), pct(s.pctOfPrevious), s.medianSecondsFromPrevious == null ? "—" : dur(s.medianSecondsFromPrevious)])} /></div>
                  {r.truncated && <p className="mt-2 text-xs text-amber-700">Row cap reached — narrow the date range for exact numbers.</p>}
                </>
              )}
            </Section>
          );
        })}
        {manage ? <Section title="Create a custom funnel" subtitle="Up to 8 steps. Events: e.g. cta_click, form_start, whatsapp_click, pricing_view, lead_created."><FunnelBuilder /></Section> : null}
      </div>
    </div>
  );
}
