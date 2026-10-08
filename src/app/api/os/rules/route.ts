import { z } from "zod";
import { api, jsonBody } from "@/lib/os/http";
import { prisma } from "@/lib/prisma";
import { ORG_ID } from "@/lib/os/constants";
import { audit } from "@/lib/os/audit";

export const GET = api("agent.read", async () => prisma.osRule.findMany({ where: { orgId: ORG_ID }, orderBy: { id: "desc" } }));

const EVENTS = ["opportunity.created", "opportunity.stage_changed", "lead.qualified", "payment.received", "customer.at_risk", "approval.required", "approval.completed", "agent.failed", "product.registered", "product.activated", "product.subscribed", "product.churned"] as const;

/** WHEN event IF condition THEN action. */
export const POST = api("agent.configure", async ({ request, caller }) => {
  const b = await jsonBody(request, z.object({
    name: z.string().min(2).max(160), event: z.enum(EVENTS),
    condition: z.object({ field: z.string(), op: z.enum(["eq", "neq", "gt", "gte", "lt", "lte", "contains"]), value: z.union([z.string(), z.number(), z.boolean()]) }).nullable().optional(),
    action: z.discriminatedUnion("type", [
      z.object({ type: z.literal("enqueue_agent"), agentKey: z.string(), title: z.string() }),
      z.object({ type: z.literal("start_workflow"), key: z.string() }),
      z.object({ type: z.literal("alert"), severity: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]), title: z.string() }),
    ]),
  }));
  if (b.action.type === "enqueue_agent") await prisma.osAgent.findUniqueOrThrow({ where: { key: b.action.agentKey } });
  const row = await prisma.osRule.create({ data: { orgId: ORG_ID, name: b.name, event: b.event, condition: (b.condition ?? undefined) as never, action: b.action as never } });
  await audit({ actor: caller.name, actorType: "HUMAN", action: "rule.create", resource: "rule", resourceId: row.id, input: b, ip: caller.ip });
  return row;
});
