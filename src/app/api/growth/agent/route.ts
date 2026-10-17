import { z } from "zod";
import { growthApi } from "@/lib/growth/api";
import { jsonBody } from "@/lib/os/http";
import { AGENT_NAMES, humanQueue, runMarketingAgent } from "@/lib/growth/agents/orchestrator";

export const maxDuration = 60;
export const GET = growthApi("approval.read", async () => humanQueue());
/** Runs the marketing agent and its sub-agents now. Everything they prepare waits for a human approval before it sends. */
export const POST = growthApi("commander.run", async ({ request }) => {
  const b = await jsonBody(request, z.object({ agents: z.array(z.enum(AGENT_NAMES)).optional(), areas: z.array(z.string().min(2).max(80)).max(10).optional(), profileKeys: z.array(z.string()).max(8).optional(), limits: z.object({ scout: z.number().int().min(1).max(20).optional(), outreach: z.number().int().min(1).max(50).optional(), reply: z.number().int().min(1).max(30).optional() }).optional() }));
  return runMarketingAgent(b);
});
