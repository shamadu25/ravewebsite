import { z } from "zod";
import { api, jsonBody } from "@/lib/os/http";
import { prisma } from "@/lib/prisma";
import { AUTONOMY_LEVELS, AGENT_STATUSES, ORG_ID } from "@/lib/os/constants";
import { audit } from "@/lib/os/audit";
import { listTools } from "@/lib/os/tools/registry";
import { can } from "@/lib/os/rbac";

type P = { key: string };

export const GET = api<P>("agent.read", async ({ params }) => {
  const agent = await prisma.osAgent.findFirst({ where: { key: params.key, orgId: ORG_ID }, include: { versions: { orderBy: { version: "desc" } } } });
  if (!agent) throw new Error("Agent not found");
  const [taskStats, cost] = await Promise.all([
    prisma.osTask.groupBy({ by: ["status"], where: { agentId: agent.id }, _count: true }),
    prisma.osTask.aggregate({ where: { agentId: agent.id }, _sum: { costUsd: true } }),
  ]);
  return { agent, taskStats, costUsd: cost._sum.costUsd ?? 0 };
});

const Patch = z.object({
  systemPrompt: z.string().min(10).max(8000).optional(), autonomy: z.enum(AUTONOMY_LEVELS).optional(), tools: z.array(z.string()).optional(),
  knowledgeSources: z.array(z.string()).optional(), modelTier: z.enum(["fast", "standard", "strong"]).optional(), temperature: z.number().min(0).max(1).optional(),
  budgetLimitUsd: z.number().positive().max(10000).optional(), maxRetries: z.number().int().min(0).max(10).optional(), maxExecutionSec: z.number().int().min(5).max(300).optional(),
  heartbeatMinutes: z.number().int().min(5).max(1440).nullable().optional(), approvalRules: z.object({ alwaysFor: z.array(z.string()) }).optional(),
  triggerTypes: z.array(z.string()).optional(), note: z.string().max(200).optional(),
});

/** Config edits create a new immutable version. Agents cannot call this route — only authenticated humans. */
export const PATCH = api<P>("agent.configure", async ({ request, caller, params }) => {
  const b = await jsonBody(request, Patch);
  if (b.tools) {
    const known = new Set(listTools().map((t) => t.name));
    const unknown = b.tools.filter((t) => !known.has(t));
    if (unknown.length) throw new Error(`Unknown tool(s): ${unknown.join(", ")}`);
  }
  const agent = await prisma.osAgent.findFirstOrThrow({ where: { key: params.key, orgId: ORG_ID } });
  const { note, ...changes } = b;
  const updated = await prisma.osAgent.update({ where: { id: agent.id }, data: { ...changes, version: { increment: 1 } } });
  await prisma.osAgentVersion.create({ data: { agentId: agent.id, version: updated.version, snapshot: updated as never, changedBy: caller.name, note: note ?? "Configuration change" } });
  await audit({ actor: caller.name, actorType: "HUMAN", action: "agent.configure", resource: "agent", resourceId: agent.key, input: changes, ip: caller.ip });
  return updated;
});

const Action = z.discriminatedUnion("action", [
  z.object({ action: z.literal("set_status"), status: z.enum(AGENT_STATUSES) }),
  z.object({ action: z.literal("duplicate"), newKey: z.string().regex(/^[a-z0-9-]{3,60}$/) }),
  z.object({ action: z.literal("rollback"), version: z.number().int().positive() }),
]);

export const POST = api<P>("agent.pause", async ({ request, caller, params }) => {
  const b = await jsonBody(request, Action);
  const agent = await prisma.osAgent.findFirstOrThrow({ where: { key: params.key, orgId: ORG_ID } });

  if (b.action === "set_status") {
    if (b.status === "ACTIVE" && !can(caller.role, "agent.configure")) throw new Error("Activating requires agent.configure.");
    const u = await prisma.osAgent.update({ where: { id: agent.id }, data: { status: b.status } });
    await audit({ actor: caller.name, actorType: "HUMAN", action: `agent.${b.status.toLowerCase()}`, resource: "agent", resourceId: agent.key, input: { from: agent.status }, ip: caller.ip });
    return { status: u.status };
  }
  if (b.action === "duplicate") {
    const { id: _id, createdAt: _c, updatedAt: _u, lastHeartbeatAt: _h, ...rest } = agent;
    void _id; void _c; void _u; void _h;
    const copy = await prisma.osAgent.create({ data: { ...rest, key: b.newKey, name: `${agent.name} (copy)`, status: "DRAFT", version: 1, tools: agent.tools as never, knowledgeSources: agent.knowledgeSources as never, triggerTypes: agent.triggerTypes as never, approvalRules: agent.approvalRules as never, inputSchema: undefined, outputSchema: undefined } });
    await prisma.osAgentVersion.create({ data: { agentId: copy.id, version: 1, snapshot: copy as never, changedBy: caller.name, note: `Duplicated from ${agent.key}` } });
    await audit({ actor: caller.name, actorType: "HUMAN", action: "agent.duplicate", resource: "agent", resourceId: copy.key, input: { from: agent.key }, ip: caller.ip });
    return { key: copy.key };
  }
  // rollback → forward-only: restore an old snapshot as a NEW version
  const old = await prisma.osAgentVersion.findUniqueOrThrow({ where: { agentId_version: { agentId: agent.id, version: b.version } } });
  const s = old.snapshot as Record<string, unknown>;
  const restored = await prisma.osAgent.update({
    where: { id: agent.id },
    data: { systemPrompt: s.systemPrompt as string, autonomy: s.autonomy as string, tools: s.tools as never, knowledgeSources: s.knowledgeSources as never, modelTier: s.modelTier as string, temperature: s.temperature as number, budgetLimitUsd: s.budgetLimitUsd as number, version: { increment: 1 } },
  });
  await prisma.osAgentVersion.create({ data: { agentId: agent.id, version: restored.version, snapshot: restored as never, changedBy: caller.name, note: `Rollback to v${b.version}` } });
  await audit({ actor: caller.name, actorType: "HUMAN", action: "agent.rollback", resource: "agent", resourceId: agent.key, input: { to: b.version }, ip: caller.ip });
  return { version: restored.version };
});
