import { z } from "zod";
import { api, jsonBody } from "@/lib/os/http";
import { prisma } from "@/lib/prisma";
import { ORG_ID } from "@/lib/os/constants";
import { audit } from "@/lib/os/audit";

/** Edit a message before it is sent. Locked once it has gone out. */
export const PATCH = api<{ id: string }>("outreach.send", async ({ request, caller, params }) => {
  const b = await jsonBody(request, z.object({ subject: z.string().min(1).max(200), body: z.string().min(10).max(5000) }));
  const m = await prisma.osOutreach.findFirst({ where: { id: Number(params.id), orgId: ORG_ID } });
  if (!m) throw new Error("Message not found");
  if (!["DRAFT", "PENDING_APPROVAL"].includes(m.status)) throw new Error(`This message is already ${m.status.toLowerCase()} and can no longer be edited.`);
  await prisma.osOutreach.update({ where: { id: m.id }, data: { subject: b.subject, body: b.body, generatedBy: `${m.generatedBy}+edited` } });
  await audit({ actor: caller.name, actorType: "HUMAN", action: "outreach.edit", resource: "outreach", resourceId: m.id, input: { subjectChanged: b.subject !== m.subject, bodyChanged: b.body !== m.body }, ip: caller.ip });
  return { ok: true };
});
