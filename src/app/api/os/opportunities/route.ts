import { after } from "next/server";
import { z } from "zod";
import { api, jsonBody } from "@/lib/os/http";
import { prisma } from "@/lib/prisma";
import { BUSINESS_UNITS, ORG_ID, PIPELINE_STAGES } from "@/lib/os/constants";
import { createOpportunity } from "@/lib/os/crm";
import { enqueueTask } from "@/lib/os/queue";
import { processQueue } from "@/lib/os/runtime";

export const GET = api("opportunity.read", async ({ request }) => {
  const stage = request.nextUrl.searchParams.get("stage");
  return prisma.osOpportunity.findMany({ where: { orgId: ORG_ID, ...(stage && (PIPELINE_STAGES as readonly string[]).includes(stage) ? { stage } : {}) }, orderBy: [{ score: "desc" }, { id: "desc" }], take: 200 });
});

const Create = z.object({
  companyName: z.string().min(2).max(200), industry: z.string().max(100).optional(), website: z.string().max(300).optional(), country: z.string().max(80).optional(),
  contactName: z.string().max(120).optional(), contactEmail: z.string().email().optional(), contactPhone: z.string().max(40).optional(),
  businessUnit: z.enum(BUSINESS_UNITS).optional(), research: z.boolean().default(true),
});

export const maxDuration = 60;

export const POST = api("opportunity.write", async ({ request, caller }) => {
  const { research, ...b } = await jsonBody(request, Create);
  const { opportunity, created } = await createOpportunity({ ...b, source: "manual" }, { actor: caller.name, actorType: "HUMAN" });
  let taskId: number | null = null;
  if (research) {
    const r = await enqueueTask({ agentKey: "prospecting-agent", title: `Research ${opportunity.companyName}`, input: { opportunityId: opportunity.id }, createdBy: caller.name, priority: "HIGH", idempotencyKey: `research:${opportunity.id}`, opportunityId: opportunity.id });
    taskId = r.task.id;
    after(() => processQueue({ maxTasks: 5, budgetMs: 45_000 }).catch((e) => console.error("[os.opps] queue", e)));
  }
  return { opportunityId: opportunity.id, created, researchTaskId: taskId };
});

