import { getGoalState } from "@/lib/os/metrics";
import ApiForm from "@/components/os/ApiForm";
import { Card, PageHeader, Stat, usd } from "@/components/os/ui";

export const dynamic = "force-dynamic";
const p = (n: number | null) => (n == null ? "No data" : `${(n * 100).toFixed(1)}%`);

export default async function GoalsPage() {
  const { goal, state, revenue } = await getGoalState();
  return (
    <div className="space-y-6">
      <PageHeader title="Company goal" subtitle="The Commander recalculates all of this from the revenue ledger. Values it cannot derive are shown as No data, never estimated." />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Target ARR" value={usd(state.targetArrUsd)} />
        <Stat label="Current ARR" value={usd(state.currentArrUsd)} />
        <Stat label="Remaining" value={usd(state.remainingArrUsd)} />
        <Stat label="Required extra MRR" value={usd(state.requiredAdditionalMrrUsd)} />
        <Stat label="Required new MRR / month" value={state.requiredMonthlyNewMrrUsd == null ? "No data" : usd(state.requiredMonthlyNewMrrUsd)} />
        <Stat label="Customers needed" value={String(state.requiredCustomers ?? "No data")} />
        <Stat label="Growth (30d)" value={p(state.monthlyGrowthRate)} hint={`Required ${p(state.requiredMonthlyGrowthRate)}`} />
        <Stat label="Projected date" value={state.projectedAchievementDate ?? "No data"} />
      </div>
      {state.insufficientData.length > 0 && <p className="text-xs text-amber-700">INSUFFICIENT DATA: {state.insufficientData.join(" · ")}</p>}
      <Card>
        <h2 className="mb-1 text-sm font-semibold text-gray-900">Revenue by engine (ARR)</h2>
        <p className="text-sm text-gray-700">{Object.keys(revenue.byEngine).length ? Object.entries(revenue.byEngine).map(([k, v]) => `${k.replace(/_/g, " ")}: ${usd(v)}`).join(" · ") : "No recurring revenue recorded yet."}</p>
        <p className="mt-1 text-sm text-gray-700">{Object.keys(revenue.byBusinessUnit).length ? Object.entries(revenue.byBusinessUnit).map(([k, v]) => `${k}: ${usd(v)}`).join(" · ") : ""}</p>
      </Card>
      <Card>
        <h2 className="mb-3 text-sm font-semibold text-gray-900">Edit goal</h2>
        <ApiForm method="PUT" url="/api/os/goal" submitLabel="Save goal" fields={[
          { name: "annualRevenueTargetUsd", label: "Annual revenue target (USD)", type: "number", required: true, defaultValue: goal.annualRevenueTargetUsd },
          { name: "avgRevenuePerCustomerUsd", label: "Avg annual revenue per customer (USD)", type: "number", defaultValue: goal.avgRevenuePerCustomerUsd ?? undefined },
          { name: "pipelineTargetUsd", label: "Pipeline target (USD)", type: "number", defaultValue: goal.pipelineTargetUsd ?? undefined },
          { name: "endDate", label: "Deadline (YYYY-MM-DD)", defaultValue: goal.endDate },
        ]} />
      </Card>
    </div>
  );
}
