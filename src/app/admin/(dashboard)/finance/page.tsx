import Link from "next/link";
import { goalState } from "@/lib/os/dashboard-data";
import { prisma } from "@/lib/prisma";
import { ORG_ID } from "@/lib/os/constants";
import { forecast } from "@/lib/os/forecast";
import { Badge, Card, PageHeader, Stat, usd } from "@/components/os/ui";
import ApiForm from "@/components/os/ApiForm";
import { paystackConfigured } from "@/lib/os/paystack";

export const dynamic = "force-dynamic";
const NC = "Not connected";

export default async function FinancePage() {
  const { goal, state, revenue } = await goalState();
  const opps = await prisma.osOpportunity.findMany({ where: { orgId: ORG_ID }, select: { dealValueCents: true, probability: true, stage: true } });
  const f = forecast({ currentMrrUsd: state.currentMrrUsd, opps, monthsRemaining: state.monthsRemaining, targetArrUsd: goal.annualRevenueTargetUsd, monthlyChurn: null });
  const plans = await prisma.osPlan.findMany({ where: { orgId: ORG_ID }, orderBy: { id: "asc" } });
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
      <Card id="plans">
        <div className="mb-1 flex flex-wrap items-center justify-between gap-2"><h2 className="text-[15px] font-semibold">Plans you sell</h2><span className="text-[12px] text-[var(--muted)]">Online payment: {paystackConfigured() ? "Paystack connected" : "NOT CONNECTED (set PAYSTACK_SECRET_KEY)"}</span></div>
        <p className="mb-3 text-[13px] text-[var(--muted)]">Each plan becomes a pay-now link and a Paystack subscription. Plans marked <b>assumed</b> use my placeholder prices — edit them to your real prices before sending links.</p>
        <ul className="mb-4 divide-y divide-[var(--border)] text-[14px]">
          {plans.map((p) => <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 py-2"><span><b>{p.name}</b> <span className="font-mono text-[11px] text-[var(--muted)]">{p.key}</span></span><span className="flex items-center gap-2 tabular-nums">${(p.amountCents / 100).toLocaleString()}/{p.periodMonths === 1 ? "mo" : `${p.periodMonths}mo`} {p.assumed && <Badge>PENDING</Badge>} {!p.active && <Badge>PAUSED</Badge>}</span></li>)}
          {plans.length === 0 && <li className="py-3 text-[var(--muted)]">No plans yet — run Set up AI Employees, or add one below.</li>}
        </ul>
        <ApiForm url="/api/os/plans" submitLabel="Save plan" fields={[
          { name: "key", label: "Key (a-z, 0-9, -)", required: true, placeholder: "cliqpos-pro-monthly" }, { name: "name", label: "Name", required: true },
          { name: "amountUsd", label: "Price (USD)", type: "number", required: true }, { name: "periodMonths", label: "Billing period (months: 1, 3, 6, 12)", type: "number", defaultValue: 1 },
          { name: "businessUnit", label: "Business unit", type: "select", options: ["KOVABOT", "CLIQPOS", "HMS", "RESTOVAX", "RAVESOFT"] }, { name: "revenueEngine", label: "Revenue engine", type: "select", options: ["SAAS", "AI_EMPLOYEE_SERVICES", "ENTERPRISE"] },
        ]} />
      </Card>
      <Card>
        <h2 className="text-[15px] font-semibold">AI operating cost</h2>
        <p className="mt-1 text-[14px] text-[var(--muted)]">Estimated model spend to date: <b className="text-[var(--foreground)]">${(tasks._sum.costUsd ?? 0).toFixed(2)}</b>. Per-agent budgets pause an agent and request approval when exceeded.</p>
        <div className="mt-3 flex flex-wrap gap-3 text-[13px]"><Link className="text-[var(--primary)]" href="/admin/forecast">Full forecast →</Link><Link className="text-[var(--primary)]" href="/admin/performance">Cost by department →</Link><Link className="text-[var(--primary)]" href="/admin/goals">Edit revenue goal →</Link></div>
      </Card>
    </div>
  );
}
