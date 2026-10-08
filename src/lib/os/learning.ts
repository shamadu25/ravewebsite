import { prisma } from "@/lib/prisma";
import { ORG_ID } from "./constants";
import { getAgentPerformance } from "./performance";
import { audit } from "./audit";

/**
 * Learning loop (spec §72): observe outcomes → propose. Agents never edit themselves; a candidate only becomes a
 * new agent version when a human accepts it.
 */
export async function proposeLearnings(): Promise<number> {
  const perf = await getAgentPerformance();
  let n = 0;
  for (const p of perf) {
    const finished = p.completed + p.failed;
    if (finished < 5 || p.successRate == null || p.successRate >= 0.6) continue;
    const agent = await prisma.osAgent.findUnique({ where: { key: p.key } });
    if (!agent || agent.autonomy === "ASSISTED") continue;
    const open = await prisma.osLearning.findFirst({ where: { orgId: ORG_ID, agentKey: p.key, status: "PROPOSED" } });
    if (open) continue;
    await prisma.osLearning.create({ data: { orgId: ORG_ID, agentKey: p.key, observation: `${p.name} succeeded on ${Math.round(p.successRate * 100)}% of ${finished} finished tasks.`, proposal: { change: "set_autonomy", autonomy: "ASSISTED", reason: "Low success rate; require human review of its actions until fixed." } } });
    n++;
  }
  return n;
}

export async function decideLearning(id: number, accept: boolean, actor: string) {
  const l = await prisma.osLearning.findUniqueOrThrow({ where: { id } });
  if (l.status !== "PROPOSED") throw new Error(`Already ${l.status}.`);
  if (accept) {
    const prop = l.proposal as { change: string; autonomy: string };
    const agent = await prisma.osAgent.findUniqueOrThrow({ where: { key: l.agentKey } });
    if (prop.change === "set_autonomy") {
      const u = await prisma.osAgent.update({ where: { id: agent.id }, data: { autonomy: prop.autonomy, version: { increment: 1 } } });
      await prisma.osAgentVersion.create({ data: { agentId: agent.id, version: u.version, snapshot: u as never, changedBy: actor, note: `Accepted learning #${id}` } });
    }
  }
  await prisma.osLearning.update({ where: { id }, data: { status: accept ? "ACCEPTED" : "DISMISSED", decidedBy: actor } });
  await audit({ actor, actorType: "HUMAN", action: accept ? "learning.accept" : "learning.dismiss", resource: "learning", resourceId: id });
}
