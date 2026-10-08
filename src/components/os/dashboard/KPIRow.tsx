import { prisma } from "@/lib/prisma";
import { ORG_ID } from "@/lib/os/constants";
import { arrSeries, goalState } from "@/lib/os/dashboard-data";
import KPICard from "./KPICard";

const usd = (n: number) => `$${Math.round(n).toLocaleString()}`;

export default async function KPIRow() {
  const { goal, state, revenue, pipeline } = await goalState();
  const now = new Date();
  const ago30 = new Date(now.getTime() - 30 * 86400_000);
  const [series, customers, customers30, created] = await Promise.all([
    arrSeries(now.getUTCFullYear()),
    prisma.osCustomer.count({ where: { orgId: ORG_ID, status: { not: "CHURNED" } } }),
    prisma.osCustomer.count({ where: { orgId: ORG_ID, status: { not: "CHURNED" }, createdAt: { lte: ago30 } } }),
    prisma.osCustomer.findMany({ where: { orgId: ORG_ID }, select: { createdAt: true } }),
  ]);
  const mrrSpark = series.map((p) => (p.arrUsd == null ? null : p.arrUsd / 12));
  const custSpark = series.map((p) => (p.arrUsd == null ? null : created.filter((c) => c.createdAt <= new Date(Date.UTC(now.getUTCFullYear(), p.month + 1, 0, 23, 59, 59))).length));
  const arrChange = revenue.mrrThirtyDaysAgoUsd && revenue.mrrThirtyDaysAgoUsd > 0 ? revenue.mrrUsd / revenue.mrrThirtyDaysAgoUsd - 1 : null;
  const custChange = customers30 > 0 ? customers / customers30 - 1 : null;
  return (
    <section aria-label="Key metrics" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <KPICard label="Revenue (ARR)" value={usd(state.currentArrUsd)} change={arrChange} noTrendReason="Needs 30 days of history" progress={state.progressPct / 100} footnote={`of ${usd(goal.annualRevenueTargetUsd)} target`} />
      <KPICard label="Monthly Recurring Revenue" value={usd(state.currentMrrUsd)} change={arrChange} noTrendReason="Needs 30 days of history" spark={mrrSpark} />
      <KPICard label="Total Customers" value={String(customers)} change={custChange} noTrendReason={customers30 === 0 ? "No customers 30 days ago" : undefined} spark={custSpark} />
      <KPICard label="Sales Pipeline" value={usd(pipeline.openValueUsd)} noTrendReason="Pipeline history isn't tracked yet" footnote={`${pipeline.openCount} open deal${pipeline.openCount === 1 ? "" : "s"} · ${usd(pipeline.weightedValueUsd)} weighted`} />
    </section>
  );
}
