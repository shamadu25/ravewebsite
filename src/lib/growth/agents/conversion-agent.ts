import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/os/audit";
import { setStage } from "@/lib/os/crm";
import { bookingUrl } from "@/lib/os/booking";
import { GROWTH_ORG, SENDER } from "../config";
import { contentHash } from "../policy";
import { checkReplyPolicy } from "./reply-agent";
import { suppressionReason } from "../suppression";

const actor = { actor: "agent:conversion", actorType: "AI_AGENT" as const };
const POSITIVE = ["INTERESTED", "REQUESTING_DETAILS", "PRICING_QUESTION", "REFERRAL"];
const EARLY = ["NEW", "RESEARCHED", "CONTACTED"];
const NUDGE_AFTER_DAYS = 3;
const NUDGE_EVERY_DAYS = 4;
const MAX_NUDGES = 2;

/**
 * Moves engaged prospects through the pipeline and keeps them from going cold:
 * 1) positive reply -> ENGAGED, 2) stale hot replies are flagged, 3) idle ENGAGED/DEMO/PROPOSAL deals get a nudge DRAFT
 * (same human approval as every other message). It never closes, discounts or quotes beyond approved pricing.
 */
export async function runConversionAgent() {
  const out = { advanced: 0, nudgesDrafted: 0, staleReplies: [] as { replyId: number; company: string; hoursWaiting: number }[] };
  const positives = await prisma.grReply.findMany({ where: { category: { in: POSITIVE } }, orderBy: { id: "desc" }, take: 200 });
  const seen = new Set<number>();
  for (const r of positives) {
    if (!r.companyId || seen.has(r.companyId)) continue;
    seen.add(r.companyId);
    const co = await prisma.grCompany.findUnique({ where: { id: r.companyId } });
    if (!co?.opportunityId) continue;
    const opp = await prisma.osOpportunity.findUnique({ where: { id: co.opportunityId }, select: { stage: true } });
    if (opp && EARLY.includes(opp.stage)) { await setStage(co.opportunityId, "ENGAGED", actor, `positive reply: ${r.category}`); out.advanced++; }
    const hours = (Date.now() - r.createdAt.getTime()) / 3600_000;
    const answered = r.reviewStatus === "ANSWERED" || (await prisma.grReplyDraft.count({ where: { companyId: co.id, status: "SENT", sentAt: { gte: r.createdAt } } })) > 0;
    if (!answered && hours > 24) out.staleReplies.push({ replyId: r.id, company: co.name, hoursWaiting: Math.round(hours) });
  }

  const sender = SENDER().identity;
  const idle = await prisma.grCompany.findMany({ where: { orgId: GROWTH_ORG, outreachDisabled: false, opportunityId: { not: null } }, take: 100 });
  for (const co of idle) {
    const opp = await prisma.osOpportunity.findUnique({ where: { id: co.opportunityId as number } });
    if (!opp?.contactEmail || !["ENGAGED", "DEMO", "PROPOSAL", "NEGOTIATION"].includes(opp.stage)) continue;
    if (Date.now() - opp.updatedAt.getTime() < NUDGE_AFTER_DAYS * 86400_000) continue;
    const prior = await prisma.grReplyDraft.findMany({ where: { companyId: co.id, kind: "NUDGE" } });
    if (prior.length >= MAX_NUDGES || prior.some((p) => p.status === "PENDING_APPROVAL" || Date.now() - p.createdAt.getTime() < NUDGE_EVERY_DAYS * 86400_000)) continue;
    if (await suppressionReason(opp.contactEmail, co.domain)) continue;
    const late = ["DEMO", "PROPOSAL", "NEGOTIATION"].includes(opp.stage);
    const subject = late ? `Next step for ${co.name}` : `Re: ${co.name}`;
    const body = late
      ? `Hello,\n\nChecking in on where ${co.name} has got to. If something in the proposal or demo raised questions, tell me and I will answer or bring in the right person. If the timing is not right, say so and I will leave it with you.\n\n${sender}`
      : `Hello,\n\nI wanted to follow up on your earlier reply. A short call would let me show how this would work for ${co.name} and answer any questions. You can pick a time here: ${bookingUrl("growth-nudge")}\n\nIf the timing is not right, just say so and I will leave it with you.\n\n${sender}`;
    const policy = checkReplyPolicy({ subject, body, senderIdentity: sender });
    await prisma.grReplyDraft.create({ data: { companyId: co.id, toEmail: opp.contactEmail.toLowerCase(), kind: "NUDGE", subject, body, contentHash: contentHash({ toEmail: opp.contactEmail, senderIdentity: sender, subject, body }), flags: policy as never, model: "template", status: policy.passed ? "PENDING_APPROVAL" : "POLICY_FAILED" } });
    out.nudgesDrafted++;
  }
  await audit({ ...actor, action: "growth.conversion.sweep", resource: "growth_agent", output: { advanced: out.advanced, nudges: out.nudgesDrafted, stale: out.staleReplies.length } });
  return out;
}
