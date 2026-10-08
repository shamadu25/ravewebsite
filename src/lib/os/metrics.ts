import { prisma } from "@/lib/prisma";
import { ORG_ID, PIPELINE_STAGES } from "./constants";
import { computeGoalState, defaultGoal, type GoalConfig, type GoalState } from "./goals";
import { isLiveAt, monthlyCents, mrrCentsAt } from "./mrr";

const GOAL_KEY = `os:${ORG_ID}:goal`;

export async function getGoal(): Promise<GoalConfig> {
  const row = await prisma.systemSetting.findUnique({ where: { key: GOAL_KEY } });
  return { ...defaultGoal(), ...((row?.value as Partial<GoalConfig> | null) ?? {}) };
}

export async function saveGoal(goal: GoalConfig): Promise<void> {
  await prisma.systemSetting.upsert({ where: { key: GOAL_KEY }, create: { key: GOAL_KEY, value: goal as never }, update: { value: goal as never } });
}

export interface RevenueMetrics {
  mrrUsd: number;
  arrUsd: number;
  mrrThirtyDaysAgoUsd: number | null;
  revenueThisMonthUsd: number;
  revenueLastMonthUsd: number;
  activeCustomers: number;
  byEngine: Record<string, number>;
  byBusinessUnit: Record<string, number>;
  hasDemoData: boolean;
  entryCount: number;
}

const cents = (n: number) => Math.round(n) / 100;

/** MRR = sum of recurring entries active "now" (started, not ended). All figures come from the ledger — nothing is estimated. */
export async function getRevenueMetrics(now = new Date()): Promise<RevenueMetrics> {
  const entries = await prisma.osRevenueEntry.findMany({ where: { orgId: ORG_ID }, include: { customer: { select: { status: true } } } });
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const lastMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
  const thirtyAgo = new Date(now.getTime() - 30 * 86400_000);

  const recurringAt = (at: Date) => entries.filter((e) => isLiveAt(e, at));
  const sum = (xs: typeof entries) => xs.reduce((n, e) => n + e.amountCents, 0); // cash received
  const activeNow = recurringAt(now);
  const mrrCents = mrrCentsAt(entries, now);
  const hasHistory = entries.some((e) => e.kind === "RECURRING" && e.occurredAt <= thirtyAgo);

  const byEngine: Record<string, number> = {};
  const byBusinessUnit: Record<string, number> = {};
  for (const e of activeNow) {
    byEngine[e.revenueEngine] = (byEngine[e.revenueEngine] ?? 0) + monthlyCents(e) * 12;
    byBusinessUnit[e.businessUnit] = (byBusinessUnit[e.businessUnit] ?? 0) + monthlyCents(e) * 12;
  }
  for (const k of Object.keys(byEngine)) byEngine[k] = cents(byEngine[k]);
  for (const k of Object.keys(byBusinessUnit)) byBusinessUnit[k] = cents(byBusinessUnit[k]);

  const inMonth = (e: (typeof entries)[number], from: Date, to: Date) => e.occurredAt >= from && e.occurredAt < to;
  const monthEntries = entries.filter((e) => inMonth(e, monthStart, now));
  const lastMonthEntries = entries.filter((e) => inMonth(e, lastMonthStart, monthStart));

  return {
    mrrUsd: cents(mrrCents),
    arrUsd: cents(mrrCents * 12),
    mrrThirtyDaysAgoUsd: hasHistory ? cents(mrrCentsAt(entries, thirtyAgo)) : null,
    revenueThisMonthUsd: cents(sum(monthEntries)),
    revenueLastMonthUsd: cents(sum(lastMonthEntries)),
    activeCustomers: new Set(activeNow.map((e) => e.customerId).filter((x) => x != null)).size,
    byEngine,
    byBusinessUnit,
    hasDemoData: entries.some((e) => e.isDemo),
    entryCount: entries.length,
  };
}

export interface PipelineMetrics {
  byStage: Record<string, { count: number; valueUsd: number }>;
  openValueUsd: number;
  weightedValueUsd: number;
  openCount: number;
  won30d: number;
  lost30d: number;
  winRate30d: number | null;
}

export async function getPipelineMetrics(now = new Date()): Promise<PipelineMetrics> {
  const opps = await prisma.osOpportunity.findMany({ where: { orgId: ORG_ID }, select: { stage: true, dealValueCents: true, probability: true, updatedAt: true } });
  const byStage: PipelineMetrics["byStage"] = Object.fromEntries(PIPELINE_STAGES.map((s) => [s, { count: 0, valueUsd: 0 }]));
  let open = 0, weighted = 0, openCount = 0, won = 0, lost = 0;
  const since = now.getTime() - 30 * 86400_000;
  for (const o of opps) {
    byStage[o.stage].count += 1;
    byStage[o.stage].valueUsd += cents(o.dealValueCents);
    if (!["WON", "LOST", "NURTURE"].includes(o.stage)) {
      open += o.dealValueCents; weighted += o.dealValueCents * o.probability; openCount += 1;
    }
    if (o.updatedAt.getTime() >= since) { if (o.stage === "WON") won++; if (o.stage === "LOST") lost++; }
  }
  return { byStage, openValueUsd: cents(open), weightedValueUsd: cents(weighted), openCount, won30d: won, lost30d: lost, winRate30d: won + lost >= 3 ? won / (won + lost) : null };
}

export async function getGoalState(): Promise<{ goal: GoalConfig; state: GoalState; revenue: RevenueMetrics; pipeline: PipelineMetrics }> {
  const [goal, revenue, pipeline] = await Promise.all([getGoal(), getRevenueMetrics(), getPipelineMetrics()]);
  const state = computeGoalState(goal, {
    currentMrrUsd: revenue.mrrUsd,
    mrrThirtyDaysAgoUsd: revenue.mrrThirtyDaysAgoUsd,
    activeCustomers: revenue.activeCustomers,
    openPipelineUsd: pipeline.openValueUsd,
    weightedPipelineUsd: pipeline.weightedValueUsd,
  });
  return { goal, state, revenue, pipeline };
}
