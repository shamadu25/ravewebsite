import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { ORG_ID } from "./constants";
import { getGoalState } from "./metrics";
import { rankPriorities } from "./commander";

/** Request-scoped caches so every dashboard section shares one query instead of re-running it. */
export const goalState = cache(getGoalState);
export const priorities = cache(rankPriorities);

const cents = (n: number) => n / 100;

export interface ArrPoint { month: number; label: string; arrUsd: number | null }

/** ARR at the end of each month of `year`, from the revenue ledger. Future months are null (never extrapolated here). */
export const arrSeries = cache(async (year: number, now = new Date()): Promise<ArrPoint[]> => {
  const entries = await prisma.osRevenueEntry.findMany({ where: { orgId: ORG_ID, kind: "RECURRING" }, select: { amountCents: true, occurredAt: true, recurringEndsAt: true } });
  const labels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return labels.map((label, i) => {
    const end = new Date(Date.UTC(year, i + 1, 0, 23, 59, 59));
    if (end > now && !(now.getUTCFullYear() === year && now.getUTCMonth() === i)) return { month: i, label, arrUsd: null };
    const at = end > now ? now : end;
    const mrr = entries.filter((e) => e.occurredAt <= at && (!e.recurringEndsAt || e.recurringEndsAt > at)).reduce((n, e) => n + e.amountCents, 0);
    return { month: i, label, arrUsd: cents(mrr * 12) };
  });
});

export const SEGMENTS = ["KOVABOT", "CLIQPOS", "AI_SERVICES", "HMS", "RESTOVAX"] as const;
export const SEGMENT_LABEL: Record<string, string> = { KOVABOT: "KOVABOT", CLIQPOS: "CliqPOS", AI_SERVICES: "AI Implementation Services", HMS: "HMS", RESTOVAX: "Restovax", RAVESOFT: "Other" };

/** Current ARR per segment. Services revenue is its own segment (partition, so shares always sum to 100%). */
export const revenueSegments = cache(async () => {
  const now = new Date();
  const entries = await prisma.osRevenueEntry.findMany({ where: { orgId: ORG_ID, kind: "RECURRING", occurredAt: { lte: now } }, select: { amountCents: true, businessUnit: true, revenueEngine: true, recurringEndsAt: true } });
  const live = entries.filter((e) => !e.recurringEndsAt || e.recurringEndsAt > now);
  const totals: Record<string, number> = {};
  for (const e of live) {
    const seg = e.revenueEngine === "AI_EMPLOYEE_SERVICES" ? "AI_SERVICES" : e.businessUnit;
    totals[seg] = (totals[seg] ?? 0) + e.amountCents * 12;
  }
  const total = Object.values(totals).reduce((a, b) => a + b, 0);
  const keys = [...SEGMENTS, ...Object.keys(totals).filter((k) => !(SEGMENTS as readonly string[]).includes(k))];
  return keys.map((k) => ({ key: k, label: SEGMENT_LABEL[k] ?? k, arrUsd: cents(totals[k] ?? 0), share: total ? (totals[k] ?? 0) / total : 0 })).filter((r, i) => i < SEGMENTS.length || r.arrUsd > 0);
});

export const workforce = cache(async () => {
  const since = new Date(Date.now() - 7 * 86400_000);
  const dayStart = new Date(); dayStart.setHours(0, 0, 0, 0);
  const [agents, tasks] = await Promise.all([
    prisma.osAgent.findMany({ where: { orgId: ORG_ID } }),
    prisma.osTask.findMany({ where: { orgId: ORG_ID, createdAt: { gte: since } }, select: { agentId: true, createdAt: true, status: true } }),
  ]);
  const rows = agents.map((a) => {
    const mine = tasks.filter((t) => t.agentId === a.id);
    const spark = Array.from({ length: 7 }, (_, i) => { const d0 = new Date(dayStart.getTime() - (6 - i) * 86400_000); const d1 = new Date(d0.getTime() + 86400_000); return mine.filter((t) => t.createdAt >= d0 && t.createdAt < d1).length; });
    return { key: a.key, name: a.name, description: a.description ?? a.role, status: a.status, isDirector: a.isDirector, department: a.department, tasksToday: spark[6], spark, week: mine.length };
  });
  const active = rows.filter((r) => r.status === "ACTIVE");
  const top = [...active].sort((x, y) => Number(y.isDirector) - Number(x.isDirector) || y.week - x.week).slice(0, 5);
  return { total: rows.length, active: active.length, top, tasksToday: rows.reduce((n, r) => n + r.tasksToday, 0) };
});

export { loopRunningSince } from "./loop-lock";
