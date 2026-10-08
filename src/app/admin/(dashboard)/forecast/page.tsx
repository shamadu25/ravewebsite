import { prisma } from "@/lib/prisma";
import { ORG_ID } from "@/lib/os/constants";
import { getGoalState } from "@/lib/os/metrics";
import { forecast } from "@/lib/os/forecast";
import { Card, PageHeader, Stat, usd } from "@/components/os/ui";

export const dynamic = "force-dynamic";

export default async function ForecastPage() {
  const { goal, state } = await getGoalState();
  const [opps, churned, total] = await Promise.all([
    prisma.osOpportunity.findMany({ where: { orgId: ORG_ID }, select: { dealValueCents: true, probability: true, stage: true } }),
    prisma.osCustomer.count({ where: { orgId: ORG_ID, status: "CHURNED" } }),
    prisma.osCustomer.count({ where: { orgId: ORG_ID } }),
  ]);
  // Churn is only "measured" with a meaningful customer base.
  const monthlyChurn = total >= 20 ? churned / total / 12 : null;
  const f = forecast({ currentMrrUsd: state.currentMrrUsd, opps, monthsRemaining: state.monthsRemaining, targetArrUsd: goal.annualRevenueTargetUsd, monthlyChurn });
  return (
    <div className="space-y-6">
      <PageHeader title="Revenue forecast" subtitle={`Monte Carlo over the existing pipeline, ${state.monthsRemaining.toFixed(1)} months to ${goal.endDate}.`} />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Conservative ARR (P10)" value={usd(f.conservativeArrUsd)} />
        <Stat label="Base ARR (P50)" value={usd(f.baseArrUsd)} />
        <Stat label="Aggressive ARR (P90)" value={usd(f.aggressiveArrUsd)} />
        <Stat label={`Chance of ${usd(goal.annualRevenueTargetUsd)}`} value={`${(f.probabilityOfTarget * 100).toFixed(1)}%`} tone={f.probabilityOfTarget < 0.1 ? "bad" : "good"} hint="From known pipeline only" />
      </div>
      {f.insufficientData.map((m) => <p key={m} className="text-sm text-amber-700">INSUFFICIENT DATA: {m}</p>)}
      <Card>
        <h2 className="mb-2 text-sm font-semibold text-gray-900">Assumptions</h2>
        <ul className="list-disc space-y-1 pl-5 text-sm text-gray-700">{f.assumptions.map((a) => <li key={a}>{a}</li>)}</ul>
      </Card>
    </div>
  );
}
