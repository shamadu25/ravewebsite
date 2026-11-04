import { z } from "zod";
import { api, jsonBody } from "@/lib/os/http";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/os/audit";
import { LEAD_STAGES } from "@/lib/os/chats";

type P = { id: string };

const Body = z
  .object({
    stage: z.enum(LEAD_STAGES).optional(),
    owner: z.string().trim().min(1).max(100).optional(),
    note: z.string().trim().min(1).max(2000).optional(),
  })
  .refine((b) => b.stage || b.owner || b.note, { message: "Nothing to update." });

/** Manage a lead: change stage, assign an owner, add a note. Every change is kept as a timeline event. */
export const POST = api<P>("customer.update", async ({ request, caller, params }) => {
  const body = await jsonBody(request, Body);
  const id = Number(params.id);
  if (!Number.isInteger(id)) throw new Error("Lead not found.");
  const lead = await prisma.lead.findUnique({ where: { id } });
  if (!lead) throw new Error("Lead not found.");

  const base = { leadId: lead.id, contactId: lead.contactId, conversationId: lead.conversationId, occurredAt: new Date() };

  if (body.stage && body.stage !== lead.stage) {
    await prisma.lead.update({ where: { id }, data: { stage: body.stage } });
    await prisma.conversionEvent.create({
      data: { ...base, eventType: "lead_stage_changed", metadata: { from: lead.stage, to: body.stage, by: caller.name } },
    });
  }
  if (body.owner && body.owner !== lead.owner) {
    await prisma.lead.update({ where: { id }, data: { owner: body.owner } });
    await prisma.conversionEvent.create({
      data: { ...base, eventType: "lead_assigned", metadata: { from: lead.owner, to: body.owner, by: caller.name } },
    });
  }
  if (body.note) {
    await prisma.conversionEvent.create({
      data: { ...base, eventType: "lead_note", metadata: { note: body.note, by: caller.name } },
    });
  }

  await audit({
    actor: caller.name,
    actorType: "HUMAN",
    action: "lead.update",
    resource: "lead",
    resourceId: id,
    input: body,
    ip: caller.ip,
  });
  return { message: "Lead updated." };
});
