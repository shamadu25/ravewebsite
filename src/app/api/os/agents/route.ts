import { z } from "zod";
import { api, jsonBody } from "@/lib/os/http";
import { prisma } from "@/lib/prisma";
import { AUTONOMY_LEVELS, DEPARTMENTS, ORG_ID } from "@/lib/os/constants";
import { audit } from "@/lib/os/audit";
import { listTools } from "@/lib/os/tools/registry";
import { buildSystemPrompt } from "@/lib/os/agents/roster";

export const GET = api("agent.read", async () => prisma.osAgent.findMany({ where: { orgId: ORG_ID }, orderBy: [{ department: "asc" }, { isDirector: "desc" }, { name: "asc" }] }));

const Create = z.object({
  key: z.string().regex(/^[a-z0-9-]{3,60}$/), name: z.string().min(2).max(120), department: z.enum(DEPARTMENTS), role: z.string().min(2).max(120),
  objective: z.string().min(5).max(1000), parentKey: z.string().nullable().optional(), tools: z.array(z.string()).default([]),
  knowledgeSources: z.array(z.string()).default([]), autonomy: z.enum(AUTONOMY_LEVELS).default("ASSISTED"),
  modelTier: z.enum(["fast", "standard", "strong"]).default("fast"), budgetLimitUsd: z.number().positive().max(10000).default(25),
});

/** AI Employee creator: always starts as DRAFT — a human activates it after testing. */
export const POST = api("agent.create", async ({ request, caller }) => {
  const b = await jsonBody(request, Create);
  const known = new Set(listTools().map((t) => t.name));
  const unknown = b.tools.filter((t) => !known.has(t));
  if (unknown.length) throw new Error(`Unknown tool(s): ${unknown.join(", ")}`);
  const systemPrompt = buildSystemPrompt({ ...b, mission: b.objective, parentKey: b.parentKey ?? null, sections: b.knowledgeSources, tier: b.modelTier, active: false });
  const row = await prisma.osAgent.create({
    data: {
      orgId: ORG_ID, key: b.key, name: b.name, description: b.objective, department: b.department, role: b.role, parentKey: b.parentKey ?? null, systemPrompt,
      status: "DRAFT", autonomy: b.autonomy, modelTier: b.modelTier, tools: b.tools, knowledgeSources: b.knowledgeSources, triggerTypes: ["MANUAL"],
      approvalRules: { alwaysFor: [] }, budgetLimitUsd: b.budgetLimitUsd, owner: caller.name,
    },
  });
  await prisma.osAgentVersion.create({ data: { agentId: row.id, version: 1, snapshot: row as never, changedBy: caller.name, note: "Created" } });
  await audit({ actor: caller.name, actorType: "HUMAN", action: "agent.create", resource: "agent", resourceId: row.key, input: b, ip: caller.ip });
  return row;
});
