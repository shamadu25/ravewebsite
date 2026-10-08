import Link from "next/link";
import { goalState } from "@/lib/os/dashboard-data";
import { prisma } from "@/lib/prisma";
import { ORG_ID } from "@/lib/os/constants";
import { forecast } from "@/lib/os/forecast";
import { Card, PageHeader, Stat, usd } from "@/components/os/ui";

export const dynamic = "force-dynamic";
const NC = "Not connected";

export default async function FinancePage() {
  const { goal, state, revenue } = await goalState();
  const opps = await prisma.osOpportunity.findMany({ where: { orgId: ORG_ID }, select: { dealValueCents: true, probability: true, stage: true } });
  const f = forecast({ currentMrrUsd: state.currentMrrUsd, opps, monthsRemaining: state.monthsRemaining, targetArrUsd: goal.annualRevenueTargetUsd, monthlyChurn: null });
  const tasks = await prisma.osTask.aggregate({ where: { orgId: ORG_ID }, _sum: { costUsd: true } });
  return (
    <div className="space-y-8">
      <PageHeader title="Finance" subtitle="Revenue figures come from the revenue ledger. Anything that needs an accounting or bank feed is shown as not connected." />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Revenue this month" value={usd(revenue.revenueThisMonthUsd)} hint={`Last month ${usd(revenue.revenueLastMonthUsd)}`} />
        <Stat label="MRR" value={usd(state.currentMrrUsd)} />
        <Stat label="ARR" value={usd(state.currentArrUsd)} hint={`${state.progressPct.toFixed(1)}% of ${usd(goal.annualRevenueTargetUsd)}`} />
        <Stat label="Forecast (base ARR)" value={usd(f.baseArrUsd)} hint={`${(f.probabilityOfTarget * 100).toFixed(0)}% chance of target`} />
        <Stat label="Expenses" value={NC} hint="Connect accounting" /><Stat label="Cash flow" value={NC} hint="Connect a bank feed" /><Stat label="Receivables" value={NC} hint="Connect invoicing" /><Stat label="Profit" value={NC} hint="Needs expenses" />
      </div>
      <Card>
        <h2 className="text-[15px] font-semibold">AI operating cost</h2>
        <p className="mt-1 text-[14px] text-[var(--muted)]">Estimated model spend to date: <b className="text-[var(--foreground)]">${(tasks._sum.costUsd ?? 0).toFixed(2)}</b>. Per-agent budgets pause an agent and request approval when exceeded.</p>
        <div className="mt-3 flex flex-wrap gap-3 text-[13px]"><Link className="text-[var(--primary)]" href="/admin/forecast">Full forecast →</Link><Link className="text-[var(--primary)]" href="/admin/performance">Cost by department →</Link><Link className="text-[var(--primary)]" href="/admin/goals">Edit revenue goal →</Link></div>
      </Card>
    </div>
  );
}
