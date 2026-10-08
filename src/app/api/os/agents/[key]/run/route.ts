import { after } from "next/server";
import { z } from "zod";
import { api, jsonBody } from "@/lib/os/http";
import { enqueueTask } from "@/lib/os/queue";
import { processQueue } from "@/lib/os/runtime";
import { prisma } from "@/lib/prisma";

export const maxDuration = 60;

/** Enqueue a run (never executes inline). The worker picks it up immediately via after() and again on every cron tick. */
export const POST = api<{ key: string }>("agent.execute", async ({ request, caller, params }) => {
  const b = await jsonBody(request, z.object({ title: z.string().max(200).optional(), input: z.record(z.string(), z.unknown()).default({}), demo: z.boolean().optional() }));
  const agent = await prisma.osAgent.findUniqueOrThrow({ where: { key: params.key } });
  if (agent.status !== "ACTIVE") throw new Error(`Agent is ${agent.status}; activate it before running.`);
  const { task } = await enqueueTask({ agentKey: params.key, title: b.title ?? `Manual run of ${agent.name}`, input: b.input, createdBy: caller.name, priority: "HIGH", isDemo: b.demo });
  after(() => processQueue({ maxTasks: 5, budgetMs: 45_000 }).catch((e) => console.error("[os.run] queue", e)));
  return { taskId: task.id };
});
