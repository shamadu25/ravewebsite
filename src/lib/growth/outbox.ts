import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/os/audit";
import { getChannelAdapter } from "@/lib/os/channels";
import { isOutboundPaused } from "@/lib/os/outreach";
import { makeMessageId } from "@/lib/os/email-utils";
import { logActivity, setStage } from "@/lib/os/crm";
import { GROWTH_ORG, SENDER, growthEnabled } from "./config";
import { checkPolicy, contentHash } from "./policy";
import { getCadence } from "./cadence";
import { suppressionReason, emailDomain } from "./suppression";
import { growthUnsubUrl } from "./unsub";

const INBOX_POLL_KEY = `os:${GROWTH_ORG}:inbox_last_poll`;
const INBOX_MAX_AGE_MS = 30 * 60_000;
const actor = { actor: "growth-dispatcher", actorType: "SYSTEM" as const };

export type Gate = { ok: true } | { ok: false; action: "CANCEL" | "DEFER"; reason: string };

/** Reply status must be KNOWN and fresh. If the mailbox cannot be read, we pause rather than assume "no reply". */
export async function inboxFresh(now = Date.now()): Promise<boolean> {
  const row = await prisma.systemSetting.findUnique({ where: { key: INBOX_POLL_KEY } });
  const t = typeof row?.value === "string" ? Date.parse(row.value) : NaN;
  return Number.isFinite(t) && now - t < INBOX_MAX_AGE_MS;
}

export async function ensureOpportunity(companyId: number, contactId: number): Promise<number> {
  const c = await prisma.grCompany.findUniqueOrThrow({ where: { id: companyId } });
  const contact = await prisma.grContact.findUniqueOrThrow({ where: { id: contactId }, include: { person: true } });
  if (c.opportunityId) {
    await prisma.osOpportunity.update({ where: { id: c.opportunityId }, data: { contactEmail: contact.email, contactName: contact.person?.name ?? undefined } });
    return c.opportunityId;
  }
  const opp = await prisma.osOpportunity.create({
    data: { orgId: GROWTH_ORG, companyName: c.name, industry: c.category, website: c.website, country: c.country, contactName: contact.person?.name ?? null, contactEmail: contact.email, businessUnit: "KOVABOT", revenueEngine: "AI_EMPLOYEE_SERVICES", source: "growth-engine", score: c.fitScore, stage: "RESEARCHED", nextAction: "Outreach awaiting approval" },
  });
  await prisma.grCompany.update({ where: { id: c.id }, data: { opportunityId: opp.id } });
  return opp.id;
}

/** Every pre-send check. Used by the dispatcher; exported so tests exercise the exact gate order. */
export async function checkGates(outboxId: number): Promise<Gate> {
  const ob = await prisma.grOutbox.findUniqueOrThrow({ where: { id: outboxId } });
  const [draft, approval, company] = await Promise.all([
    prisma.grDraft.findUniqueOrThrow({ where: { id: ob.draftId } }),
    prisma.grApproval.findUniqueOrThrow({ where: { id: ob.approvalId } }),
    prisma.grCompany.findUniqueOrThrow({ where: { id: ob.companyId } }),
  ]);
  const cancel = (reason: string): Gate => ({ ok: false, action: "CANCEL", reason });
  const defer = (reason: string): Gate => ({ ok: false, action: "DEFER", reason });

  if (await isOutboundPaused()) return defer("Outbound messaging is paused.");
  if (company.outreachDisabled) return cancel("Outreach disabled for this company.");
  if (approval.status !== "ACTIVE") return cancel(`Approval ${approval.status.toLowerCase()}${approval.invalidReason ? `: ${approval.invalidReason}` : ""}.`);
  if (approval.expiresAt.getTime() < Date.now() && ob.attempts === 0) return cancel("Approval expired; re-approve to send.");
  if (draft.status !== "APPROVED") return cancel(`Draft is ${draft.status}.`);
  const latest = await prisma.grDraft.findFirst({ where: { companyId: draft.companyId, sequenceKey: draft.sequenceKey, touch: draft.touch }, orderBy: { version: "desc" } });
  if (latest && latest.id !== draft.id) return cancel("A newer draft version exists.");
  const hash = contentHash({ toEmail: draft.toEmail, senderIdentity: draft.senderIdentity, subject: draft.subject, body: draft.body });
  if (hash !== approval.contentHash || draft.toEmail !== approval.toEmail || draft.toEmail !== ob.toEmail) return cancel("Approved content or recipient changed.");

  const sup = await suppressionReason(ob.toEmail, company.domain);
  if (sup) return cancel(sup);
  const contact = await prisma.grContact.findUniqueOrThrow({ where: { id: draft.contactId } });
  if (contact.status !== "VERIFIED") return cancel(`Recipient is ${contact.status}, not provider-verified.`);
  const policy = checkPolicy({ subject: draft.subject, body: draft.body, toEmail: draft.toEmail, senderIdentity: draft.senderIdentity, postalAddress: SENDER().postalAddress, touch: draft.touch });
  if (!policy.passed) return cancel(`Policy check failed: ${policy.issues.map((i) => i.code).join(", ")}.`);

  // Follow-ups only after the previous touch really went out, and never after a reply or a meeting.
  const prior = draft.touch > 1 ? await prisma.grOutbox.findFirst({ where: { companyId: ob.companyId, status: "SENT", draft: { sequenceKey: draft.sequenceKey, touch: draft.touch - 1 } }, orderBy: { id: "desc" } }) : null;
  const cad = await getCadence();
  if (draft.touch > 1) {
    if (!prior?.sentAt) return defer("Previous touch has not been sent.");
    const due = prior.sentAt.getTime() + (cad.followUpDays[Math.min(draft.touch - 2, cad.followUpDays.length - 1)] ?? 7) * 86400_000;
    if (Date.now() < due) return defer("Follow-up interval has not elapsed.");
  }
  if (company.opportunityId) {
    const opp = await prisma.osOpportunity.findUnique({ where: { id: company.opportunityId }, select: { stage: true } });
    if (opp && ["ENGAGED", "QUALIFIED", "DEMO", "PROPOSAL", "NEGOTIATION", "VERBAL_COMMITMENT", "WON", "LOST", "NURTURE"].includes(opp.stage) && draft.touch > 1) return cancel(`Deal stage is ${opp.stage}; automated sequence stopped.`);
  }
  const replies = await prisma.grReply.count({ where: { companyId: ob.companyId, category: { not: "OUT_OF_OFFICE" } } });
  if (replies > 0) return cancel("A reply was received; automated sequence stopped.");
  if (!(await inboxFresh())) return defer("Reply status unknown: mailbox has not been checked in the last 30 minutes (IMAP must be configured).");
  if (company.opportunityId) {
    const raw = await prisma.osActivity.count({ where: { opportunityId: company.opportunityId, type: { in: ["RESPONSE", "OPT_OUT", "BOUNCE"] } } });
    const handled = await prisma.grReply.count({ where: { companyId: ob.companyId, messageId: { startsWith: "act-" } } });
    if (raw > handled) return defer("Unprocessed inbound activity; waiting for reply classification.");
  }

  // Rate limits: global/day, per-hour, per-recipient-domain/day, minimum gap.
  const day = new Date(); day.setUTCHours(0, 0, 0, 0);
  const sentToday = await prisma.grOutbox.findMany({ where: { status: "SENT", sentAt: { gte: day } }, select: { toEmail: true, sentAt: true } });
  if (sentToday.length >= cad.dailyCap) return defer(`Daily send cap (${cad.dailyCap}) reached.`);
  const hourAgo = Date.now() - 3600_000;
  if (sentToday.filter((s) => s.sentAt && s.sentAt.getTime() > hourAgo).length >= cad.hourlyCap) return defer(`Hourly send cap (${cad.hourlyCap}) reached.`);
  if (sentToday.filter((s) => emailDomain(s.toEmail) === emailDomain(ob.toEmail)).length >= cad.perDomainPerDay) return defer("Per-domain daily limit reached.");
  const lastSent = sentToday.reduce((m, s) => Math.max(m, s.sentAt?.getTime() ?? 0), 0);
  if (Date.now() - lastSent < cad.minGapMinutes * 60_000) return defer("Minimum gap between sends not elapsed.");
  return { ok: true };
}

export interface DispatchReport { considered: number; sent: number; cancelled: number; deferred: number; failed: number; details: string[] }

/** The only place Growth mail leaves the system. Claim → gates → send → record. One message per run per call keeps provider limits safe. */
export async function dispatchDue(max = 5): Promise<DispatchReport> {
  const rep: DispatchReport = { considered: 0, sent: 0, cancelled: 0, deferred: 0, failed: 0, details: [] };
  if (!growthEnabled()) { rep.details.push("GROWTH_ENGINE_ENABLED is not true."); return rep; }
  const due = await prisma.grOutbox.findMany({ where: { status: "SCHEDULED", scheduledAt: { lte: new Date() } }, orderBy: { scheduledAt: "asc" }, take: max });
  for (const row of due) {
    rep.considered++;
    // Atomic claim: a second worker updating the same row gets count 0 and skips it.
    const claim = await prisma.grOutbox.updateMany({ where: { id: row.id, status: "SCHEDULED" }, data: { status: "SENDING", attempts: { increment: 1 } } });
    if (claim.count === 0) continue;
    try {
      const gate = await checkGates(row.id);
      if (!gate.ok) {
        if (gate.action === "CANCEL") { await prisma.grOutbox.update({ where: { id: row.id }, data: { status: "CANCELLED", cancelReason: gate.reason } }); rep.cancelled++; }
        else { await prisma.grOutbox.update({ where: { id: row.id }, data: { status: "SCHEDULED", attempts: { decrement: 1 }, error: gate.reason } }); rep.deferred++; }
        rep.details.push(`#${row.id} ${gate.action}: ${gate.reason}`);
        continue;
      }
      const draft = await prisma.grDraft.findUniqueOrThrow({ where: { id: row.draftId }, include: { company: true } });
      const adapter = getChannelAdapter("EMAIL");
      if (!adapter.status().connected) { await prisma.grOutbox.update({ where: { id: row.id }, data: { status: "SCHEDULED", attempts: { decrement: 1 }, error: adapter.status().reason ?? "Email not connected" } }); rep.deferred++; continue; }
      const fromAddr = process.env.SMTP_FROM ?? process.env.SMTP_USER ?? "noreply@ravesoftsolutions.com";
      const messageId = makeMessageId(row.id, fromAddr);
      // Persist the Message-ID BEFORE sending so a crash after SMTP acceptance can be reconciled, never blindly re-sent.
      await prisma.grOutbox.update({ where: { id: row.id }, data: { providerRef: messageId } });
      const prev = await prisma.grOutbox.findFirst({ where: { companyId: row.companyId, status: "SENT", id: { not: row.id } }, orderBy: { id: "desc" } });
      const link = growthUnsubUrl(draft.companyId, draft.toEmail);
      const res = await adapter.send({ to: draft.toEmail, subject: draft.subject, body: `${draft.body}\n\n—\nUnsubscribe: ${link}`, messageId, unsubscribeUrl: link, ...(prev?.providerRef?.startsWith("<") ? { inReplyTo: prev.providerRef, references: prev.providerRef } : {}) });
      if (!res.ok) {
        const give = row.attempts + 1 >= 3;
        await prisma.grOutbox.update({ where: { id: row.id }, data: { status: give ? "FAILED" : "SCHEDULED", error: res.error, scheduledAt: new Date(Date.now() + 15 * 60_000 * (row.attempts + 1)) } });
        rep.failed++; rep.details.push(`#${row.id} send error: ${res.error}`);
        await audit({ ...actor, action: "growth.send", resource: "growth_outbox", resourceId: row.id, result: "FAILURE", output: { error: res.error } });
        continue;
      }
      await prisma.grOutbox.update({ where: { id: row.id }, data: { status: "SENT", sentAt: new Date(), providerRef: res.providerRef || messageId, error: null } });
      if (draft.company.opportunityId) {
        // Mirror into the platform outreach ledger so inbox threading, bounce and reply handling work unchanged.
        await prisma.osOutreach.create({ data: { orgId: GROWTH_ORG, opportunityId: draft.company.opportunityId, channel: "EMAIL", toAddress: draft.toEmail, subject: draft.subject, body: draft.body, generatedBy: `growth:${draft.model}`, touch: draft.touch, status: "SENT", providerRef: res.providerRef || messageId, sentAt: new Date() } });
        await logActivity(draft.company.opportunityId, actor, "OUTREACH_SENT", `Growth Engine touch ${draft.touch} sent to ${draft.toEmail}`, "EMAIL");
        if (["NEW", "RESEARCHED"].includes((await prisma.osOpportunity.findUnique({ where: { id: draft.company.opportunityId }, select: { stage: true } }))?.stage ?? "")) await setStage(draft.company.opportunityId, "CONTACTED", actor, "growth outreach sent");
      }
      await audit({ ...actor, action: "growth.send", resource: "growth_outbox", resourceId: row.id, output: { to: draft.toEmail, touch: draft.touch, draftVersion: draft.version } });
      rep.sent++;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "dispatch error";
      await prisma.grOutbox.update({ where: { id: row.id }, data: { status: "SCHEDULED", error: msg, scheduledAt: new Date(Date.now() + 15 * 60_000) } }).catch(() => undefined);
      rep.failed++; rep.details.push(`#${row.id} ${msg}`);
    }
  }
  return rep;
}

/** Rows stuck in SENDING (crashed worker) are NOT re-sent automatically: they need a human to check the mailbox. */
export async function stuckSending(olderThanMin = 10) {
  return prisma.grOutbox.findMany({ where: { status: "SENDING", createdAt: { lt: new Date(Date.now() - olderThanMin * 60_000) } } });
}
