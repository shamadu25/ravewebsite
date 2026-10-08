import { prisma } from "@/lib/prisma";
import { ORG_ID } from "@/lib/os/constants";
import { getAgentPerformance, getCostBreakdown } from "@/lib/os/performance";
import DownloadLink from "@/components/os/DownloadLink";
import ApiButton from "@/components/os/ApiButton";
import { Card, PageHeader, usd } from "@/components/os/ui";

export const dynamic = "force-dynamic";

export default async function PerformancePage() {
  const [perf, cost, learnings] = await Promise.all([getAgentPerformance(), getCostBreakdown(), prisma.osLearning.findMany({ where: { orgId: ORG_ID, status: "PROPOSED" } })]);
  const rows = perf.filter((p) => p.tasks > 0);
  return (
    <div className="space-y-6">
      <PageHeader title="Agent performance" subtitle="Ranked by revenue influenced: WON deals the agent worked on. Influence is not the same as sole credit." actions={<DownloadLink href="/api/os/reports/agents">Export CSV</DownloadLink>} />
      {learnings.length > 0 && (
        <Card className="border-amber-200">
          <h2 className="mb-2 text-sm font-semibold text-gray-900">Learning candidates (need your decision)</h2>
          {learnings.map((l) => (
            <div key={l.id} className="mb-3 text-sm"><p className="text-gray-800">{l.observation}</p><p className="text-xs text-gray-500">Proposal: {(l.proposal as { reason: string; autonomy: string }).reason} → autonomy {(l.proposal as { autonomy: string }).autonomy}</p>
              <div className="mt-1 flex gap-2"><ApiButton label="Accept (new version)" variant="primary" url={`/api/os/learning/${l.id}`} body={{ accept: true }} /><ApiButton label="Dismiss" url={`/api/os/learning/${l.id}`} body={{ accept: false }} /></div></div>
          ))}
        </Card>
      )}
      <div className="overflow-x-auto os-card">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-gray-200 text-left text-xs text-gray-500">{["Agent", "Tasks", "Success", "Avg time", "Cost", "Escalations", "Deals won", "Revenue influenced", "Cost / $"].map((h) => <th key={h} className="px-3 py-2 font-medium">{h}</th>)}</tr></thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan={9} className="px-4 py-8 text-center text-gray-400">No agent activity yet.</td></tr>}
            {rows.map((p) => (
              <tr key={p.key} className="border-b border-gray-100 last:border-0">
                <td className="px-3 py-2 font-medium text-gray-900">{p.name}</td><td className="px-3 py-2">{p.tasks}</td>
                <td className="px-3 py-2">{p.successRate == null ? "—" : `${Math.round(p.successRate * 100)}%`}</td>
                <td className="px-3 py-2">{p.avgSeconds == null ? "—" : `${p.avgSeconds.toFixed(1)}s`}</td>
                <td className="px-3 py-2">${p.costUsd.toFixed(3)}</td><td className="px-3 py-2">{p.escalations}</td><td className="px-3 py-2">{p.opportunitiesWon}</td>
                <td className="px-3 py-2">{usd(p.revenueInfluencedUsd)}</td><td className="px-3 py-2">{p.costPerRevenueDollar == null ? "—" : p.costPerRevenueDollar.toFixed(4)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Card>
        <h2 className="mb-2 text-sm font-semibold text-gray-900">AI cost by department</h2>
        <ul className="space-y-1 text-sm">{cost.map((c) => <li key={c.department} className="flex justify-between"><span>{c.department.replace(/_/g, " ")} · {c.tasks} tasks · {c.tokens.toLocaleString()} tokens</span><span>${c.costUsd.toFixed(4)} (${c.costPerTask.toFixed(4)}/task)</span></li>)}{cost.length === 0 && <li className="text-gray-500">No cost recorded.</li>}</ul>
        <p className="mt-2 text-xs text-gray-400">Costs are estimates from token usage and the configured price table. Per-agent budgets pause an agent and request approval when exceeded.</p>
      </Card>
    </div>
  );
}
