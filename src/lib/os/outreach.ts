import { prisma } from "@/lib/prisma";
import { ORG_ID, type Channel } from "./constants";
import { audit } from "./audit";
import { getChannelAdapter } from "./channels";
import { logActivity, setStage, type Actor } from "./crm";
import { complete, LlmUnavailableError, parseJsonLoose } from "./llm";
import { requestApproval } from "./approvals";

const OUTBOUND_PAUSED_KEY = `os:${ORG_ID}:outbound_paused`;

export async function isOutboundPaused(): Promise<boolean> {
  const row = await prisma.systemSetting.findUnique({ where: { key: OUTBOUND_PAUSED_KEY } });
  return row?.value === true;
}
export async function setOutboundPaused(paused: boolean): Promise<void> {
  await prisma.systemSetting.upsert({ where: { key: OUTBOUND_PAUSED_KEY }, create: { key: OUTBOUND_PAUSED_KEY, value: paused }, update: { value: paused } });
}

export function templateDraft(opp: { companyName: string; contactName: string | null; recommendedEmployees: unknown; painPoints: unknown; industry: string | null }) {
  const employee = (opp.recommendedEmployees as string[] | null)?.[0] ?? "an AI employee";
  const pain = (opp.painPoints as string[] | null)?.[0];
  const greeting = opp.contactName ? `Hi ${opp.contactName.split(" ")[0]},` : `Hello ${opp.companyName} team,`;
  return {
    subject: `${employee} for ${opp.companyName}`,
    body: `${greeting}\n\n${pain ? `I noticed ${pain.charAt(0).toLowerCase()}${pain.slice(1)}. ` : ""}RaveSoft builds AI employees that handle repetitive customer conversations for ${opp.industry ?? "businesses like yours"} — for example, ${employee}, which answers enquiries and books appointments around the clock.\n\nWould a 15-minute walkthrough this week be useful?\n\nBest regards,\nRaveSoft Digital Solutions\nhttps://ravesoftsolutions.com\n\nIf you'd rather not hear from us, reply "unsubscribe" and we will stop immediately.`,
    generatedBy: "template",
  };
}

/** Creates a DRAFT message. Uses the LLM when configured; otherwise a clearly-labelled template (generatedBy: "template"). */
export async function draftOutreach(opportunityId: number, a: Actor, channel: Channel = "EMAIL") {
  const opp = await prisma.osOpportunity.findUniqueOrThrow({ where: { id: opportunityId } });
  if (opp.orgId !== ORG_ID) throw new Error("Cross-tenant access denied.");
  let draft = templateDraft(opp);
  try {
    const r = await complete({
      tier: "fast", json: true, temperature: 0.6,
      system: "You write concise, honest, personalised B2B outreach for RaveSoft, which builds AI employees. No false claims, no fake familiarity, under 120 words, include a one-line opt-out. Return JSON {\"subject\":string,\"body\":string}.",
      user: JSON.stringify({ company: opp.companyName, industry: opp.industry, contact: opp.contactName, painPoints: opp.painPoints, recommended: opp.recommendedEmployees, offer: opp.suggestedOffer, channel }),
    });
    const parsed = parseJsonLoose<{ subject?: string; body?: string }>(r.text);
    if (parsed?.body) draft = { subject: parsed.subject ?? draft.subject, body: parsed.body, generatedBy: `${r.provider}:${r.model}` };
  } catch (e) {
    if (!(e instanceof LlmUnavailableError)) throw e;
  }
  const to = channel === "EMAIL" ? opp.contactEmail : opp.contactPhone;
  const row = await prisma.osOutreach.create({
    data: { orgId: ORG_ID, opportunityId, channel, toAddress: to, subject: draft.subject, body: draft.body, generatedBy: draft.generatedBy, status: "DRAFT" },
  });
  await logActivity(opportunityId, a, "OUTREACH_DRAFTED", `${channel} draft created (${draft.generatedBy}).`, channel);
  await audit({ ...a, action: "outreach.draft", resource: "outreach", resourceId: row.id, output: { channel, generatedBy: draft.generatedBy } });
  return row;
}

export type SendOutcome = { status: "SENT" | "FAILED" | "BLOCKED"; reason?: string; notConnected?: boolean };

type BlockKind = "policy" | "notConnected" | "error";

/** The ONLY code path that sends outreach. Opt-out, pause switch, address and adapter checks all run here. */
export async function sendOutreach(outreachId: number, a: Actor, approvalId?: number): Promise<SendOutcome> {
  const msg = await prisma.osOutreach.findUniqueOrThrow({ where: { id: outreachId } });
  if (msg.orgId !== ORG_ID) throw new Error("Cross-tenant access denied.");
  if (msg.status === "SENT") return { status: "SENT" };

  const block = async (reason: string, kind: BlockKind = "policy"): Promise<SendOutcome> => {
    const notConnected = kind === "notConnected";
    const status = kind === "policy" ? "BLOCKED" : "FAILED";
    await prisma.osOutreach.update({ where: { id: outreachId }, data: { status, error: reason } });
    await logActivity(msg.opportunityId, a, "OUTREACH_NOT_SENT", reason, msg.channel);
    await audit({ ...a, action: "outreach.send", resource: "outreach", resourceId: outreachId, result: "FAILURE", output: { reason }, approvalId });
    return { status, reason, notConnected };
  };

  if (await isOutboundPaused()) return block("Outbound messaging is paused.");
  if (!msg.toAddress) return block(`No ${msg.channel} address on this prospect.`);
  const raw = msg.toAddress.toLowerCase();
  const optedOut = await prisma.osOptOut.findFirst({ where: { orgId: ORG_ID, channel: msg.channel, address: { in: [raw, raw.replace(/[\s()+-]/g, "")] } } });
  if (optedOut) return block("Recipient has opted out.");

  const adapter = getChannelAdapter(msg.channel as Channel);
  const res = await adapter.send({ to: msg.toAddress, subject: msg.subject, body: msg.body });
  if (!res.ok) return block(res.error, res.notConnected ? "notConnected" : "error");

  await prisma.osOutreach.update({ where: { id: outreachId }, data: { status: "SENT", sentAt: new Date(), providerRef: res.providerRef, error: null, approvalId: approvalId ?? msg.approvalId, followUpAt: new Date(Date.now() + 3 * 86400_000) } });
  await prisma.osOpportunity.update({ where: { id: msg.opportunityId }, data: { lastContactAt: new Date(), nextFollowUpAt: new Date(Date.now() + 3 * 86400_000), nextAction: "Follow up if no reply" } });
  await logActivity(msg.opportunityId, a, "OUTREACH_SENT", `${msg.channel} message sent to ${msg.toAddress}`, msg.channel);
  const opp = await prisma.osOpportunity.findUnique({ where: { id: msg.opportunityId } });
  if (opp && ["NEW", "RESEARCHED"].includes(opp.stage)) await setStage(opp.id, "CONTACTED", a, "outreach sent");
  await audit({ ...a, action: "outreach.send", resource: "outreach", resourceId: outreachId, output: { channel: msg.channel, providerRef: res.providerRef }, approvalId });
  return { status: "SENT" };
}

export async function submitForApproval(outreachId: number, requestedBy: string, taskId?: number | null) {
  const msg = await prisma.osOutreach.findUniqueOrThrow({ where: { id: outreachId }, include: { opportunity: true } });
  const approval = await requestApproval({
    kind: "OUTREACH",
    title: `Send ${msg.channel.toLowerCase()} outreach to ${msg.opportunity.companyName}`,
    objective: `Open a conversation with ${msg.opportunity.companyName} (score ${msg.opportunity.score ?? "n/a"}).`,
    context: `To: ${msg.toAddress ?? "—"}\nSubject: ${msg.subject ?? "—"}\n\n${msg.body}`,
    recommendation: "Approve and send.",
    expectedImpact: msg.opportunity.dealValueCents ? `Potential deal value $${(msg.opportunity.dealValueCents / 100).toLocaleString()}/yr` : undefined,
    risks: "First contact on a brand-new relationship; reputational risk if the message is off-target.",
    requiredRole: "MANAGER",
    action: { type: "outreach.send", outreachId },
    taskId, requestedBy,
  });
  await prisma.osOutreach.update({ where: { id: outreachId }, data: { status: "PENDING_APPROVAL", approvalId: approval.id } });
  return approval;
}
