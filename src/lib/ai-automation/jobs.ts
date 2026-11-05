/**
 * Durable job queue on MySQL. Vercel functions are short-lived, so work is split into small idempotent jobs.
 * Jobs are drained inline right after a submission (via next/server `after`) and by the scheduler tick, which also recovers stale jobs.
 */
import { prisma } from "@/lib/prisma";
import type { JobType } from "./types";

export type JobHandler = (payload: Record<string, unknown>, job: { id: number; attempts: number; maxAttempts: number }) => Promise<void>;
const handlers: Partial<Record<JobType, JobHandler>> = {};
export const registerHandler = (type: JobType, fn: JobHandler) => { handlers[type] = fn; };

let failureHook: ((job: { id: number; type: string }, error: string) => Promise<void>) | null = null;
export const setFailureHook = (fn: typeof failureHook) => { failureHook = fn; };

const STALE_MS = 5 * 60_000;
const isUnique = (e: unknown) => typeof e === "object" && e !== null && (e as { code?: string }).code === "P2002";

/** Exponential backoff: 30s, 2m, 8m, 32m… capped at 6h. */
export const backoffMs = (attempt: number) => Math.min(6 * 3_600_000, 30_000 * Math.pow(4, Math.max(0, attempt - 1)));

export async function enqueueJob(i: { type: JobType; key: string; payload: Record<string, unknown>; runAfter?: Date; maxAttempts?: number }) {
  try {
    const job = await prisma.aiJob.create({ data: { type: i.type, idempotencyKey: i.key.slice(0, 160), payload: i.payload as never, runAfter: i.runAfter ?? new Date(), maxAttempts: i.maxAttempts ?? 4 } });
    return { job, created: true };
  } catch (e) {
    if (isUnique(e)) return { job: await prisma.aiJob.findUnique({ where: { idempotencyKey: i.key.slice(0, 160) } }), created: false };
    throw e;
  }
}

async function claim(types?: JobType[]) {
  const now = new Date();
  const candidates = await prisma.aiJob.findMany({ where: { status: "QUEUED", runAfter: { lte: now }, ...(types ? { type: { in: types } } : {}) }, orderBy: { id: "asc" }, take: 10 });
  for (const c of candidates) {
    // Atomic claim: only one worker can flip QUEUED → RUNNING.
    const res = await prisma.aiJob.updateMany({ where: { id: c.id, status: "QUEUED" }, data: { status: "RUNNING", lockedAt: now, attempts: { increment: 1 } } });
    if (res.count === 1) return { ...c, attempts: c.attempts + 1 };
  }
  return null;
}

export async function recoverStaleJobs(): Promise<number> {
  const res = await prisma.aiJob.updateMany({ where: { status: "RUNNING", lockedAt: { lt: new Date(Date.now() - STALE_MS) } }, data: { status: "QUEUED", lockedAt: null, lastError: "Worker lost; requeued." } });
  return res.count;
}

export interface RunSummary { ran: number; done: number; retried: number; failed: number }

export async function runJobs(o: { budgetMs?: number; types?: JobType[] } = {}): Promise<RunSummary> {
  const started = Date.now();
  const budget = o.budgetMs ?? 45_000;
  const s: RunSummary = { ran: 0, done: 0, retried: 0, failed: 0 };
  await recoverStaleJobs().catch(() => 0);
  while (Date.now() - started < budget) {
    const job = await claim(o.types);
    if (!job) break;
    s.ran++;
    const handler = handlers[job.type as JobType];
    try {
      if (!handler) throw new Error(`No handler registered for ${job.type}`);
      await handler((job.payload ?? {}) as Record<string, unknown>, { id: job.id, attempts: job.attempts, maxAttempts: job.maxAttempts });
      await prisma.aiJob.update({ where: { id: job.id }, data: { status: "DONE", lockedAt: null, lastError: null } });
      s.done++;
    } catch (e) {
      const msg = (e instanceof Error ? e.message : String(e)).slice(0, 580);
      const final = job.attempts >= job.maxAttempts;
      await prisma.aiJob.update({ where: { id: job.id }, data: { status: final ? "FAILED" : "QUEUED", lockedAt: null, lastError: msg, runAfter: final ? undefined : new Date(Date.now() + backoffMs(job.attempts)) } });
      if (final) { s.failed++; console.error(`[ai-automation] job ${job.id} (${job.type}) failed permanently: ${msg}`); await failureHook?.({ id: job.id, type: job.type }, msg).catch(() => undefined); } else s.retried++;
    }
  }
  return s;
}

/** Admin: put a FAILED job back in the queue. */
export async function retryJob(id: number) {
  const job = await prisma.aiJob.findUnique({ where: { id } });
  if (!job) throw new Error("Job not found.");
  if (job.status !== "FAILED") throw new Error("Only failed jobs can be retried.");
  await prisma.aiJob.update({ where: { id }, data: { status: "QUEUED", attempts: 0, runAfter: new Date(), lockedAt: null, lastError: null } });
}
