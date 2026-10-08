import { prisma } from "@/lib/prisma";
import { ORG_ID } from "./constants";

export interface AgentPerf {
  key: string; name: string; department: string; tasks: number; completed: number; failed: number; successRate: number | null;
  avgSeconds: number | null; costUsd: number; escalations: number; opportunitiesWon: number; revenueInfluencedUsd: number; costPerRevenueDollar: number | null;
}

/** Revenue attribution = WON opportunities the agent worked on (tasks linked to the deal). "Influenced", not "generated". */
export async function getAgentPerformance(): Promise<AgentPerf[]> {
  const [agents, tasks, approvals, won] = await Promise.all([
    prisma.osAgent.findMany({ where: { orgId: ORG_ID } }),
    prisma.osTask.findMany({ where: { orgId: ORG_ID }, select: { agentId: true, status: true, costUsd: true, startedAt: true, completedAt: true, opportunityId: true } }),
    prisma.osApproval.groupBy({ by: ["requestedBy"], where: { orgId: ORG_ID }, _count: true }),
    prisma.osOpportunity.findMany({ where: { orgId: ORG_ID, stage: "WON" }, select: { id: true, dealValueCents: true } }),
  ]);
  const wonById = new Map(won.map((w) => [w.id, w.dealValueCents]));
  return agents.map((a) => {
    const mine = tasks.filter((t) => t.agentId === a.id);
    const completed = mine.filter((t) => t.status === "COMPLETED").length;
    const failed = mine.filter((t) => t.status === "FAILED").length;
    const secs = mine.filter((t) => t.startedAt && t.completedAt).map((t) => ((t.completedAt as Date).getTime() - (t.startedAt as Date).getTime()) / 1000);
    const wonIds = new Set(mine.map((t) => t.opportunityId).filter((x): x is number => x != null && wonById.has(x)));
    const revenue = [...wonIds].reduce((n, id) => n + (wonById.get(id) ?? 0), 0) / 100;
    const cost = mine.reduce((n, t) => n + t.costUsd, 0);
    return {
      key: a.key, name: a.name, department: a.department, tasks: mine.length, completed, failed,
      successRate: completed + failed ? completed / (completed + failed) : null,
      avgSeconds: secs.length ? secs.reduce((x, y) => x + y, 0) / secs.length : null,
      costUsd: cost, escalations: approvals.find((x) => x.requestedBy === `agent:${a.key}`)?._count ?? 0,
      opportunitiesWon: wonIds.size, revenueInfluencedUsd: revenue, costPerRevenueDollar: revenue > 0 ? cost / revenue : null,
    };
  }).sort((x, y) => y.revenueInfluencedUsd - x.revenueInfluencedUsd || y.completed - x.completed);
}

export async function getCostBreakdown() {
  const rows = await prisma.osTask.groupBy({ by: ["department"], where: { orgId: ORG_ID }, _sum: { costUsd: true, inputTokens: true, outputTokens: true }, _count: true });
  return rows.map((r) => ({ department: r.department, tasks: r._count, costUsd: r._sum.costUsd ?? 0, tokens: (r._sum.inputTokens ?? 0) + (r._sum.outputTokens ?? 0), costPerTask: r._count ? (r._sum.costUsd ?? 0) / r._count : 0 }));
}
