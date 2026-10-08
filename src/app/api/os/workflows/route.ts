import { z } from "zod";
import { api, jsonBody } from "@/lib/os/http";
import { prisma } from "@/lib/prisma";
import { ORG_ID } from "@/lib/os/constants";
import { WorkflowDefinition, validateWorkflow } from "@/lib/os/workflows";
import { audit } from "@/lib/os/audit";

export const GET = api("agent.read", async () => prisma.osWorkflow.findMany({ where: { orgId: ORG_ID }, orderBy: { id: "desc" }, include: { runs: { orderBy: { id: "desc" }, take: 5 } } }));

export const POST = api("agent.configure", async ({ request, caller }) => {
  const b = await jsonBody(request, z.object({ key: z.string().regex(/^[a-z0-9-]{3,60}$/), name: z.string().min(2).max(120), trigger: z.string().min(2).max(60), everyMinutes: z.number().int().min(5).optional(), definition: WorkflowDefinition, enabled: z.boolean().default(true) }));
  const errs = validateWorkflow(b.definition);
  if (errs.length) throw new Error(errs.join(" "));
  const row = await prisma.osWorkflow.upsert({
    where: { orgId_key: { orgId: ORG_ID, key: b.key } },
    create: { orgId: ORG_ID, key: b.key, name: b.name, trigger: b.trigger, everyMinutes: b.everyMinutes, definition: b.definition as never, enabled: b.enabled },
    update: { name: b.name, trigger: b.trigger, everyMinutes: b.everyMinutes, definition: b.definition as never, enabled: b.enabled },
  });
  await audit({ actor: caller.name, actorType: "HUMAN", action: "workflow.save", resource: "workflow", resourceId: row.key, ip: caller.ip });
  return row;
});
