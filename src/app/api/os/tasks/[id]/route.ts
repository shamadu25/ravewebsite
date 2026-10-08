import { after } from "next/server";
import { z } from "zod";
import { api, jsonBody } from "@/lib/os/http";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/os/audit";
import { processQueue } from "@/lib/os/runtime";

type P = { id: string };

export const GET = api<P>("task.read", async ({ params }) =>
  prisma.osTask.findUniqueOrThrow({ where: { id: Number(params.id) }, include: { traces: { orderBy: { seq: "asc" } }, agent: { select: { key: true, name: true } }, approvals: true } })
);

export const POST = api<P>("agent.execute", async ({ request, caller, params }) => {
  const { action } = await jsonBody(request, z.object({ action: z.enum(["cancel", "retry"]) }));
  const id = Number(params.id);
  const t = await prisma.osTask.findUniqueOrThrow({ where: { id } });
  if (action === "cancel") {
    if (["COMPLETED", "CANCELLED"].includes(t.status)) throw new Error(`Task already ${t.status}.`);
    await prisma.osTask.update({ where: { id }, data: { status: "CANCELLED", completedAt: new Date() } });
  } else {
    if (!["FAILED", "CANCELLED"].includes(t.status)) throw new Error("Only failed or cancelled tasks can be retried.");
    await prisma.osTask.update({ where: { id }, data: { status: "QUEUED", deadLetter: false, error: null, retryCount: 0, runAfter: new Date(), completedAt: null } });
    after(() => processQueue({ maxTasks: 3, budgetMs: 40_000 }).catch(() => undefined));
  }
  await audit({ actor: caller.name, actorType: "HUMAN", action: `task.${action}`, resource: "task", resourceId: id, ip: caller.ip });
  return { ok: true };
});
