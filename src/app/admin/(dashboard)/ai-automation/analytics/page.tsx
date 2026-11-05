import { Card, PageHeader, Stat } from "@/components/os/ui";
import { funnelStats, performanceBreakdown } from "@/lib/ai-automation/analytics";
import { requireAdmin } from "@/lib/ai-automation/admin-auth";
import { human } from "@/lib/ai-automation/format";
import { formatMoney } from "@/lib/ai-automation/pricing";

export const dynamic = "force-dynamic";

const money = (m: Record<string, number>) => Object.entries(m).map(([c, v]) => formatMoney(v, c)).join(" + ") || "—";

export default async function AiAnalytics() {
  const { allowed } = await requireAdmin("ai.read");
  if (!allowed) return <p>No access.</p>;
  const [f, p] = await Promise.all([funnelStats(), performanceBreakdown()]);
  return (
    <div>
      <PageHeader title="Analytics" subtitle="Last 30 days. Funnel events are anonymous: no IP address, no cookies, no personal data." />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Landing page views" value={String(f.pageViews)} hint={`${f.industryPageViews} on industry pages`} />
        <Stat label="Assessment starts" value={String(f.assessmentStarts)} />
        <Stat label="Completed assessments" value={String(f.submissions)} />
        <Stat label="Completion rate" value={f.completionRate == null ? "—" : `${f.completionRate}%`} hint={`${f.abandonment} abandoned`} />
      </div>
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card><h2 className="mb-3 text-base font-semibold">Where people reach each step (abandonment)</h2>{f.stepViews.length === 0 ? <p className="text-sm text-gray-500">No data yet.</p> : <ul className="space-y-1.5 text-sm">{f.stepViews.map((s) => <li key={s.step} className="flex justify-between"><span>Step {s.step}</span><span className="tabular-nums">{s.count}</span></li>)}</ul>}</Card>
        <Card><h2 className="mb-3 text-base font-semibold">Industry funnel</h2><table className="w-full text-sm"><thead><tr className="text-left text-xs text-gray-500"><th>Industry</th><th>Views</th><th>Starts</th><th>Completed</th></tr></thead><tbody>{f.byIndustry.map((i) => <tr key={i.industry} className="border-t border-gray-100"><td className="py-1.5">{human(i.industry)}</td><td>{i.views}</td><td>{i.starts}</td><td>{i.submissions}</td></tr>)}</tbody></table></Card>
        <Card><h2 className="mb-3 text-base font-semibold">Industry performance</h2><table className="w-full text-sm"><thead><tr className="text-left text-xs text-gray-500"><th>Industry</th><th>Leads</th><th>Qualified</th><th>Won</th><th>Pipeline</th><th>Recurring / mo</th></tr></thead><tbody>{p.industry.map((r) => <tr key={r.name} className="border-t border-gray-100"><td className="py-1.5">{human(r.name)}</td><td>{r.leads}</td><td>{r.qualified}</td><td>{r.accepted}</td><td>{money(r.value)}</td><td>{money(r.mrr)}</td></tr>)}</tbody></table></Card>
        <Card><h2 className="mb-3 text-base font-semibold">Country performance</h2><table className="w-full text-sm"><thead><tr className="text-left text-xs text-gray-500"><th>Country</th><th>Leads</th><th>Qualified</th><th>Won</th><th>Pipeline</th></tr></thead><tbody>{p.country.map((r) => <tr key={r.name} className="border-t border-gray-100"><td className="py-1.5">{r.name}</td><td>{r.leads}</td><td>{r.qualified}</td><td>{r.accepted}</td><td>{money(r.value)}</td></tr>)}</tbody></table></Card>
      </div>
    </div>
  );
}
