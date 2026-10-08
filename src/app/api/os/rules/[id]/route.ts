import { api } from "@/lib/os/http";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/os/audit";

export const POST = api<{ id: string }>("agent.configure", async ({ caller, params }) => {
  const r = await prisma.osRule.findUniqueOrThrow({ where: { id: Number(params.id) } });
  await prisma.osRule.update({ where: { id: r.id }, data: { enabled: !r.enabled } });
  await audit({ actor: caller.name, actorType: "HUMAN", action: "rule.toggle", resource: "rule", resourceId: r.id, output: { enabled: !r.enabled }, ip: caller.ip });
  return { enabled: !r.enabled };
});
