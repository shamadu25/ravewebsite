import { z } from "zod";
import { after } from "next/server";
import { api, jsonBody } from "@/lib/os/http";
import { runNow, startWorkflow } from "@/lib/os/workflows";
import { prisma } from "@/lib/prisma";
import { ORG_ID } from "@/lib/os/constants";
import { audit } from "@/lib/os/audit";
import { processQueue } from "@/lib/os/runtime";

export const POST = api<{ key: string }>("agent.execute", async ({ request, caller, params }) => {
  const b = await jsonBody(request, z.object({ action: z.enum(["run", "toggle"]), context: z.record(z.string(), z.unknown()).default({}) }));
  if (b.action === "toggle") {
    const w = await prisma.osWorkflow.findUniqueOrThrow({ where: { orgId_key: { orgId: ORG_ID, key: params.key } } });
    await prisma.osWorkflow.update({ where: { id: w.id }, data: { enabled: !w.enabled } });
    await audit({ actor: caller.name, actorType: "HUMAN", action: "workflow.toggle", resource: "workflow", resourceId: params.key, output: { enabled: !w.enabled }, ip: caller.ip });
    return { enabled: !w.enabled };
  }
  const run = await startWorkflow(params.key, b.context, caller.name);
  await runNow(run.id);
  after(() => processQueue({ maxTasks: 5, budgetMs: 40_000 }).catch(() => undefined));
  const after_ = await prisma.osWorkflowRun.findUniqueOrThrow({ where: { id: run.id } });
  return { runId: run.id, status: after_.status, error: after_.error };
});
