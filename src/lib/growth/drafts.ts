import { prisma } from "@/lib/prisma";
import { complete, LlmUnavailableError, parseJsonLoose } from "@/lib/os/llm";
import { audit } from "@/lib/os/audit";
import { GROWTH_ORG, OFFER, SENDER } from "./config";
import { checkPolicy, contentHash } from "./policy";
import { getCadence } from "./cadence";
import { suppressionReason } from "./suppression";

export const PROMPT_VERSION = "growth-outreach-v1";

export class GrowthError extends Error {}

interface EvidenceLite { id: number; signal: string; claim: string; sourceUrl: string }

/** Deterministic, evidence-grounded fallback. Problems are phrased as questions, never facts. */
export function templateMessage(o: { companyName: string; firstName?: string | null; touch: number; evidence: EvidenceLite[]; useCase: string | null; sender: string; postal: string; unsubscribeLine: string }) {
  const hi = o.firstName ? `Hi ${o.firstName},` : `Hello ${o.companyName} team,`;
  const ev = o.evidence[0];
  const hook = ev ? `I came across ${o.companyName} (${ev.claim.replace(/[.\s]+$/, "")}; source: ${ev.sourceUrl}).` : `I'm reaching out to ${o.companyName}.`;
  const cap = OFFER.confirmedCapabilities.slice(0, 2).join(" and ");
  const bodies: Record<number, string> = {
    1: `${hi}\n\n${hook} When new enquiries or estimate requests arrive, how quickly does someone get back to them after hours?\n\nWe offer an ${OFFER.name} that can ${cap}. If that is relevant, would a short call or a quick look at how it would work for ${o.companyName} be useful?`,
    2: `${hi}\n\nFollowing up on my earlier note about ${o.useCase?.toLowerCase() ?? "handling enquiries"} at ${o.companyName}. Is this something you are looking at this quarter? If not, no problem.`,
    3: `${hi}\n\nI'll close the loop here so I don't crowd your inbox. If handling enquiries and estimate follow-up becomes a priority, reply and we'll pick it up.`,
  };
  const subjects: Record<number, string> = { 1: `Enquiry handling at ${o.companyName}`, 2: `Quick follow-up for ${o.companyName}`, 3: `Closing the loop` };
  const t = Math.min(3, Math.max(1, o.touch));
  return { subject: subjects[t], body: `${bodies[t]}\n\n${o.sender}\n${o.postal}\n\n${o.unsubscribeLine}` };
}

export async function generateDraft(opts: { companyId: number; contactId: number; touch: number; sequenceKey?: string; actor: string }) {
  const [company, contact] = await Promise.all([
    prisma.grCompany.findUniqueOrThrow({ where: { id: opts.companyId }, include: { evidence: { orderBy: { id: "asc" } } } }),
    prisma.grContact.findUniqueOrThrow({ where: { id: opts.contactId }, include: { person: true } }),
  ]);
  if (contact.companyId !== company.id) throw new GrowthError("Contact does not belong to this company.");
  if (company.status !== "QUALIFIED") throw new GrowthError(`Company is ${company.status}; only QUALIFIED companies can receive outreach drafts.`);
  if (company.outreachDisabled) throw new GrowthError("Outreach is disabled for this company.");
  if (contact.status !== "VERIFIED") throw new GrowthError(`Contact status is ${contact.status}; only provider-verified addresses can be drafted.`);
  const sup = await suppressionReason(contact.email, company.domain);
  if (sup) throw new GrowthError(sup);

  const evidence = company.evidence.filter((e) => e.sourceUrl).slice(0, 4);
  const sender = SENDER();
  const unsubscribeLine = `If you'd rather not hear from us, reply "unsubscribe" or use the unsubscribe link and we will stop immediately.`;
  let msg = templateMessage({ companyName: company.name, firstName: contact.person?.name.split(" ")[0] ?? null, touch: opts.touch, evidence, useCase: company.useCase, sender: sender.identity, postal: sender.postalAddress, unsubscribeLine });
  let model = "template";
  try {
    const r = await complete({
      tier: "fast", json: true, temperature: 0.5,
      system: `You write short, honest B2B cold emails. Use ONLY the evidence given. State problems as questions, never as facts. Mention only these capabilities: ${OFFER.confirmedCapabilities.join("; ")}. No hype, no guarantees, no case studies, no claims about competitors, no fake familiarity, no false urgency. Touch ${opts.touch} of 3 (1 first contact, 2 brief follow-up, 3 polite close). Under 120 words. End with a sign-off line "${sender.identity}", then "${sender.postalAddress}", then this opt-out line verbatim: ${unsubscribeLine}. Return JSON {"subject":string,"body":string}.`,
      user: JSON.stringify({ company: company.name, contactFirstName: contact.person?.name.split(" ")[0] ?? null, role: contact.person?.role ?? null, useCase: company.useCase, evidence: evidence.map((e) => ({ claim: e.claim, source: e.sourceUrl })) }),
    });
    const p = parseJsonLoose<{ subject?: string; body?: string }>(r.text);
    if (p?.subject && p?.body) { msg = { subject: p.subject, body: p.body }; model = `${r.provider}:${r.model}`; }
  } catch (e) { if (!(e instanceof LlmUnavailableError)) throw e; }

  return createDraftVersion({ companyId: company.id, contactId: contact.id, toEmail: contact.email, touch: opts.touch, sequenceKey: opts.sequenceKey ?? "default", subject: msg.subject, body: msg.body, evidenceIds: evidence.map((e) => e.id), model, promptVersion: PROMPT_VERSION, actor: opts.actor });
}

/** Every create/edit is a NEW version. Older versions are superseded and their approvals/outbox rows invalidated. */
export async function createDraftVersion(o: { companyId: number; contactId: number; toEmail: string; touch: number; sequenceKey: string; subject: string; body: string; evidenceIds: number[]; model: string; promptVersion: string; actor: string; rationale?: string }) {
  const sender = SENDER();
  const policy = checkPolicy({ subject: o.subject, body: o.body, toEmail: o.toEmail, senderIdentity: sender.identity, postalAddress: sender.postalAddress, touch: o.touch });
  const last = await prisma.grDraft.findFirst({ where: { companyId: o.companyId, sequenceKey: o.sequenceKey, touch: o.touch }, orderBy: { version: "desc" } });
  const draft = await prisma.grDraft.create({
    data: {
      companyId: o.companyId, contactId: o.contactId, sequenceKey: o.sequenceKey, touch: o.touch, version: (last?.version ?? 0) + 1, toEmail: o.toEmail.toLowerCase(),
      senderIdentity: sender.identity, subject: o.subject, body: o.body, contentHash: contentHash({ toEmail: o.toEmail, senderIdentity: sender.identity, subject: o.subject, body: o.body }),
      evidenceIds: o.evidenceIds as never, rationale: o.rationale ?? null, model: o.model, promptVersion: o.promptVersion, policyResult: policy as never,
      status: policy.passed ? "PENDING_APPROVAL" : "POLICY_FAILED",
    },
  });
  if (last) await invalidateDraft(last.id, `superseded by version ${draft.version}`, "SUPERSEDED");
  await audit({ actor: o.actor, actorType: o.actor.startsWith("agent:") ? "AI_AGENT" : "HUMAN", action: "growth.draft.create", resource: "growth_draft", resourceId: draft.id, output: { version: draft.version, policyPassed: policy.passed } });
  return draft;
}

export async function invalidateDraft(draftId: number, reason: string, status = "INVALIDATED") {
  await prisma.grApproval.updateMany({ where: { draftId, status: "ACTIVE" }, data: { status: "INVALIDATED", invalidReason: reason } });
  await prisma.grOutbox.updateMany({ where: { draftId, status: "SCHEDULED" }, data: { status: "CANCELLED", cancelReason: reason } });
  await prisma.grDraft.update({ where: { id: draftId }, data: { status } });
}

/** Approval binds to the exact content hash, recipient and sender; it never covers any other version. */
export async function approveDraft(draftId: number, approver: string) {
  const d = await prisma.grDraft.findUniqueOrThrow({ where: { id: draftId }, include: { company: true } });
  if (d.status !== "PENDING_APPROVAL") throw new GrowthError(`Draft is ${d.status}; it cannot be approved.`);
  const newer = await prisma.grDraft.findFirst({ where: { companyId: d.companyId, sequenceKey: d.sequenceKey, touch: d.touch, version: { gt: d.version } } });
  if (newer) throw new GrowthError("A newer version exists; approve the latest version.");
  const policy = checkPolicy({ subject: d.subject, body: d.body, toEmail: d.toEmail, senderIdentity: d.senderIdentity, postalAddress: SENDER().postalAddress, touch: d.touch });
  if (!policy.passed) throw new GrowthError(`Policy check failed: ${policy.issues.map((i) => i.code).join(", ")}.`);
  if (contentHash({ toEmail: d.toEmail, senderIdentity: d.senderIdentity, subject: d.subject, body: d.body }) !== d.contentHash) throw new GrowthError("Draft content changed after creation; regenerate.");
  const contact = await prisma.grContact.findUniqueOrThrow({ where: { id: d.contactId } });
  if (contact.status !== "VERIFIED" || contact.email.toLowerCase() !== d.toEmail) throw new GrowthError("Recipient is no longer a provider-verified address.");
  if (d.company.outreachDisabled || d.company.status !== "QUALIFIED") throw new GrowthError("Company is not eligible for outreach.");
  const sup = await suppressionReason(d.toEmail, d.company.domain);
  if (sup) throw new GrowthError(sup);

  const cad = await getCadence();
  const approval = await prisma.grApproval.create({ data: { draftId: d.id, contentHash: d.contentHash, toEmail: d.toEmail, sender: d.senderIdentity, approvedBy: approver, expiresAt: new Date(Date.now() + cad.approvalTtlHours * 3600_000) } });
  await prisma.grDraft.update({ where: { id: d.id }, data: { status: "APPROVED" } });
  // Touch 1 is due now; later touches are due after the configured interval from the previous touch's send (resolved at dispatch).
  const delayDays = d.touch === 1 ? 0 : cad.followUpDays[Math.min(d.touch - 2, cad.followUpDays.length - 1)] ?? 7;
  const outbox = await prisma.grOutbox.create({
    data: { draftId: d.id, approvalId: approval.id, companyId: d.companyId, toEmail: d.toEmail, idempotencyKey: `gr:${d.companyId}:${d.sequenceKey}:${d.touch}:${d.version}`, scheduledAt: new Date(Date.now() + delayDays * 86400_000) },
  });
  await audit({ actor: approver, actorType: "HUMAN", action: "growth.draft.approve", resource: "growth_draft", resourceId: d.id, output: { version: d.version, hash: d.contentHash, outboxId: outbox.id } });
  return { approval, outbox };
}

export async function rejectDraft(draftId: number, by: string, reason: string) {
  await invalidateDraft(draftId, `rejected: ${reason}`, "REJECTED");
  await audit({ actor: by, actorType: "HUMAN", action: "growth.draft.reject", resource: "growth_draft", resourceId: draftId, input: { reason } });
}

export { GROWTH_ORG };
