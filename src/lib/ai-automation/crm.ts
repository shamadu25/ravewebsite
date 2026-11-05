/** CRM pipeline rules + activity history. */
import { prisma } from "@/lib/prisma";
import { PIPELINE_STATUSES, type PipelineStatus } from "./types";

export const PIPELINE_RANK: Record<PipelineStatus, number> = Object.fromEntries(PIPELINE_STATUSES.map((s, i) => [s, i])) as Record<PipelineStatus, number>;

export const isPipelineStatus = (s: string): s is PipelineStatus => (PIPELINE_STATUSES as readonly string[]).includes(s);

/** Automatic transitions only ever move a lead forward and never resurrect a LOST/COMPLETED lead. */
export function shouldAdvance(current: string, next: PipelineStatus): boolean {
  if (!isPipelineStatus(current)) return true;
  if (current === "LOST" || current === "COMPLETED") return false;
  if (next === "LOST" || next === "COMPLETED") return false;
  return PIPELINE_RANK[next] > PIPELINE_RANK[current];
}

/** Manual (admin) transitions may go to any status, but LOST needs a reason. */
export function validateManualTransition(next: string, lostReason?: string | null): { ok: true } | { ok: false; error: string } {
  if (!isPipelineStatus(next)) return { ok: false, error: `Unknown status "${next}".` };
  if (next === "LOST" && !(lostReason && lostReason.trim().length >= 3)) return { ok: false, error: "A lost reason is required." };
  return { ok: true };
}

export async function logActivity(a: { leadId?: number | null; assessmentId?: number | null; proposalId?: number | null; actor: string; action: string; detail?: unknown }) {
  try {
    await prisma.aiActivityLog.create({ data: { leadId: a.leadId ?? null, assessmentId: a.assessmentId ?? null, proposalId: a.proposalId ?? null, actor: a.actor, action: a.action, detail: (a.detail ?? undefined) as never } });
  } catch (e) { console.error("[ai-automation] activity log failed", e instanceof Error ? e.message : e); }
}

export async function advanceLead(leadId: number, next: PipelineStatus, actor = "system", detail?: unknown): Promise<boolean> {
  const lead = await prisma.aiLead.findUnique({ where: { id: leadId }, select: { status: true } });
  if (!lead || !shouldAdvance(lead.status, next)) return false;
  await prisma.aiLead.update({ where: { id: leadId }, data: { status: next } });
  await logActivity({ leadId, actor, action: "lead.status", detail: { from: lead.status, to: next, ...(detail as object) } });
  return true;
}

export async function setLeadStatus(leadId: number, next: string, actor: string, lostReason?: string | null) {
  const v = validateManualTransition(next, lostReason);
  if (!v.ok) throw new Error(v.error);
  const lead = await prisma.aiLead.findUnique({ where: { id: leadId } });
  if (!lead) throw new Error("Lead not found.");
  await prisma.aiLead.update({ where: { id: leadId }, data: { status: next, lostReason: next === "LOST" ? lostReason!.trim() : null, ...(next === "LOST" ? { followupsStopped: true } : {}) } });
  await logActivity({ leadId, actor, action: "lead.status", detail: { from: lead.status, to: next, lostReason: lostReason ?? null } });
}
