/** EMAIL job handlers: customer proposal, internal notification, follow-ups, failure alerts. */
import { prisma } from "@/lib/prisma";
import { getCompany, getSetting } from "../settings";
import { getPdf, getProposalContent, customerLink, appUrl } from "../proposal/service";
import { renderCustomerProposalEmail, renderFollowupEmail, renderInternalEmail, internalSubject, DEFAULT_TEMPLATES, type EmailTemplate, type TemplateKey } from "./render";
import { sendEmail } from "./send";
import { signToken } from "../tokens";
import { advanceLead, logActivity } from "../crm";
import { DEFAULT_FOLLOWUP, stopReason, type FollowupConfig } from "../followup";
import { formatMoney } from "../pricing";
import type { BusinessAnalysis } from "../ai/schema";
import { latestAnalysis } from "../analysis-service";
import { CHALLENGE_OPTIONS } from "../types";

export const getTemplates = () => getSetting<Partial<Record<TemplateKey, EmailTemplate>>>("email.templates", {});
const optOutUrl = (leadId: number) => `${appUrl()}/ai-automation/optout?t=${signToken("optout", leadId, 365)}`;

export async function sendCustomerProposal(proposalId: number) {
  const p = await prisma.aiProposal.findUniqueOrThrow({ where: { id: proposalId }, include: { lead: { include: { contact: true } }, assessment: true } });
  if (!["APPROVED", "SENT"].includes(p.status)) throw new Error(`Proposal ${p.ref} is ${p.status}; only approved proposals are emailed.`);
  if (p.lead.anonymisedAt || !p.lead.contact.email) throw new Error("No deliverable customer email on record.");
  const { content } = await getProposalContent(proposalId);
  if (content.quote.status !== "COMPLETE") throw new Error("Refusing to send a proposal with incomplete pricing.");
  const pdf = await getPdf(proposalId);
  if (!pdf) throw new Error("PDF not generated yet — retry after the PDF job completes.");
  const templates = await getTemplates();
  const email = renderCustomerProposalEmail(content, { link: customerLink(proposalId, p.validUntil), optOutUrl: optOutUrl(p.leadId), template: templates.customer_proposal, approved: true });
  const key = `customer:${proposalId}:v${p.currentVersion}:${p.sentAt ? "r" + p.sentAt.getTime() : "first"}`;
  const out = await sendEmail({ dedupeKey: key, kind: "customer_proposal", to: p.lead.contact.email, email, leadId: p.leadId, proposalId, attachments: [{ filename: `${p.ref}.pdf`, content: pdf.pdf, contentType: "application/pdf" }] });
  if (out.status === "ACCEPTED") {
    await prisma.aiProposal.update({ where: { id: proposalId }, data: { status: "SENT", sentAt: new Date() } });
    await advanceLead(p.leadId, "PROPOSAL_SENT", "system");
    await logActivity({ leadId: p.leadId, proposalId, actor: "system", action: "proposal.sent", detail: { note: "Accepted by mail server; delivery not yet confirmed." } });
    await scheduleFollowups(proposalId);
  }
}

export async function sendInternalNotification(proposalId: number) {
  const p = await prisma.aiProposal.findUniqueOrThrow({ where: { id: proposalId }, include: { lead: { include: { contact: true } }, assessment: { include: { responses: true } } } });
  const company = await getCompany();
  const { content } = await getProposalContent(proposalId);
  const analysis = await latestAnalysis(p.assessmentId);
  const out = analysis?.output as unknown as BusinessAnalysis | undefined;
  const ans = Object.fromEntries(p.assessment.responses.map((r) => [r.questionKey, r.value]));
  const q = content.quote;
  const label = (k: string, v: unknown) => (Array.isArray(v) ? v.join(", ") : String(v ?? ""));
  const reasons = [...(q.status === "MANUAL_REVIEW" ? q.missing : []), ...(q.approval.required && q.status === "COMPLETE" ? q.approval.reasons : [])];
  const email = renderInternalEmail({
    business: p.assessment.businessName, contact: content.customer.contactName, position: content.customer.position, email: content.customer.email, phone: content.customer.phone, industry: content.customer.industry,
    employees: label("employees", ans.employees), challenges: ((ans.challenges as string[]) ?? []).map((c) => CHALLENGE_OPTIONS.find((o) => o.value === c)?.label ?? c),
    analysisSummary: out?.businessOverview.summary ?? "Analysis pending.", solutions: content.solutions.map((s) => s.name),
    initialTotal: q.status === "COMPLETE" ? formatMoney(q.initialTotal, q.currency) : "Pending manual pricing", monthlyTotal: q.status === "COMPLETE" ? formatMoney(q.monthlyTotal, q.currency) : "Pending manual pricing",
    approvalStatus: p.status.replace(/_/g, " ").toLowerCase(), priority: (p.lead.priority ?? "unclassified").replace(/_/g, " ").toLowerCase(),
    proposalLink: `${appUrl()}/admin/ai-automation/proposals/${p.id}`,
    suggestedAction: p.lead.priority === "HIGH" ? "Review and approve the proposal today, then call the contact to walk them through it." : p.lead.priority === "MANUAL_REVIEW" ? "Review the assessment manually and confirm pricing before any customer contact." : "Review the proposal and approve when ready; the contact is not time-critical.",
    preferredChannel: label("preferredChannel", ans.preferredChannel), manualReasons: reasons,
  }, company);
  await sendEmail({ dedupeKey: `internal:${proposalId}`, kind: "internal_new_opportunity", to: company.salesNotificationEmail, email: { ...email, subject: internalSubject(p.assessment.businessName) }, leadId: p.leadId, proposalId });
}

export async function getFollowupConfig(): Promise<FollowupConfig & { active: boolean }> {
  const seq = await prisma.aiFollowupSequence.findUnique({ where: { key: "default" } });
  if (!seq) return { ...DEFAULT_FOLLOWUP, active: true };
  return { steps: seq.steps as never, maxAttempts: seq.maxAttempts, stopConditions: seq.stopConditions as never, active: seq.active };
}

/** Create one pending run per configured step when a proposal is first sent (idempotent via the unique key). */
export async function scheduleFollowups(proposalId: number) {
  const p = await prisma.aiProposal.findUniqueOrThrow({ where: { id: proposalId }, include: { assessment: true } });
  const consent = p.assessment.consent as { marketing?: boolean } | null;
  if (!consent?.marketing) return; // only follow up customers who agreed to it
  const seq = await prisma.aiFollowupSequence.findUnique({ where: { key: "default" } });
  if (!seq || !seq.active) return;
  const steps = seq.steps as unknown as FollowupConfig["steps"];
  for (let i = 0; i < steps.length; i++) {
    await prisma.aiFollowupRun.upsert({ where: { proposalId_sequenceId_stepIndex: { proposalId, sequenceId: seq.id, stepIndex: i } }, create: { proposalId, sequenceId: seq.id, stepIndex: i, dueAt: new Date((p.sentAt ?? new Date()).getTime() + steps[i].delayDays * 86_400_000) }, update: {} });
  }
}

/** Scheduler: send due follow-ups; cancel runs whose stop conditions are met. Never assumes the customer hasn't replied (manual flag). */
export async function processFollowups(now = new Date()): Promise<{ sent: number; cancelled: number }> {
  const cfg = await getFollowupConfig();
  let sent = 0, cancelled = 0;
  const pending = await prisma.aiFollowupRun.findMany({ where: { status: "PENDING", dueAt: { lte: now } }, include: { proposal: { include: { lead: { include: { contact: true } }, assessment: true, followups: true } } }, take: 25, orderBy: { dueAt: "asc" } });
  for (const run of pending) {
    const p = run.proposal;
    const lead = p.lead;
    const done = p.followups.filter((f) => f.status === "SENT").map((f) => f.stepIndex);
    const replied = (await prisma.aiActivityLog.count({ where: { leadId: lead.id, action: "lead.customer_replied" } })) > 0;
    const stop = stopReason({ proposalStatus: p.status, sentAt: p.sentAt, validUntil: p.validUntil, emailOptOut: lead.emailOptOut, followupsStopped: lead.followupsStopped || !cfg.active, customerReplied: replied, attemptsSent: done.length, stepsDone: done }, cfg, now);
    if (stop) {
      await prisma.aiFollowupRun.updateMany({ where: { proposalId: p.id, status: "PENDING" }, data: { status: "CANCELLED", reason: stop } });
      cancelled++; continue;
    }
    if (done.length >= cfg.maxAttempts) { await prisma.aiFollowupRun.update({ where: { id: run.id }, data: { status: "SKIPPED", reason: "MAX_ATTEMPTS" } }); continue; }
    const step = cfg.steps[run.stepIndex];
    if (!step || !lead.contact.email) { await prisma.aiFollowupRun.update({ where: { id: run.id }, data: { status: "SKIPPED", reason: "NO_STEP_OR_EMAIL" } }); continue; }
    const { content } = await getProposalContent(p.id);
    const templates = await getTemplates();
    const key = (step.templateKey in DEFAULT_TEMPLATES ? step.templateKey : "followup_check_in") as TemplateKey;
    const email = renderFollowupEmail({ key, template: templates[key], business: p.assessment.businessName, firstName: lead.contact.firstName ?? "", solutions: content.solutions.map((s) => s.name), link: customerLink(p.id, p.validUntil), optOutUrl: optOutUrl(lead.id), company: await getCompany() });
    try {
      const out = await sendEmail({ dedupeKey: `followup:${p.id}:${run.stepIndex}`, kind: "followup", to: lead.contact.email, email, leadId: lead.id, proposalId: p.id });
      await prisma.aiFollowupRun.update({ where: { id: run.id }, data: { status: "SENT", emailLogId: out.logId } });
      await logActivity({ leadId: lead.id, proposalId: p.id, actor: "system", action: "followup.sent", detail: { step: run.stepIndex } });
      sent++;
    } catch (e) {
      await prisma.aiFollowupRun.update({ where: { id: run.id }, data: { dueAt: new Date(now.getTime() + 3_600_000), reason: (e instanceof Error ? e.message : "send failed").slice(0, 190) } });
    }
  }
  return { sent, cancelled };
}

/** Called when a job exhausts retries: tell the team (best-effort) and keep the failure visible in the admin. */
export async function sendFailureAlert(jobType: string, jobId: number, error: string) {
  const company = await getCompany();
  await sendEmail({
    dedupeKey: `alert:job:${jobId}`, kind: "failure_alert", to: company.salesNotificationEmail,
    email: { subject: `AI Automation job failed — ${jobType} #${jobId}`, text: `Job ${jobId} (${jobType}) failed permanently.\n\n${error}\n\nRetry it in ${appUrl()}/admin/ai-automation/jobs`, html: `<p>Job ${jobId} (${jobType}) failed permanently.</p><pre>${error.replace(/</g, "&lt;")}</pre><p><a href="${appUrl()}/admin/ai-automation/jobs">Open job list</a></p>` },
  }).catch(() => undefined);
}
