import { prisma } from "@/lib/prisma";
import { ORG_ID, type ActorType, type ApprovalKind } from "./constants";
import { audit } from "./audit";
import { meetsRole, type Role } from "./rbac";
import { emit } from "./events";
import { notifyCeo } from "./notify";

export interface ApprovalRequest {
  kind: ApprovalKind;
  title: string;
  objective: string;
  context?: string;
  options?: unknown;
  recommendation: string;
  expectedImpact?: string;
  confidence?: number;
  risks?: string;
  requiredRole?: Role;
  /** Machine-readable action executed ONLY if the approval is granted. */
  action?: { type: string; [k: string]: unknown };
  taskId?: number | null;
  requestedBy: string;
  isDemo?: boolean;
}

export async function requestApproval(r: ApprovalRequest) {
  const approval = await prisma.osApproval.create({
    data: {
      orgId: ORG_ID, kind: r.kind, title: r.title, objective: r.objective, context: r.context ?? null, options: (r.options ?? undefined) as never,
      recommendation: r.recommendation, expectedImpact: r.expectedImpact ?? null, confidence: r.confidence ?? null, risks: r.risks ?? null,
      requiredRole: r.requiredRole ?? "CEO", action: (r.action ?? undefined) as never, taskId: r.taskId ?? null, requestedBy: r.requestedBy, isDemo: r.isDemo ?? false,
    },
  });
  await audit({ actor: r.requestedBy, actorType: "AI_AGENT", action: "approval.requested", resource: "approval", resourceId: approval.id, input: { kind: r.kind, title: r.title, action: r.action } });
  await emit("approval.required", { id: approval.id, kind: r.kind, requestedBy: r.requestedBy });
  if (!r.isDemo) await notifyCeo(`Approval needed: ${r.title}`, `${r.objective}\n\nRecommendation: ${r.recommendation}`, `approval:${approval.id}`).catch(() => false);
  return approval;
}

export type Decision = "APPROVE" | "REJECT" | "MODIFY" | "DELEGATE" | "REQUEST_INFO";

type ActionHandler = (action: Record<string, unknown>, ctx: { approvalId: number; decidedBy: string }) => Promise<Record<string, unknown>>;
const actionHandlers = new Map<string, ActionHandler>();

export function registerApprovalAction(type: string, handler: ActionHandler) {
  actionHandlers.set(type, handler);
}

/**
 * Applies a human decision. The audit record is written before and after execution, and execution
 * results are stored on the approval — a failed execution is reported as FAILED, never as approved-and-done.
 */
export async function decideApproval(opts: { id: number; decision: Decision; actor: string; role: Role; note?: string; modifiedAction?: Record<string, unknown>; ip?: string | null }) {
  const approval = await prisma.osApproval.findUniqueOrThrow({ where: { id: opts.id } });
  if (approval.orgId !== ORG_ID) throw new Error("Cross-tenant access denied.");
  if (approval.status !== "PENDING" && approval.status !== "INFO_REQUESTED") throw new Error(`Approval already ${approval.status}.`);
  if (!meetsRole(opts.role, approval.requiredRole as Role)) {
    await audit({ actor: opts.actor, actorType: "HUMAN", action: "approval.decide", resource: "approval", resourceId: opts.id, result: "DENIED", input: { decision: opts.decision, role: opts.role, required: approval.requiredRole }, ip: opts.ip });
    throw new Error(`This decision requires ${approval.requiredRole} or higher.`);
  }

  const statusFor: Record<Decision, string> = { APPROVE: "APPROVED", REJECT: "REJECTED", MODIFY: "APPROVED", DELEGATE: "PENDING", REQUEST_INFO: "INFO_REQUESTED" };
  const finalAction = (opts.modifiedAction ?? approval.action) as Record<string, unknown> | null;

  await prisma.osApproval.update({
    where: { id: opts.id },
    data: {
      status: statusFor[opts.decision],
      decidedBy: opts.actor,
      decisionNote: opts.note ?? null,
      decidedAt: opts.decision === "DELEGATE" || opts.decision === "REQUEST_INFO" ? null : new Date(),
      ...(opts.modifiedAction ? { action: opts.modifiedAction as never } : {}),
    },
  });
  await audit({ actor: opts.actor, actorType: "HUMAN", action: `approval.${opts.decision.toLowerCase()}`, resource: "approval", resourceId: opts.id, input: { note: opts.note, modified: !!opts.modifiedAction }, ip: opts.ip, approvalId: opts.id });

  let executionResult: Record<string, unknown> | null = null;
  if ((opts.decision === "APPROVE" || opts.decision === "MODIFY") && finalAction?.type) {
    const handler = actionHandlers.get(String(finalAction.type));
    if (!handler) {
      executionResult = { ok: false, error: `No executor registered for action "${finalAction.type}".` };
    } else {
      try {
        executionResult = await handler(finalAction, { approvalId: opts.id, decidedBy: opts.actor });
      } catch (e) {
        executionResult = { ok: false, error: e instanceof Error ? e.message : "execution failed" };
      }
    }
    await prisma.osApproval.update({ where: { id: opts.id }, data: { executionResult: executionResult as never } });
    await audit({ actor: "system", actorType: "SYSTEM", action: "approval.executed", resource: "approval", resourceId: opts.id, output: executionResult, approvalId: opts.id, result: executionResult.ok === false ? "FAILURE" : "SUCCESS" });
  }

  if (opts.decision === "REJECT" && approval.taskId) {
    await prisma.osTask.update({ where: { id: approval.taskId }, data: { status: "CANCELLED", error: "Rejected by human reviewer.", completedAt: new Date() } });
  }
  await emit("approval.completed", { id: opts.id, decision: opts.decision });
  return { status: statusFor[opts.decision], executionResult };
}

export function pendingApprovals() {
  return prisma.osApproval.findMany({ where: { orgId: ORG_ID, status: { in: ["PENDING", "INFO_REQUESTED"] } }, orderBy: { createdAt: "desc" } });
}
export type { ActorType };
