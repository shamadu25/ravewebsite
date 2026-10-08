import Link from "next/link";
import { arrSeries, goalState } from "@/lib/os/dashboard-data";
import RevenueChart from "./RevenueChart";

const usd = (n: number) => `$${Math.round(n).toLocaleString()}`;

export default async function RevenueProgress() {
  const { goal, state, revenue } = await goalState();
  const now = new Date();
  const series = await arrSeries(now.getUTCFullYear());
  const pct = state.progressPct;
  const empty = revenue.entryCount === 0;
  const targetK = goal.annualRevenueTargetUsd >= 1000 ? `${Math.round(goal.annualRevenueTargetUsd / 1000)}K` : String(goal.annualRevenueTargetUsd);
  return (
    <section className="os-card p-6 lg:p-7" aria-labelledby="rev-progress">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 id="rev-progress" className="text-[20px] font-semibold tracking-tight">Revenue Progress to ${targetK}</h2>
          <p className="mt-1 text-[14px] text-[var(--muted)]"><span className="font-medium text-[var(--foreground)] tabular-nums">{usd(state.currentArrUsd)}</span> / {usd(goal.annualRevenueTargetUsd)}</p>
        </div>
        <p className="text-[40px] font-semibold leading-none tracking-tight text-[var(--primary)] tabular-nums">{pct < 10 ? pct.toFixed(1) : Math.round(pct)}%</p>
      </div>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-[var(--primary-soft)]" role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100} aria-label="Progress to revenue target">
        <div className="h-full rounded-full bg-gradient-to-r from-[var(--primary)] to-[var(--primary-bright)] transition-[width] duration-700" style={{ width: `${Math.max(empty ? 0 : 1.5, pct)}%` }} />
      </div>
      {empty ? (
        <div className="mt-8 rounded-[14px] bg-[var(--background)] p-6 text-center">
          <p className="text-[15px] font-medium">No revenue data yet</p>
          <p className="mx-auto mt-1 max-w-sm text-[13px] text-[var(--muted)]">Connect your revenue sources to begin tracking ARR. Payments recorded on a deal or sent by the payments webhook appear here automatically.</p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <Link href="/admin/integrations" className="rounded-[10px] bg-[var(--primary)] px-4 py-2 text-[13px] font-medium text-white hover:bg-[var(--primary-hover)]">Configure integrations →</Link>
            <Link href="/admin/revenue" className="rounded-[10px] border border-[var(--border)] bg-white px-4 py-2 text-[13px] font-medium">Add a prospect</Link>
          </div>
        </div>
      ) : (
        <div className="mt-6">
          <RevenueChart series={series} targetUsd={goal.annualRevenueTargetUsd} monthlyGrowth={state.monthlyGrowthRate} currentMonth={now.getUTCMonth()} />
          <dl className="mt-4 grid grid-cols-2 gap-4 border-t border-[var(--border)] pt-4 text-[13px] sm:grid-cols-4">
            <div><dt className="text-[var(--muted)]">Gap to target</dt><dd className="mt-0.5 font-medium tabular-nums">{usd(state.remainingArrUsd)}</dd></div>
            <div><dt className="text-[var(--muted)]">Extra MRR needed</dt><dd className="mt-0.5 font-medium tabular-nums">{usd(state.requiredAdditionalMrrUsd)}</dd></div>
            <div><dt className="text-[var(--muted)]">Monthly growth</dt><dd className="mt-0.5 font-medium">{state.monthlyGrowthRate == null ? "No data" : `${(state.monthlyGrowthRate * 100).toFixed(1)}%`}</dd></div>
            <div><dt className="text-[var(--muted)]">Projected date</dt><dd className="mt-0.5 font-medium">{state.projectedAchievementDate ?? "No data"}</dd></div>
          </dl>
        </div>
      )}
    </section>
  );
}
