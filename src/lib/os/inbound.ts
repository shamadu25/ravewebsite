import { prisma } from "@/lib/prisma";
import { ORG_ID, type Channel } from "./constants";
import { audit } from "./audit";
import { logActivity, setStage } from "./crm";
import { enqueueTask } from "./queue";

const STOP = /^\s*(stop|unsubscribe|cancel|opt[- ]?out|remove me)\b/i;
export const normalisePhone = (p: string) => p.replace(/[\s()+-]/g, "");

/**
 * Inbound reply handling shared by every channel: honours opt-outs immediately, otherwise records the response,
 * advances the deal and asks the Sales Agent to qualify. Returns what actually happened.
 */
export async function handleInboundReply(opts: { channel: Channel; from: string; text: string; actor: string }) {
  const from = opts.channel === "EMAIL" ? opts.from.toLowerCase() : normalisePhone(opts.from);
  const candidates = await prisma.osOpportunity.findMany({
    where: { orgId: ORG_ID, ...(opts.channel === "EMAIL" ? { contactEmail: { equals: from } } : { contactPhone: { not: null } }) },
    orderBy: { updatedAt: "desc" }, take: 500,
  });
  const opp = opts.channel === "EMAIL" ? candidates[0] : candidates.find((o) => o.contactPhone && normalisePhone(o.contactPhone).endsWith(from.slice(-9)));
  if (!opp) { await audit({ actor: opts.actor, actorType: "WEBHOOK", action: "inbound.unmatched", resource: "inbound", resourceId: from }); return { matched: false as const }; }

  const human = { actor: opts.actor, actorType: "WEBHOOK" as const };
  if (STOP.test(opts.text)) {
    for (const address of new Set([from, (opts.channel === "EMAIL" ? opp.contactEmail : opp.contactPhone)?.toLowerCase() ?? from])) {
      await prisma.osOptOut.upsert({ where: { orgId_channel_address: { orgId: ORG_ID, channel: opts.channel, address } }, create: { orgId: ORG_ID, channel: opts.channel, address, reason: "inbound opt-out" }, update: {} });
    }
    await setStage(opp.id, "NURTURE", human, "opted out");
    await logActivity(opp.id, human, "OPT_OUT", "Prospect opted out; no further outreach on this channel.", opts.channel);
    return { matched: true as const, optOut: true, opportunityId: opp.id };
  }

  const last = await prisma.osOutreach.findFirst({ where: { opportunityId: opp.id, channel: opts.channel, status: "SENT" }, orderBy: { id: "desc" } });
  if (last) await prisma.osOutreach.update({ where: { id: last.id }, data: { responseText: opts.text.slice(0, 5000), respondedAt: new Date() } });
  await logActivity(opp.id, human, "RESPONSE", opts.text.slice(0, 500), opts.channel);
  await prisma.osOpportunity.update({ where: { id: opp.id }, data: { lastContactAt: new Date(), nextFollowUpAt: null } });
  if (["NEW", "RESEARCHED", "CONTACTED"].includes(opp.stage)) await setStage(opp.id, "ENGAGED", human, "prospect replied");
  await enqueueTask({ agentKey: "sales-agent", title: `Qualify ${opp.companyName}`, input: { opportunityId: opp.id, signals: (opp.qualification as { input?: Record<string, number> } | null)?.input ?? {} }, createdBy: opts.actor, priority: "HIGH", idempotencyKey: `qualify:${opp.id}:${Date.now()}`, opportunityId: opp.id });
  return { matched: true as const, optOut: false, opportunityId: opp.id };
}
