import { after } from "next/server";
import { z } from "zod";
import { api, jsonBody } from "@/lib/os/http";
import { prisma } from "@/lib/prisma";
import { PIPELINE_STAGES } from "@/lib/os/constants";
import { logActivity, setStage } from "@/lib/os/crm";
import { enqueueTask } from "@/lib/os/queue";
import { processQueue } from "@/lib/os/runtime";
import { draftOutreach, submitForApproval } from "@/lib/os/outreach";
import { recordPayment } from "@/lib/os/revenue";
import { audit } from "@/lib/os/audit";

export const maxDuration = 60;
type P = { id: string };

export const GET = api<P>("opportunity.read", async ({ params }) =>
  prisma.osOpportunity.findUniqueOrThrow({ where: { id: Number(params.id) }, include: { activities: { orderBy: { createdAt: "desc" }, take: 50 }, outreach: { orderBy: { id: "desc" } }, customer: true } })
);

const Action = z.discriminatedUnion("action", [
  z.object({ action: z.literal("set_stage"), stage: z.enum(PIPELINE_STAGES), reason: z.string().optional() }),
  z.object({ action: z.literal("update"), dealValueUsd: z.number().nonnegative().optional(), nextAction: z.string().max(200).optional(), notes: z.string().max(5000).optional(), expectedCloseAt: z.string().optional() }),
  z.object({ action: z.literal("research") }),
  z.object({ action: z.literal("draft_outreach"), channel: z.enum(["EMAIL", "WHATSAPP", "SMS", "LINKEDIN", "WEB_CHAT", "VOICE"]).default("EMAIL") }),
  z.object({ action: z.literal("submit_outreach"), outreachId: z.number().int() }),
  z.object({ action: z.literal("record_response"), outreachId: z.number().int().optional(), text: z.string().min(1).max(5000) }),
  z.object({ action: z.literal("qualify"), signals: z.object({ need: z.number().min(0).max(5).optional(), budget: z.number().min(0).max(5).optional(), authority: z.number().min(0).max(5).optional(), urgency: z.number().min(0).max(5).optional(), fit: z.number().min(0).max(5).optional(), intent: z.number().min(0).max(5).optional() }) }),
  z.object({ action: z.literal("record_payment"), amountUsd: z.number().positive(), recurring: z.boolean(), externalRef: z.string().min(1).max(120) }),
]);

export const POST = api<P>("opportunity.write", async ({ request, caller, params }) => {
  const b = await jsonBody(request, Action);
  const id = Number(params.id);
  const human = { actor: caller.name, actorType: "HUMAN" as const };
  const kick = () => after(() => processQueue({ maxTasks: 5, budgetMs: 45_000 }).catch(() => undefined));

  switch (b.action) {
    case "set_stage":
      await setStage(id, b.stage, human, b.reason);
      return { ok: true };
    case "update": {
      await prisma.osOpportunity.update({ where: { id }, data: { ...(b.dealValueUsd != null ? { dealValueCents: Math.round(b.dealValueUsd * 100) } : {}), ...(b.nextAction ? { nextAction: b.nextAction } : {}), ...(b.notes != null ? { notes: b.notes } : {}), ...(b.expectedCloseAt ? { expectedCloseAt: new Date(b.expectedCloseAt) } : {}) } });
      await audit({ ...human, action: "opportunity.update", resource: "opportunity", resourceId: id, input: b, ip: caller.ip });
      return { ok: true };
    }
    case "research": {
      const r = await enqueueTask({ agentKey: "prospecting-agent", title: "Re-research prospect", input: { opportunityId: id }, createdBy: caller.name, priority: "HIGH", idempotencyKey: `research:${id}:${Date.now()}`, opportunityId: id });
      kick();
      return { taskId: r.task.id };
    }
    case "draft_outreach": {
      const row = await draftOutreach(id, human, b.channel);
      return { outreachId: row.id, status: row.status, hasAddress: !!row.toAddress };
    }
    case "submit_outreach": {
      const approval = await submitForApproval(b.outreachId, caller.name);
      return { approvalId: approval.id };
    }
    case "record_response": {
      if (b.outreachId) await prisma.osOutreach.update({ where: { id: b.outreachId }, data: { responseText: b.text, respondedAt: new Date() } });
      await logActivity(id, human, "RESPONSE", b.text.slice(0, 500));
      const opp = await prisma.osOpportunity.findUniqueOrThrow({ where: { id } });
      await prisma.osOpportunity.update({ where: { id }, data: { lastContactAt: new Date(), nextFollowUpAt: null } });
      if (["NEW", "RESEARCHED", "CONTACTED"].includes(opp.stage)) await setStage(id, "ENGAGED", human, "prospect responded");
      const r = await enqueueTask({ agentKey: "sales-agent", title: `Qualify ${opp.companyName}`, input: { opportunityId: id, signals: (opp.qualification as { input?: Record<string, number> } | null)?.input ?? {} }, createdBy: caller.name, priority: "HIGH", idempotencyKey: `qualify:${id}:${Date.now()}`, opportunityId: id });
      kick();
      return { qualifyTaskId: r.task.id };
    }
    case "qualify": {
      const r = await enqueueTask({ agentKey: "sales-agent", title: "Qualify prospect", input: { opportunityId: id, signals: b.signals }, createdBy: caller.name, priority: "HIGH", idempotencyKey: `qualify:${id}:${Date.now()}`, opportunityId: id });
      kick();
      return { taskId: r.task.id };
    }
    case "record_payment": {
      const r = await recordPayment({ opportunityId: id, amountCents: Math.round(b.amountUsd * 100), recurring: b.recurring, source: "manual", externalRef: b.externalRef }, human);
      kick();
      return { customerId: r.customerId, duplicate: r.duplicate };
    }
  }
});
