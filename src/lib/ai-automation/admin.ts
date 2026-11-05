/** Admin mutations (called from permission-checked API routes). */
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { logActivity, setLeadStatus } from "./crm";
import { enqueueJob } from "./jobs";
import { sendEmail } from "./email/send";
import { esc } from "./email/render";
import { getCompany } from "./settings";
import { PRICING_RULE_KINDS, validateRuleParams, type PricingRuleKind } from "./pricing";
import { IndustryContentSchema, QuestionSchema } from "./types";
import { anonymiseLead } from "./privacy";

export const LeadActionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("status"), status: z.string().max(32), lostReason: z.string().max(400).optional() }),
  z.object({ action: z.literal("assign"), assignee: z.string().max(160).nullable() }),
  z.object({ action: z.literal("note"), body: z.string().min(1).max(4000) }),
  z.object({ action: z.literal("next_action"), at: z.string().datetime().nullable(), note: z.string().max(400).nullable() }),
  z.object({ action: z.literal("customer_replied") }),
  z.object({ action: z.literal("stop_followups") }),
  z.object({ action: z.literal("resume_followups") }),
  z.object({ action: z.literal("anonymise"), confirm: z.literal(true) }),
]);

export async function leadAction(leadId: number, input: z.infer<typeof LeadActionSchema>, actor: string) {
  const lead = await prisma.aiLead.findUnique({ where: { id: leadId } });
  if (!lead) throw new Error("Lead not found.");
  switch (input.action) {
    case "status": return setLeadStatus(leadId, input.status, actor, input.lostReason);
    case "assign":
      await prisma.$transaction([prisma.aiLead.update({ where: { id: leadId }, data: { assignedTo: input.assignee } }), prisma.aiLeadAssignment.create({ data: { leadId, assignee: input.assignee, assignedBy: actor } })]);
      return logActivity({ leadId, actor, action: "lead.assigned", detail: { assignee: input.assignee } });
    case "note":
      await prisma.aiLeadNote.create({ data: { leadId, author: actor, body: input.body } });
      return logActivity({ leadId, actor, action: "lead.note" });
    case "next_action":
      await prisma.aiLead.update({ where: { id: leadId }, data: { nextActionAt: input.at ? new Date(input.at) : null, nextActionNote: input.note } });
      return logActivity({ leadId, actor, action: "lead.next_action", detail: { at: input.at, note: input.note } });
    case "customer_replied":
      await prisma.aiFollowupRun.updateMany({ where: { proposal: { leadId }, status: "PENDING" }, data: { status: "CANCELLED", reason: "CUSTOMER_REPLIED" } });
      return logActivity({ leadId, actor, action: "lead.customer_replied" });
    case "stop_followups":
      await prisma.aiLead.update({ where: { id: leadId }, data: { followupsStopped: true } });
      await prisma.aiFollowupRun.updateMany({ where: { proposal: { leadId }, status: "PENDING" }, data: { status: "CANCELLED", reason: "ADMIN_STOPPED" } });
      return logActivity({ leadId, actor, action: "followups.stopped" });
    case "resume_followups":
      if (lead.emailOptOut) throw new Error("The customer opted out; follow-ups cannot be resumed.");
      await prisma.aiLead.update({ where: { id: leadId }, data: { followupsStopped: false } });
      return logActivity({ leadId, actor, action: "followups.resumed" });
    case "anonymise": return anonymiseLead(leadId, actor);
  }
}

export async function regenerateAnalysis(assessmentId: number, actor: string) {
  const a = await prisma.aiAssessment.findUnique({ where: { id: assessmentId } });
  if (!a) throw new Error("Assessment not found.");
  await enqueueJob({ type: "ANALYSIS", key: `analysis:${assessmentId}:regen:${Date.now()}`, payload: { assessmentId } });
  await logActivity({ leadId: a.leadId, assessmentId, actor, action: "analysis.regenerate_queued" });
}

/** Ask the customer for more information (free-text message from staff). */
export async function requestMoreInfo(assessmentId: number, message: string, actor: string) {
  const a = await prisma.aiAssessment.findUniqueOrThrow({ where: { id: assessmentId }, include: { lead: { include: { contact: true } } } });
  const to = a.lead.contact.email;
  if (!to || a.lead.anonymisedAt) throw new Error("No customer email on record.");
  const company = await getCompany();
  const first = a.lead.contact.firstName ?? "there";
  const subject = "A few questions about your AI business assessment — RaveSoft";
  await sendEmail({
    dedupeKey: `info:${assessmentId}:${Date.now()}`, kind: "info_request", to, leadId: a.leadId,
    email: { subject, text: `Hello ${first},\n\n${message}\n\n${company.name}\n${company.email} · ${company.phone}`, html: `<p>Hello ${esc(first)},</p><p>${esc(message).replace(/\n/g, "<br>")}</p><p>${esc(company.name)}<br>${esc(company.email)} · ${esc(company.phone)}</p>` },
  });
  await prisma.aiAssessment.update({ where: { id: assessmentId }, data: { status: "INFO_REQUESTED" } });
  await logActivity({ leadId: a.leadId, assessmentId, actor, action: "assessment.info_requested", detail: { message: message.slice(0, 500) } });
}

// ── Pricing rules ───────────────────────────────────────────────────────
export const RuleUpsertSchema = z.object({ kind: z.enum(PRICING_RULE_KINDS), key: z.string().regex(/^[A-Za-z0-9_.-]{1,80}$/), label: z.string().min(1).max(200), params: z.record(z.string(), z.unknown()), active: z.boolean().default(true), sortOrder: z.number().int().default(0) });

export async function upsertPricingRule(input: z.infer<typeof RuleUpsertSchema>, actor: string) {
  const params = validateRuleParams(input.kind as PricingRuleKind, input.params); // throws ZodError on bad params
  const row = await prisma.aiPricingRule.upsert({
    where: { kind_key: { kind: input.kind, key: input.key } },
    create: { kind: input.kind, key: input.key, label: input.label, params: params as never, active: input.active, sortOrder: input.sortOrder, updatedBy: actor },
    update: { label: input.label, params: params as never, active: input.active, sortOrder: input.sortOrder, updatedBy: actor },
  });
  await logActivity({ actor, action: "pricing.rule_saved", detail: { kind: input.kind, key: input.key, active: input.active } });
  return row;
}
export async function deletePricingRule(id: number, actor: string) {
  const r = await prisma.aiPricingRule.delete({ where: { id } });
  await logActivity({ actor, action: "pricing.rule_deleted", detail: { kind: r.kind, key: r.key } });
}

// ── Solutions ───────────────────────────────────────────────────────────
const strArr = z.array(z.string().min(1).max(300)).max(30);
export const SolutionUpdateSchema = z.object({
  name: z.string().min(1).max(160).optional(), description: z.string().min(1).max(3000).optional(),
  problemsSolved: strArr.optional(), capabilities: strArr.optional(), deliverables: strArr.optional(), integrations: z.array(z.string().max(80)).max(20).optional(), dependencies: strArr.optional(),
  complexityLevels: z.array(z.enum(["LOW", "MEDIUM", "HIGH"])).min(1).optional(), defaultComplexity: z.enum(["LOW", "MEDIUM", "HIGH"]).optional(), active: z.boolean().optional(),
  industries: z.array(z.object({ slug: z.string().max(80), priority: z.number().int().min(1).max(999) })).optional(),
  // commercial fields (require ai.pricing)
  basePrice: z.number().min(0).max(10_000_000).nullable().optional(), pricingMethod: z.enum(["FIXED", "PER_UNIT", "HOURLY"]).optional(),
  estimatedHours: z.number().int().min(0).max(100_000).nullable().optional(), deliveryWeeks: z.number().int().min(0).max(520).nullable().optional(), monthlyMaintenance: z.number().min(0).max(1_000_000).nullable().optional(),
});
export const COMMERCIAL_FIELDS = ["basePrice", "pricingMethod", "estimatedHours", "deliveryWeeks", "monthlyMaintenance"] as const;

export async function updateSolution(key: string, input: z.infer<typeof SolutionUpdateSchema>, actor: string) {
  const row = await prisma.aiSolutionCatalogue.findUnique({ where: { key } });
  if (!row) throw new Error("Solution not found.");
  const { industries, ...rest } = input;
  await prisma.aiSolutionCatalogue.update({ where: { key }, data: rest as never });
  if (industries) {
    for (const i of industries) {
      const ind = await prisma.aiIndustry.findUnique({ where: { slug: i.slug } });
      if (!ind) continue;
      const m = await prisma.aiSolutionIndustryMapping.findUnique({ where: { solutionId_industryId: { solutionId: row.id, industryId: ind.id } } });
      if (m) await prisma.aiSolutionIndustryMapping.update({ where: { id: m.id }, data: { priority: i.priority } });
      else await prisma.aiSolutionIndustryMapping.create({ data: { solutionId: row.id, industryId: ind.id, priority: i.priority, signals: { areas: [], challenges: [] } as never } });
    }
  }
  await logActivity({ actor, action: "solution.updated", detail: { key, fields: Object.keys(input) } });
}

export const NewSolutionSchema = z.object({ key: z.string().regex(/^[a-z0-9-]{3,80}$/), name: z.string().min(1).max(160), description: z.string().min(1).max(3000) });
export async function createSolution(input: z.infer<typeof NewSolutionSchema>, actor: string) {
  const row = await prisma.aiSolutionCatalogue.create({ data: { key: input.key, name: input.name, description: input.description, problemsSolved: [] as never, capabilities: [] as never, deliverables: [] as never, integrations: [] as never, dependencies: [] as never, complexityLevels: ["LOW", "MEDIUM", "HIGH"] as never, active: false } });
  await logActivity({ actor, action: "solution.created", detail: { key: input.key } });
  return row;
}

// ── Industries ──────────────────────────────────────────────────────────
export const IndustryUpdateSchema = z.object({
  name: z.string().min(1).max(160).optional(), active: z.boolean().optional(), hasPage: z.boolean().optional(),
  seo: z.object({ title: z.string().min(1).max(200), description: z.string().min(1).max(400), keywords: z.array(z.string().max(80)).max(20).optional(), ogImage: z.string().max(300).nullable().optional() }).optional(),
  content: IndustryContentSchema.optional(),
  questions: z.array(QuestionSchema).max(40).optional(),
});
export const NewIndustrySchema = z.object({ slug: z.string().regex(/^[a-z0-9-]{3,60}$/), name: z.string().min(1).max(160) });

export async function updateIndustry(slug: string, input: z.infer<typeof IndustryUpdateSchema>, actor: string) {
  const ind = await prisma.aiIndustry.findUnique({ where: { slug } });
  if (!ind) throw new Error("Industry not found.");
  await prisma.aiIndustry.update({ where: { slug }, data: { name: input.name, active: input.active, hasPage: input.hasPage, content: input.content as never } });
  if (input.seo) await prisma.aiIndustryPage.upsert({ where: { industryId: ind.id }, create: { industryId: ind.id, seoTitle: input.seo.title, seoDescription: input.seo.description, keywords: (input.seo.keywords ?? []) as never, ogImage: input.seo.ogImage ?? null }, update: { seoTitle: input.seo.title, seoDescription: input.seo.description, keywords: (input.seo.keywords ?? []) as never, ogImage: input.seo.ogImage ?? null } });
  if (input.questions) {
    // Replace-set semantics: simple and predictable for an admin editing the whole list.
    await prisma.aiIndustryQuestion.deleteMany({ where: { industryId: ind.id } });
    let n = 0;
    for (const q of input.questions) await prisma.aiIndustryQuestion.create({ data: { industryId: ind.id, key: q.key, stage: q.stage, label: q.label, helpText: q.helpText ?? null, type: q.type, required: q.required, sortOrder: (n += 10), showIf: (q.showIf ?? undefined) as never, options: q.options ? { create: q.options.map((o, i) => ({ value: o.value, label: o.label, sortOrder: i })) } : undefined } });
  }
  await logActivity({ actor, action: "industry.updated", detail: { slug, fields: Object.keys(input) } });
}

export async function createIndustry(input: z.infer<typeof NewIndustrySchema>, actor: string) {
  const { RESERVED_SLUGS } = await import("./catalogue");
  if (RESERVED_SLUGS.includes(input.slug)) throw new Error("That slug is reserved.");
  const other = await prisma.aiIndustry.findUnique({ where: { slug: "other" } });
  const base = (other?.content ?? {}) as Record<string, unknown>;
  const row = await prisma.aiIndustry.create({ data: { slug: input.slug, name: input.name, active: false, hasPage: false, sortOrder: 200, content: { ...base, shortName: input.name } as never, page: { create: { seoTitle: `${input.name} AI Automation`, seoDescription: `AI automation for ${input.name}.`, active: false } } } });
  await logActivity({ actor, action: "industry.created", detail: { slug: input.slug } });
  return row;
}
