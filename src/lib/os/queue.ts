import { prisma } from "@/lib/prisma";
import { ORG_ID, type Priority } from "./constants";
import { audit } from "./audit";
import { priorityBucket } from "./priority";

export interface EnqueueInput {
  agentKey: string;
  title: string;
  input?: Record<string, unknown>;
  priority?: Priority;
  priorityScore?: number;
  createdBy: string;
  runAfter?: Date;
  /** Same key → same task; makes cron re-runs and webhook retries safe. */
  idempotencyKey?: string;
  parentTaskId?: number | null;
  opportunityId?: number | null;
  customerId?: number | null;
  isDemo?: boolean;
}

export async function enqueueTask(i: EnqueueInput) {
  const agent = await prisma.osAgent.findUnique({ where: { key: i.agentKey } });
  if (!agent || agent.orgId !== ORG_ID) throw new Error(`Unknown agent "${i.agentKey}".`);
  if (i.idempotencyKey) {
    const existing = await prisma.osTask.findUnique({ where: { idempotencyKey: i.idempotencyKey } });
    if (existing) return { task: existing, created: false };
  }
  const priority = i.priority ?? (i.priorityScore != null ? priorityBucket(i.priorityScore) : "MEDIUM");
  try {
    const task = await prisma.osTask.create({
      data: {
        orgId: ORG_ID, agentId: agent.id, department: agent.department, title: i.title, priority, priorityScore: i.priorityScore ?? 0,
        input: (i.input ?? undefined) as never, createdBy: i.createdBy, runAfter: i.runAfter ?? new Date(),
        idempotencyKey: i.idempotencyKey ?? null, parentTaskId: i.parentTaskId ?? null, opportunityId: i.opportunityId ?? null,
        customerId: i.customerId ?? null, isDemo: i.isDemo ?? false,
      },
    });
    await audit({ actor: i.createdBy, actorType: i.createdBy.startsWith("agent:") ? "AI_AGENT" : "SYSTEM", action: "task.enqueue", resource: "task", resourceId: task.id, input: { agent: i.agentKey, title: i.title, priority } });
    return { task, created: true };
  } catch (e) {
    // Lost an idempotency race with a concurrent enqueue → return the winner.
    if (i.idempotencyKey) {
      const winner = await prisma.osTask.findUnique({ where: { idempotencyKey: i.idempotencyKey } });
      if (winner) return { task: winner, created: false };
    }
    throw e;
  }
}

const PRIORITY_ORDER: Record<string, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
const STALE_LOCK_MS = 5 * 60_000;

/** Requeue tasks whose worker died mid-run (serverless timeouts), counting it as a retry. */
export async function recoverStaleTasks(now = new Date()): Promise<number> {
  const stale = await prisma.osTask.findMany({ where: { orgId: ORG_ID, status: "RUNNING", lockedAt: { lt: new Date(now.getTime() - STALE_LOCK_MS) } } });
  for (const t of stale) {
    await prisma.osTask.update({ where: { id: t.id }, data: { status: "QUEUED", lockedAt: null, retryCount: { increment: 1 }, error: "Worker lost; task requeued." } });
  }
  return stale.length;
}

/** Atomically claim the next runnable task. updateMany with a status guard makes concurrent workers safe. */
export async function claimNextTask(now = new Date()) {
  const candidates = await prisma.osTask.findMany({
    where: { orgId: ORG_ID, status: "QUEUED", runAfter: { lte: now }, agent: { status: "ACTIVE" } },
    orderBy: [{ createdAt: "asc" }],
    take: 25,
  });
  candidates.sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority] || b.priorityScore - a.priorityScore || a.id - b.id);
  for (const c of candidates) {
    const claimed = await prisma.osTask.updateMany({ where: { id: c.id, status: "QUEUED" }, data: { status: "RUNNING", lockedAt: now, startedAt: c.startedAt ?? now } });
    if (claimed.count === 1) return c.id;
  }
  return null;
}
