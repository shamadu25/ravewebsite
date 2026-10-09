import { prisma } from "@/lib/prisma";
import { ORG_ID, type Channel } from "./constants";
import { audit } from "./audit";
import { getChannelAdapter } from "./channels";
import { logActivity, setStage, type Actor } from "./crm";
import { complete, LlmUnavailableError, parseJsonLoose } from "./llm";
import { requestApproval } from "./approvals";
import { makeMessageId, unsubscribeUrl } from "./email-utils";
import { bookingUrl } from "./booking";

const OUTBOUND_PAUSED_KEY = `os:${ORG_ID}:outbound_paused`;

export async function isOutboundPaused(): Promise<boolean> {
  const row = await prisma.systemSetting.findUnique({ where: { key: OUTBOUND_PAUSED_KEY } });
  return row?.value === true;
}
export async function setOutboundPaused(paused: boolean): Promise<void> {
  await prisma.systemSetting.upsert({ where: { key: OUTBOUND_PAUSED_KEY }, create: { key: OUTBOUND_PAUSED_KEY, value: paused }, update: { value: paused } });
}

export type OutreachPurpose = "OUTREACH" | "PROPOSAL";
export const MAX_TOUCHES = 4;

interface DraftOpp { companyName: string; contactName: string | null; recommendedEmployees: unknown; painPoints: unknown; industry: string | null; suggestedOffer?: string | null; dealValueCents?: number }

const OPT_OUT = `If you'd rather not hear from us, reply "unsubscribe" and we will stop immediately.`;
const SIGN = "Best regards,\nRaveSoft Digital Solutions\nhttps://ravesoftsolutions.com";

/** Deterministic copy used when no LLM is configured. Touch 1 = first contact, 2 = nudge, 3 = value, 4 = polite close. */
export function templateDraft(opp: DraftOpp, opts: { touch?: number; purpose?: OutreachPurpose; payLink?: string } = {}) {
  const touch = opts.touch ?? 1;
  const employee = (opp.recommendedEmployees as string[] | null)?.[0] ?? "an AI employee";
  const pain = (opp.painPoints as string[] | null)?.[0];
  const hi = opp.contactName ? `Hi ${opp.contactName.split(" ")[0]},` : `Hello ${opp.companyName} team,`;
  const price = opp.dealValueCents ? `$${Math.round(opp.dealValueCents / 100 / 12).toLocaleString()}/month` : null;

  if (opts.purpose === "PROPOSAL") {
    return {
      subject: `Proposal: ${employee} for ${opp.companyName}`,
      body: `${hi}\n\nThank you for your time. Here is what we propose for ${opp.companyName}:\n\nSolution: ${(opp.suggestedOffer ?? employee).split(" — ")[0]}\n${opp.industry ? `Built for: ${opp.industry}\n` : ""}${price ? `Investment: ${price}, billed monthly (annual billing available).\n` : "Investment: to be confirmed on a short call.\n"}Setup: we configure it with your services, FAQs and pricing, test it with you, then go live — typically within two weeks.\nWhat it does: answers enquiries instantly, qualifies them, books appointments and hands anything sensitive to your team.\n\n${opts.payLink ? `Ready to start? Activate securely online here: ${opts.payLink}\n\nPrefer to talk first, or want something changed? Book a call: ${bookingUrl("proposal")} or just reply.` : `Next step: reply "Yes" and we will send the agreement and start onboarding, or tell us what you would change.`}\n\n${SIGN}\n\n${OPT_OUT}`,
      generatedBy: "template",
    };
  }
  const bodies: Record<number, string> = {
    1: `${hi}\n\n${pain ? `I noticed ${pain.charAt(0).toLowerCase()}${pain.slice(1)}. ` : ""}RaveSoft builds AI employees that handle repetitive customer conversations for ${opp.industry ?? "businesses like yours"} — for example, ${employee}, which answers enquiries and books appointments around the clock.\n\nWould a 15-minute walkthrough this week be useful?\n\nPick a time that suits you: ${bookingUrl("touch1")}`,
    2: `${hi}\n\nJust following up on my note about ${employee} for ${opp.companyName}. It takes over the repetitive enquiries so your team can focus on customers in front of them.\n\nWould a short walkthrough this week suit you?\n\nBook here: ${bookingUrl("touch2")}`,
    3: `${hi}\n\nOne more thought on ${opp.companyName}: businesses like yours lose enquiries when nobody can reply instantly. ${employee} replies in seconds, any hour, and passes real opportunities to your team.\n\nHappy to show you a live example — book a time here: ${bookingUrl("touch3")}`,
    4: `${hi}\n\nI don't want to crowd your inbox, so this is my last note. If improving how ${opp.companyName} handles enquiries ever becomes a priority, reply and we will pick it up straight away.\n\nWishing you a great season ahead.`,
  };
  const subjects: Record<number, string> = { 1: `${employee} for ${opp.companyName}`, 2: `Re: ${employee} for ${opp.companyName}`, 3: `Quick idea for ${opp.companyName}`, 4: `Closing the loop` };
  return { subject: subjects[touch] ?? subjects[1], body: `${bodies[touch] ?? bodies[1]}\n\n${SIGN}\n\n${OPT_OUT}`, generatedBy: "template" };
}

/** Creates a DRAFT message. Uses the LLM when configured; otherwise a clearly-labelled template (generatedBy: "template"). */
export async function draftOutreach(opportunityId: number, a: Actor, channel: Channel = "EMAIL", opts: { purpose?: OutreachPurpose; touch?: number; payLink?: string } = {}) {
  const opp = await prisma.osOpportunity.findUniqueOrThrow({ where: { id: opportunityId } });
  if (opp.orgId !== ORG_ID) throw new Error("Cross-tenant access denied.");
  const purpose = opts.purpose ?? "OUTREACH";
  const sentBefore = await prisma.osOutreach.count({ where: { opportunityId, channel, purpose: "OUTREACH", status: "SENT" } });
  const touch = purpose === "PROPOSAL" ? 1 : Math.min(MAX_TOUCHES, opts.touch ?? sentBefore + 1);
  let draft = templateDraft(opp, { touch, purpose, payLink: opts.payLink });
  try {
    const r = await complete({
      tier: "fast", json: true, temperature: 0.6,
      system: `You write concise, honest, personalised B2B messages for RaveSoft, which builds AI employees. Rules: no false claims, no invented statistics or customers, no fake familiarity, include a one-line opt-out. ${purpose === "PROPOSAL" ? "Write a clear proposal: solution, investment (use ONLY the price given; if none, say it will be confirmed), setup steps, next step. Under 220 words." + (opts.payLink ? ` Include this activation link exactly once, verbatim: ${opts.payLink}` : "") : `This is touch ${touch} of ${MAX_TOUCHES}: ${["", "first contact", "a short friendly nudge that does not repeat the first email", "a value-add with one concrete benefit", "a polite final note that leaves the door open"][touch]}. Under 110 words.`} Return JSON {"subject":string,"body":string}.`,
      user: JSON.stringify({ company: opp.companyName, industry: opp.industry, contact: opp.contactName, painPoints: opp.painPoints, recommended: opp.recommendedEmployees, offer: opp.suggestedOffer, monthlyPriceUsd: opp.dealValueCents ? Math.round(opp.dealValueCents / 100 / 12) : null, channel }),
    });
    const parsed = parseJsonLoose<{ subject?: string; body?: string }>(r.text);
    if (parsed?.body) draft = { subject: parsed.subject ?? draft.subject, body: parsed.body, generatedBy: `${r.provider}:${r.model}` };
  } catch (e) {
    if (!(e instanceof LlmUnavailableError)) throw e;
  }
  const to = channel === "EMAIL" ? opp.contactEmail : opp.contactPhone;
  const row = await prisma.osOutreach.create({
    data: { orgId: ORG_ID, opportunityId, channel, toAddress: to, subject: draft.subject, body: draft.body, generatedBy: draft.generatedBy, purpose, touch, status: "DRAFT" },
  });
  await logActivity(opportunityId, a, "OUTREACH_DRAFTED", `${channel} ${purpose === "PROPOSAL" ? "proposal" : `touch ${touch}`} drafted (${draft.generatedBy}).`, channel);
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
  const outbound: Parameters<typeof adapter.send>[0] = { to: msg.toAddress, subject: msg.subject, body: msg.body };
  if (msg.channel === "EMAIL") {
    // Compliance + threading: signed one-click unsubscribe, our own Message-ID, and a reply chain for follow-ups.
    const link = unsubscribeUrl(msg.opportunityId, msg.toAddress);
    const fromAddr = process.env.SMTP_FROM ?? process.env.SMTP_USER ?? "noreply@ravesoftsolutions.com";
    const prev = await prisma.osOutreach.findFirst({ where: { opportunityId: msg.opportunityId, channel: "EMAIL", status: "SENT", id: { not: outreachId } }, orderBy: { id: "desc" }, select: { providerRef: true } });
    outbound.messageId = makeMessageId(outreachId, fromAddr);
    outbound.unsubscribeUrl = link;
    if (prev?.providerRef?.startsWith("<")) { outbound.inReplyTo = prev.providerRef; outbound.references = prev.providerRef; }
    outbound.body = `${msg.body}\n\n—\nUnsubscribe: ${link}`;
  }
  const res = await adapter.send(outbound);
  if (!res.ok) return block(res.error, res.notConnected ? "notConnected" : "error");

  // Cadence: day 3 → day 7 → day 14, then stop. Proposals get a 3-day check-in.
  const followUpDays = msg.purpose === "PROPOSAL" ? 3 : ({ 1: 3, 2: 4, 3: 7 } as Record<number, number>)[msg.touch] ?? null;
  await prisma.osOutreach.update({ where: { id: outreachId }, data: { status: "SENT", sentAt: new Date(), providerRef: res.providerRef, error: null, approvalId: approvalId ?? msg.approvalId, followUpAt: followUpDays ? new Date(Date.now() + followUpDays * 86400_000) : null } });
  await prisma.osOpportunity.update({ where: { id: msg.opportunityId }, data: { lastContactAt: new Date(), nextFollowUpAt: followUpDays ? new Date(Date.now() + followUpDays * 86400_000) : null, nextAction: msg.purpose === "PROPOSAL" ? "Await proposal decision; follow up" : followUpDays ? `Follow-up touch ${msg.touch + 1} due` : "Sequence complete — nurture" } });
  await logActivity(msg.opportunityId, a, "OUTREACH_SENT", `${msg.channel} message sent to ${msg.toAddress}`, msg.channel);
  const opp = await prisma.osOpportunity.findUnique({ where: { id: msg.opportunityId } });
  if (opp && msg.purpose === "PROPOSAL" && !["PROPOSAL", "NEGOTIATION", "VERBAL_COMMITMENT", "WON"].includes(opp.stage)) await setStage(opp.id, "PROPOSAL", a, "proposal sent");
  else if (opp && ["NEW", "RESEARCHED"].includes(opp.stage)) await setStage(opp.id, "CONTACTED", a, "outreach sent");
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

/** Emails already sent today by the automated sequence (deliverability guard for a mailbox that is still warming up). */
export async function emailsSentToday(): Promise<number> {
  const d = new Date(); d.setUTCHours(0, 0, 0, 0);
  return prisma.osOutreach.count({ where: { orgId: ORG_ID, channel: "EMAIL", status: "SENT", sentAt: { gte: d } } });
}
export const emailDailyCap = () => Math.max(1, Number(process.env.OS_EMAIL_DAILY_CAP ?? 40));

const AUTO_FOLLOWUPS_KEY = `os:${ORG_ID}:auto_followups`;
export async function autoFollowupsEnabled(): Promise<boolean> {
  return (await prisma.systemSetting.findUnique({ where: { key: AUTO_FOLLOWUPS_KEY } }))?.value === true;
}
export async function setAutoFollowups(on: boolean): Promise<void> {
  await prisma.systemSetting.upsert({ where: { key: AUTO_FOLLOWUPS_KEY }, create: { key: AUTO_FOLLOWUPS_KEY, value: on }, update: { value: on } });
}
