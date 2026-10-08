import { api } from "@/lib/os/http";
import { prisma } from "@/lib/prisma";
import { ORG_ID } from "@/lib/os/constants";
import { audit } from "@/lib/os/audit";

export const POST = api<{ id: string }>("agent.pause", async ({ caller, params }) => {
  const a = await prisma.osAlert.findFirstOrThrow({ where: { id: Number(params.id), orgId: ORG_ID } });
  await prisma.osAlert.update({ where: { id: a.id }, data: { resolvedAt: new Date() } });
  await audit({ actor: caller.name, actorType: "HUMAN", action: "alert.resolve", resource: "alert", resourceId: a.id, ip: caller.ip });
  return { ok: true };
});
