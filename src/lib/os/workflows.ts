import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ORG_ID, PIPELINE_STAGES } from "./constants";
import { audit } from "./audit";
import { enqueueTask } from "./queue";
import { evalCondition, getPath, type Condition } from "./events";
import { raiseAlert } from "./alerts";
import { requestApproval } from "./approvals";
import { assertPublicUrl } from "./website";
import { setStage } from "./crm";

const Cond = z.object({ field: z.string(), op: z.enum(["eq", "neq", "gt", "gte", "lt", "lte", "contains"]), value: z.unknown() });
const Node = z.discriminatedUnion("type", [
  z.object({ id: z.string(), type: z.literal("AGENT"), agentKey: z.string(), title: z.string(), wait: z.boolean().optional(), next: z.string().optional() }),
  z.object({ id: z.string(), type: z.literal("CONDITION"), condition: Cond, next: z.string().optional(), else: z.string().optional() }),
  z.object({ id: z.string(), type: z.literal("DELAY"), minutes: z.number().int().min(1).max(60 * 24 * 30), next: z.string().optional() }),
  z.object({ id: z.string(), type: z.literal("APPROVAL"), title: z.string(), objective: z.string(), next: z.string().optional(), rejected: z.string().optional() }),
  z.object({ id: z.string(), type: z.literal("NOTIFICATION"), severity: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]), title: z.string(), next: z.string().optional() }),
  z.object({ id: z.string(), type: z.literal("HTTP"), url: z.string().url(), method: z.enum(["GET", "POST"]).default("GET"), body: z.record(z.string(), z.unknown()).optional(), next: z.string().optional() }),
  z.object({ id: z.string(), type: z.literal("CRM_STAGE"), stage: z.enum(PIPELINE_STAGES), next: z.string().optional() }),
  z.object({ id: z.string(), type: z.literal("HUMAN_HANDOFF"), title: z.string(), next: z.string().optional() }),
  z.object({ id: z.string(), type: z.literal("END") }),
]);
export const WorkflowDefinition = z.object({ start: z.string(), nodes: z.array(Node).min(1).max(40) });
export type WorkflowDef = z.infer<typeof WorkflowDefinition>;

/** Reject graphs with dangling references or no way to terminate cleanly before they are ever saved. */
export function validateWorkflow(def: WorkflowDef): string[] {
  const ids = new Set(def.nodes.map((n) => n.id));
  const errs: string[] = [];
  if (ids.size !== def.nodes.length) errs.push("Duplicate node ids.");
  if (!ids.has(def.start)) errs.push(`Start node "${def.start}" does not exist.`);
  for (const n of def.nodes) for (const k of ["next", "else", "rejected"] as const) { const t = (n as Record<string, unknown>)[k]; if (typeof t === "string" && !ids.has(t)) errs.push(`Node ${n.id}.${k} points to unknown node "${t}".`); }
  return errs;
}

type LogEntry = { at: string; node: string; type: string; note: string };
const MAX_STEPS = 60;

export async function startWorkflow(key: string, context: Record<string, unknown>, startedBy: string) {
  const wf = await prisma.osWorkflow.findUnique({ where: { orgId_key: { orgId: ORG_ID, key } } });
  if (!wf || !wf.enabled) throw new Error(`Workflow "${key}" is not available.`);
  const def = WorkflowDefinition.parse(wf.definition);
  const run = await prisma.osWorkflowRun.create({ data: { workflowId: wf.id, nodeId: def.start, context: context as never, log: [] } });
  await prisma.osWorkflow.update({ where: { id: wf.id }, data: { lastRunAt: new Date() } });
  await audit({ actor: startedBy, actorType: startedBy.startsWith("event") || startedBy.startsWith("rule") ? "SYSTEM" : "HUMAN", action: "workflow.start", resource: "workflow", resourceId: wf.key, output: { runId: run.id } });
  return run;
}

/** Advances one run until it waits, ends or fails. Every transition is logged on the run. */
async function advance(runId: number) {
  const run = await prisma.osWorkflowRun.findUniqueOrThrow({ where: { id: runId }, include: { workflow: true } });
  const def = WorkflowDefinition.parse(run.workflow.definition);
  const byId = new Map(def.nodes.map((n) => [n.id, n]));
  const log = (run.log as LogEntry[]).slice();
  const ctx = run.context as Record<string, unknown>;
  let nodeId: string | null = run.nodeId;
  let steps = run.steps;
  const save = (data: Record<string, unknown>) => prisma.osWorkflowRun.update({ where: { id: runId }, data: { log: log as never, steps, ...data } });

  try {
    // Resume a wait (task or approval)
    const w = run.waitingOn as { kind: "task" | "approval"; id: number } | null;
    if (w) {
      const done = w.kind === "task"
        ? await prisma.osTask.findUnique({ where: { id: w.id } }).then((t) => (t && ["COMPLETED", "FAILED", "CANCELLED"].includes(t.status) ? t.status : null))
        : await prisma.osApproval.findUnique({ where: { id: w.id } }).then((a) => (a && !["PENDING", "INFO_REQUESTED"].includes(a.status) ? a.status : null));
      if (!done) { await save({ status: "WAITING", resumeAt: new Date(Date.now() + 60_000) }); return; }
      const node = byId.get(nodeId ?? "");
      log.push({ at: new Date().toISOString(), node: nodeId ?? "", type: node?.type ?? "?", note: `${w.kind} ${w.id} → ${done}` });
      nodeId = node && "next" in node ? (done === "REJECTED" && node.type === "APPROVAL" ? (node.rejected ?? null) : (node.next ?? null)) : null;
      await prisma.osWorkflowRun.update({ where: { id: runId }, data: { waitingOn: Prisma.DbNull } });
      if (w.kind === "task" && done === "FAILED") throw new Error(`Awaited task ${w.id} failed.`);
    }

    while (nodeId && steps < MAX_STEPS) {
      const n = byId.get(nodeId);
      if (!n) throw new Error(`Unknown node ${nodeId}`);
      steps++;
      const note = (t: string) => log.push({ at: new Date().toISOString(), node: n.id, type: n.type, note: t });
      switch (n.type) {
        case "AGENT": {
          const t = await enqueueTask({ agentKey: n.agentKey, title: n.title, input: ctx, createdBy: `workflow:${run.workflow.key}`, idempotencyKey: `wf:${runId}:${n.id}`, opportunityId: (ctx.opportunityId as number) ?? null, customerId: (ctx.customerId as number) ?? null });
          note(`task #${t.task.id} queued`);
          if (n.wait) { await save({ nodeId: n.id, status: "WAITING", waitingOn: { kind: "task", id: t.task.id } as never, resumeAt: new Date(Date.now() + 30_000) }); return; }
          nodeId = n.next ?? null; break;
        }
        case "CONDITION": { const ok = evalCondition(n.condition as Condition, ctx); note(`${n.condition.field} ${n.condition.op} ${String(n.condition.value)} → ${ok}`); nodeId = (ok ? n.next : n.else) ?? null; break; }
        case "DELAY": { note(`wait ${n.minutes}m`); await save({ nodeId: n.next ?? null, status: "WAITING", waitingOn: Prisma.DbNull, resumeAt: new Date(Date.now() + n.minutes * 60_000) }); if (!n.next) await save({ status: "COMPLETED" }); return; }
        case "APPROVAL": { const a = await requestApproval({ kind: "OTHER", title: n.title, objective: n.objective, recommendation: "Review and decide.", requestedBy: `workflow:${run.workflow.key}` }); note(`approval #${a.id}`); await save({ nodeId: n.id, status: "WAITING", waitingOn: { kind: "approval", id: a.id } as never, resumeAt: new Date(Date.now() + 60_000) }); return; }
        case "HUMAN_HANDOFF": { const a = await requestApproval({ kind: "ESCALATION", title: n.title, objective: JSON.stringify(ctx).slice(0, 500), recommendation: "Human follow-up required.", requestedBy: `workflow:${run.workflow.key}` }); note(`handoff approval #${a.id}`); nodeId = n.next ?? null; break; }
        case "NOTIFICATION": await raiseAlert({ severity: n.severity, category: "Workflow", title: n.title, dedupeKey: `wf:${runId}:${n.id}` }); note("alert raised"); nodeId = n.next ?? null; break;
        case "CRM_STAGE": { const id = Number(getPath(ctx, "opportunityId")); if (!id) throw new Error("CRM_STAGE needs opportunityId in context."); await setStage(id, n.stage, { actor: `workflow:${run.workflow.key}`, actorType: "SYSTEM" }); note(`stage → ${n.stage}`); nodeId = n.next ?? null; break; }
        case "HTTP": {
          const u = await assertPublicUrl(n.url);
          if (u.protocol !== "https:") throw new Error("HTTP nodes require https.");
          const res = await fetch(u, { method: n.method, redirect: "error", signal: AbortSignal.timeout(10_000), ...(n.method === "POST" ? { headers: { "content-type": "application/json" }, body: JSON.stringify(n.body ?? ctx) } : {}) });
          note(`${n.method} ${u.host} → ${res.status}`);
          if (!res.ok) throw new Error(`HTTP node got ${res.status}`);
          nodeId = n.next ?? null; break;
        }
        case "END": note("end"); nodeId = null; break;
      }
    }
    if (nodeId) throw new Error("Step limit reached (possible loop).");
    await save({ status: "COMPLETED", nodeId: null, waitingOn: Prisma.DbNull });
  } catch (e) {
    // Retries are not automatic for workflows; a failed run is visible and re-startable, never silent.
    const msg = e instanceof Error ? e.message : String(e);
    log.push({ at: new Date().toISOString(), node: nodeId ?? "", type: "ERROR", note: msg });
    await save({ status: "FAILED", error: msg });
    await raiseAlert({ severity: "MEDIUM", category: "Technical Risk", title: `Workflow ${run.workflow.name} failed`, body: msg, dedupeKey: `wf-fail:${runId}` });
  }
}

/** Cron entry: start due scheduled workflows, then advance every run that is due. */
export async function tickWorkflows(): Promise<{ started: number; advanced: number }> {
  const now = new Date();
  let started = 0;
  const scheduled = await prisma.osWorkflow.findMany({ where: { orgId: ORG_ID, enabled: true, trigger: "SCHEDULE", everyMinutes: { not: null } } });
  for (const w of scheduled) {
    if (w.lastRunAt && now.getTime() - w.lastRunAt.getTime() < (w.everyMinutes as number) * 60_000) continue;
    await startWorkflow(w.key, { scheduledAt: now.toISOString() }, "schedule"); started++;
  }
  const due = await prisma.osWorkflowRun.findMany({ where: { status: { in: ["RUNNING", "WAITING"] }, resumeAt: { lte: now } }, take: 50, orderBy: { id: "asc" } });
  for (const r of due) await advance(r.id);
  return { started, advanced: due.length };
}

export async function runNow(runId: number) { await advance(runId); }
