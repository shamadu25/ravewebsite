/** Proposal lifecycle: create → version/edit → PDF → approve → send → accept/decline/expire. One proposal per assessment. */
import { createHash } from "crypto";
import { prisma } from "@/lib/prisma";
import { buildProposalContent, EditableSectionsSchema, renderProposalPdf, type EditableSections, type ProposalContent } from "./content";
import { latestAnalysis, loadAssessment, priceQuote, defaultQuoteInput, type ProposalQuoteInput } from "../analysis-service";
import { getCompany, getProposalSettings } from "../settings";
import { getIndustryConfig, getSolutions } from "../repo";
import { advanceLead, logActivity, setLeadStatus } from "../crm";
import { enqueueJob } from "../jobs";
import { signToken } from "../tokens";
import type { BusinessAnalysis } from "../ai/schema";
import type { QuoteResult } from "../pricing";
import { createImplementationProject } from "../integrations/provider";
import { meetsRole } from "@/lib/os/rbac";
import type { Role } from "@/lib/os/rbac";

const isUnique = (e: unknown) => typeof e === "object" && e !== null && (e as { code?: string }).code === "P2002";
export const appUrl = () => (process.env.NEXT_PUBLIC_APP_URL ?? "https://ravesoftsolutions.com").replace(/\/$/, "");
export const proposalRef = (id: number, year = new Date().getFullYear()) => `RS-AI-${year}-${String(id).padStart(6, "0")}`;

async function mirrorItems(proposalId: number, quote: QuoteResult) {
  await prisma.aiProposalItem.deleteMany({ where: { proposalId } });
  const rows = quote.lines.filter((l) => l.included || l.kind === "OPTIONAL").map((l, i) => ({ proposalId, kind: l.kind === "ADJUSTMENT" ? "ADDITIONAL_DEV" : l.kind, solutionKey: l.solutionKey ?? null, name: l.name.slice(0, 240), description: l.description?.slice(0, 600) ?? null, quantity: Math.max(1, Math.round(l.quantity)), complexity: l.complexity ?? null, unitPrice: l.unitPrice, lineTotal: l.total, recurring: l.recurring, sortOrder: i }));
  if (rows.length) await prisma.aiProposalItem.createMany({ data: rows });
}

/** PROPOSAL job: create the single proposal for an assessment (idempotent). */
export async function createProposalForAssessment(assessmentId: number, o: { calculationId?: number; actor?: string } = {}) {
  const existing = await prisma.aiProposal.findUnique({ where: { assessmentId } });
  if (existing) return { proposal: existing, created: false };

  const { a, answers } = await loadAssessment(assessmentId);
  const analysis = await latestAnalysis(assessmentId);
  if (!analysis) throw new Error("No analysis available for proposal.");
  const output = analysis.output as unknown as BusinessAnalysis;
  const solutions = await getSolutions({ includeInactive: true });
  const matched = solutions.filter((s) => output.recommendations.some((r) => r.solutionKey === s.key));
  const quoteInput = defaultQuoteInput(output, answers, new Set(matched.flatMap((s) => s.integrations)).size);
  const { result } = await priceQuote(quoteInput);

  const settings = await getProposalSettings();
  const company = await getCompany();
  const industry = await getIndustryConfig(a.industrySlug);
  const c = a.lead.contact;
  const now = new Date();

  let proposalId: number;
  try {
    const tmp = await prisma.aiProposal.create({
      data: { ref: `PENDING-${assessmentId}-${Date.now()}`, assessmentId, leadId: a.leadId, status: "DRAFT", currency: result.currency, initialTotal: result.initialTotal, monthlyTotal: result.monthlyTotal, approvalReasons: result.approval.reasons as never, validUntil: new Date(now.getTime() + settings.validityDays * 86_400_000) },
    });
    proposalId = tmp.id;
  } catch (e) {
    if (isUnique(e)) return { proposal: await prisma.aiProposal.findUniqueOrThrow({ where: { assessmentId } }), created: false };
    throw e;
  }
  const ref = proposalRef(proposalId, now.getFullYear());
  const content = buildProposalContent({
    reference: ref, now, analysis: output, quote: result, quoteInput, solutions, company, settings,
    customer: { contactName: [c.firstName, c.lastName].filter(Boolean).join(" "), position: c.jobTitle ?? "", businessName: a.businessName, email: c.email ?? "", phone: c.phone ?? "", city: c.city ?? "", country: c.country ?? "", industry: industry?.name ?? a.industrySlug },
  });
  const status = result.status === "COMPLETE" ? (settings.requireApproval || result.approval.required ? "AWAITING_APPROVAL" : "APPROVED") : "MANUAL_REVIEW";
  await prisma.$transaction([
    prisma.aiProposal.update({ where: { id: proposalId }, data: { ref, status } }),
    prisma.aiProposalVersion.create({ data: { proposalId, version: 1, content: content as never, calculationId: o.calculationId ?? null, changeNote: "Generated from assessment", createdBy: o.actor ?? "system" } }),
  ]);
  await mirrorItems(proposalId, result);
  await advanceLead(a.leadId, "PROPOSAL_GENERATED", o.actor ?? "system");
  if (status === "AWAITING_APPROVAL" || status === "MANUAL_REVIEW") await advanceLead(a.leadId, "AWAITING_APPROVAL", o.actor ?? "system");
  await logActivity({ leadId: a.leadId, assessmentId, proposalId, actor: o.actor ?? "system", action: "proposal.generated", detail: { ref, status, quote: result.status } });
  await enqueueJob({ type: "PDF", key: `pdf:${proposalId}:v1`, payload: { proposalId, version: 1 } });
  await enqueueJob({ type: "EMAIL", key: `email:internal:${proposalId}`, payload: { kind: "internal_new_opportunity", proposalId } });
  return { proposal: await prisma.aiProposal.findUniqueOrThrow({ where: { id: proposalId } }), created: true };
}

export async function getProposalContent(proposalId: number, version?: number): Promise<{ content: ProposalContent; version: number; row: Awaited<ReturnType<typeof prisma.aiProposalVersion.findFirstOrThrow>> }> {
  const p = await prisma.aiProposal.findUniqueOrThrow({ where: { id: proposalId } });
  const v = version ?? p.currentVersion;
  const row = await prisma.aiProposalVersion.findFirstOrThrow({ where: { proposalId, version: v } });
  return { content: row.content as unknown as ProposalContent, version: v, row };
}

export const isFinalStatus = (s: string) => ["APPROVED", "SENT", "ACCEPTED"].includes(s);

/** PDF job: render the version and store it (MySQL LONGBLOB, never on a public path). */
export async function generatePdf(proposalId: number, version?: number) {
  const p = await prisma.aiProposal.findUniqueOrThrow({ where: { id: proposalId } });
  const { content, version: v } = await getProposalContent(proposalId, version);
  const pdf = renderProposalPdf(content, { final: isFinalStatus(p.status) });
  const sha = createHash("sha256").update(pdf).digest("hex");
  await prisma.aiProposalVersion.updateMany({ where: { proposalId, version: v }, data: { pdf: new Uint8Array(pdf), pdfSha256: sha, pdfBytes: pdf.length } });
  await logActivity({ leadId: p.leadId, proposalId, actor: "system", action: "proposal.pdf", detail: { version: v, bytes: pdf.length } });
  return { bytes: pdf.length, sha };
}

export async function getPdf(proposalId: number, version?: number): Promise<{ pdf: Buffer; ref: string } | null> {
  const p = await prisma.aiProposal.findUnique({ where: { id: proposalId } });
  if (!p) return null;
  const row = await prisma.aiProposalVersion.findFirst({ where: { proposalId, version: version ?? p.currentVersion } });
  if (!row?.pdf) return null;
  return { pdf: Buffer.from(row.pdf), ref: p.ref };
}

export interface EditInput { sections?: EditableSections; quoteInput?: ProposalQuoteInput; note?: string; actor: string; role: Role }

/** Edit → new immutable version. Prices only change by re-running the deterministic engine on the edited quote input. */
export async function editProposal(proposalId: number, e: EditInput) {
  const p = await prisma.aiProposal.findUniqueOrThrow({ where: { id: proposalId } });
  if (["ACCEPTED", "DECLINED"].includes(p.status)) throw new Error(`A ${p.status.toLowerCase()} proposal cannot be edited.`);
  const { content } = await getProposalContent(proposalId);
  const sections = e.sections ? EditableSectionsSchema.parse(e.sections) : {};
  const next: ProposalContent = { ...content, ...sections };

  if (e.quoteInput) {
    if (e.quoteInput.options.priceOverrides && Object.keys(e.quoteInput.options.priceOverrides).length && !meetsRole(e.role, "FINANCE")) throw new Error("Overriding approved prices requires a finance, manager or executive role.");
    const { result } = await priceQuote(e.quoteInput);
    next.quote = result;
    next.quoteInput = e.quoteInput;
    next.internalNotes = result.missing;
    const solutions = await getSolutions({ includeInactive: true });
    const byKey = new Map(solutions.map((s) => [s.key, s]));
    const have = new Set(next.solutions.map((s) => s.key));
    next.solutions = next.solutions.filter((s) => e.quoteInput!.items.some((i) => i.key === s.key));
    for (const it of e.quoteInput.items) {
      if (have.has(it.key)) continue;
      const s = byKey.get(it.key);
      if (s) next.solutions.push({ key: s.key, name: s.name, description: s.description, problemAddressed: s.problemsSolved[0] ?? "", whyRecommended: "Added by your RaveSoft consultant.", workflow: ["Rules and approved content agreed", "Agent handles the routine step", "Exceptions go to your team", "Activity is logged"], capabilities: s.capabilities, integrations: s.integrations, deliverables: s.deliverables, expectedOutcome: "Less manual effort on this process; benefit to be measured once baselines are known." });
    }
    next.integrations = [...new Set(next.solutions.flatMap((s) => s.integrations))];
    next.deliverables = [...new Set(next.solutions.flatMap((s) => s.deliverables))];
  }

  const version = p.currentVersion + 1;
  const q = next.quote;
  const complete = q.status === "COMPLETE";
  const settings = await getProposalSettings();
  // Any edit invalidates a previous approval/send: the customer must never receive text a manager has not approved.
  const status = complete ? (settings.requireApproval || q.approval.required ? "AWAITING_APPROVAL" : "APPROVED") : "MANUAL_REVIEW";
  await prisma.$transaction([
    prisma.aiProposalVersion.create({ data: { proposalId, version, content: next as never, changeNote: e.note?.slice(0, 400) ?? "Edited", createdBy: e.actor } }),
    prisma.aiProposal.update({ where: { id: proposalId }, data: { currentVersion: version, status, approvedBy: null, approvedAt: null, currency: q.currency, initialTotal: q.initialTotal, monthlyTotal: q.monthlyTotal, approvalReasons: q.approval.reasons as never } }),
  ]);
  if (e.quoteInput) {
    await mirrorItems(proposalId, q);
    if (complete) await prisma.aiLead.update({ where: { id: p.leadId }, data: { dealValue: q.initialTotal, monthlyRecurring: q.monthlyTotal, currency: q.currency } });
    await prisma.aiPricingCalculation.create({ data: { assessmentId: p.assessmentId, proposalId, status: q.status, currency: q.currency, initialTotal: q.initialTotal, monthlyTotal: q.monthlyTotal, snapshot: { input: e.quoteInput, result: q } as never, createdBy: e.actor } });
  }
  await logActivity({ leadId: p.leadId, proposalId, actor: e.actor, action: "proposal.edited", detail: { version, note: e.note ?? null, priced: !!e.quoteInput } });
  await enqueueJob({ type: "PDF", key: `pdf:${proposalId}:v${version}`, payload: { proposalId, version } });
  return { version, status };
}

export async function approveProposal(proposalId: number, actor: string, role: Role) {
  const p = await prisma.aiProposal.findUniqueOrThrow({ where: { id: proposalId } });
  if (p.status !== "AWAITING_APPROVAL") throw new Error(`Only proposals awaiting approval can be approved (current: ${p.status}).`);
  const { content } = await getProposalContent(proposalId);
  if (content.quote.status !== "COMPLETE") throw new Error("This proposal has incomplete pricing and cannot be approved. Resolve the missing items first.");
  if (content.quote.approval.required && !meetsRole(role, "MANAGER")) throw new Error(`This proposal needs manager-level approval: ${content.quote.approval.reasons.join(" ")}`);
  await prisma.aiProposal.update({ where: { id: proposalId }, data: { status: "APPROVED", approvedBy: actor, approvedAt: new Date(), rejectedReason: null } });
  await logActivity({ leadId: p.leadId, proposalId, actor, action: "proposal.approved", detail: { version: p.currentVersion } });
  await generatePdf(proposalId); // re-render as the issued (non-draft) document
}

export async function rejectProposal(proposalId: number, actor: string, reason: string) {
  const p = await prisma.aiProposal.findUniqueOrThrow({ where: { id: proposalId } });
  if (["ACCEPTED", "DECLINED"].includes(p.status)) throw new Error("This proposal is already closed.");
  await prisma.aiProposal.update({ where: { id: proposalId }, data: { status: "REJECTED", rejectedReason: reason.slice(0, 400), approvedBy: null, approvedAt: null } });
  await logActivity({ leadId: p.leadId, proposalId, actor, action: "proposal.rejected", detail: { reason } });
}

/** Queue the customer email. The proposal flips to SENT only after the mail server accepts it (see email jobs). */
export async function queueSend(proposalId: number, actor: string, o: { resend?: boolean } = {}) {
  const p = await prisma.aiProposal.findUniqueOrThrow({ where: { id: proposalId }, include: { lead: true } });
  if (!(p.status === "APPROVED" || (o.resend && ["SENT"].includes(p.status)))) throw new Error("Only approved proposals can be sent.");
  if (p.lead.anonymisedAt) throw new Error("This customer's data has been removed.");
  if (p.validUntil && p.validUntil.getTime() < Date.now()) throw new Error("This proposal has expired. Edit it to issue a new version.");
  const key = o.resend ? `email:proposal:${proposalId}:resend:${Date.now()}` : `email:proposal:${proposalId}:v${p.currentVersion}`;
  await enqueueJob({ type: "EMAIL", key, payload: { kind: "customer_proposal", proposalId } });
  await logActivity({ leadId: p.leadId, proposalId, actor, action: o.resend ? "proposal.resend_queued" : "proposal.send_queued" });
}

export function customerLink(proposalId: number, validUntil: Date | null): string {
  const ttlDays = validUntil ? Math.max(1, Math.ceil((validUntil.getTime() - Date.now()) / 86_400_000)) : 30;
  return `${appUrl()}/ai-automation/proposal/${signToken("proposal", proposalId, ttlDays)}`;
}

/** Manual status updates (reply detection is unavailable — humans record what the customer said). */
export async function recordOutcome(proposalId: number, outcome: "NEGOTIATION" | "ACCEPTED" | "DECLINED", actor: string, o: { reason?: string } = {}) {
  const p = await prisma.aiProposal.findUniqueOrThrow({ where: { id: proposalId } });
  if (outcome === "NEGOTIATION") {
    await setLeadStatus(p.leadId, "NEGOTIATION", actor);
  } else if (outcome === "ACCEPTED") {
    if (!["SENT", "APPROVED"].includes(p.status)) throw new Error("Only a sent or approved proposal can be marked accepted.");
    await prisma.aiProposal.update({ where: { id: proposalId }, data: { status: "ACCEPTED", acceptedAt: new Date() } });
    await setLeadStatus(p.leadId, "ACCEPTED", actor);
    await prisma.aiLead.update({ where: { id: p.leadId }, data: { followupsStopped: true } });
    await createImplementationProject(proposalId, actor); // a record for the delivery team; nothing is provisioned automatically
  } else {
    await prisma.aiProposal.update({ where: { id: proposalId }, data: { status: "DECLINED", declinedAt: new Date() } });
    await setLeadStatus(p.leadId, "LOST", actor, o.reason ?? "Customer declined proposal");
  }
  await logActivity({ leadId: p.leadId, proposalId, actor, action: `proposal.${outcome.toLowerCase()}`, detail: o });
}

/** Mark sent/approved proposals past their validity as EXPIRED (called by the scheduler tick). */
export async function expireProposals(now = new Date()): Promise<number> {
  const due = await prisma.aiProposal.findMany({ where: { status: { in: ["SENT", "APPROVED", "AWAITING_APPROVAL"] }, validUntil: { lt: now } }, select: { id: true, leadId: true } });
  for (const d of due) { await prisma.aiProposal.update({ where: { id: d.id }, data: { status: "EXPIRED" } }); await logActivity({ leadId: d.leadId, proposalId: d.id, actor: "system", action: "proposal.expired" }); }
  return due.length;
}
