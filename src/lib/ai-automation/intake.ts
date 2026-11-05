/** Public assessment submission: validate → de-duplicate → persist (one transaction) → enqueue analysis. */
import { createHash, randomBytes } from "crypto";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { guardForm, POLICIES } from "@/lib/antispam/guard";
import { getIndustryConfig, getQuestionSet } from "./repo";
import { validateAnswers, firstInvalidStage } from "./validation";
import { enqueueJob } from "./jobs";
import { logActivity } from "./crm";
import { ensureSeeded } from "./seed";

export const SubmitSchema = z.object({
  industry: z.string().regex(/^[a-z0-9-]{2,80}$/),
  answers: z.record(z.string().max(80), z.unknown()),
  idempotencyKey: z.string().regex(/^[A-Za-z0-9_-]{16,64}$/),
  entryPage: z.string().max(200).nullish(),
  attribution: z.object({
    utmSource: z.string().max(255).nullish(), utmMedium: z.string().max(255).nullish(), utmCampaign: z.string().max(255).nullish(),
    utmContent: z.string().max(255).nullish(), utmTerm: z.string().max(255).nullish(), landingPage: z.string().max(2048).nullish(),
  }).optional().default({}),
  formToken: z.string().max(200).nullish(),
  turnstileToken: z.string().max(4096).nullish(),
  hp: z.string().max(500).optional().default(""), // honeypot (named so browser autofill never fills it)
});
export type SubmitInput = z.infer<typeof SubmitSchema>;

export type SubmitOutcome =
  | { ok: true; publicRef: string; duplicate: boolean; silent?: boolean }
  | { ok: false; status: number; error: string; fieldErrors?: Record<string, string>; stage?: number | null };

const publicRef = () => `AIA-${randomBytes(5).toString("hex").toUpperCase()}`;
const str = (v: unknown) => (typeof v === "string" ? v : "");

/** Semantic duplicate window: same email + business + industry within 24h is the same submission, not a new customer. */
export const DEDUPE_WINDOW_MS = 24 * 3_600_000;

export async function submitAssessment(raw: unknown, ctx: { ip: string }): Promise<SubmitOutcome> {
  const parsed = SubmitSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, status: 422, error: "Invalid request." };
  const input = parsed.data;

  const industry = await getIndustryConfig(input.industry);
  if (!industry || !industry.active) return { ok: false, status: 422, error: "Unknown industry.", fieldErrors: { industry: "Please choose an industry." }, stage: 1 };

  // Server-side validation is authoritative. Industry is forced from the route/selection, never trusted from free answers.
  const questions = await getQuestionSet(industry.slug);
  const v = validateAnswers(questions, { ...input.answers, industry: industry.slug });
  if (!v.ok) return { ok: false, status: 422, error: "Please check the highlighted answers.", fieldErrors: v.errors, stage: firstInvalidStage(questions, v.errors) };
  const a = v.answers;
  if (a.consentProcessing !== true) return { ok: false, status: 422, error: "Your consent is needed to prepare a proposal.", fieldErrors: { consentProcessing: "This is required to continue." }, stage: 6 };

  const email = str(a.email);
  const guard = await guardForm(POLICIES.aiAssessment, {
    ip: ctx.ip, email, name: str(a.fullName), company: str(a.businessName), message: [a.description, a.challengeDetail, a.workflows, a.additionalInfo].map(str).join(" "),
    honeypot: input.hp, formToken: input.formToken, turnstileToken: input.turnstileToken,
  });
  if (!guard.ok) {
    if (guard.silent) return { ok: true, publicRef: publicRef(), duplicate: false, silent: true }; // bots get a plausible success; nothing is stored
    return { ok: false, status: guard.status, error: guard.error };
  }

  await ensureSeeded().catch(() => undefined);

  // 1) Idempotency key (double-click / retry) 2) semantic dedupe (same business within 24h)
  const byKey = await prisma.aiAssessment.findUnique({ where: { idempotencyKey: input.idempotencyKey }, select: { publicRef: true } });
  if (byKey) return { ok: true, publicRef: byKey.publicRef, duplicate: true };
  const businessName = str(a.businessName);
  const recent = await prisma.aiAssessment.findFirst({
    where: { industrySlug: industry.slug, businessName, anonymisedAt: null, submittedAt: { gt: new Date(Date.now() - DEDUPE_WINDOW_MS) }, lead: { contact: { email } } },
    select: { publicRef: true },
  });
  if (recent) return { ok: true, publicRef: recent.publicRef, duplicate: true };

  const [firstName, ...rest] = str(a.fullName).split(/\s+/);
  const ref = publicRef();
  const consent = { processing: true, marketing: a.consentMarketing === true, at: new Date().toISOString() };
  const industryRow = await prisma.aiIndustry.findUnique({ where: { slug: industry.slug }, select: { id: true } }).catch(() => null);

  const assessment = await prisma.$transaction(async (tx) => {
    // Reuse the existing CRM identity tables — no duplicate customer records.
    const company = (await tx.company.findFirst({ where: { name: businessName, country: str(a.country) } })) ?? (await tx.company.create({ data: { name: businessName, country: str(a.country), industry: industry.name, website: str(a.website) || null, companySize: str(a.employees) || null } }));
    const contactData = { companyId: company.id, firstName, lastName: rest.join(" ") || null, jobTitle: str(a.position) || null, email, phone: str(a.phone), whatsapp: str(a.phone), country: str(a.country), city: str(a.city) || null, consentEmail: consent.marketing };
    const existing = await tx.contact.findFirst({ where: { email } });
    const contact = existing ? await tx.contact.update({ where: { id: existing.id }, data: { ...contactData, consentEmail: existing.consentEmail || consent.marketing } }) : await tx.contact.create({ data: contactData });

    const crmLead = await tx.lead.create({ data: { contactId: contact.id, companyId: company.id, source: "ai_automation_assessment", serviceInterest: `AI automation — ${industry.name}`, stage: "new" } });

    // One open AI lead per contact: a returning customer extends their lead instead of creating a duplicate.
    const open = await tx.aiLead.findFirst({ where: { contactId: contact.id, anonymisedAt: null, status: { notIn: ["LOST", "COMPLETED"] } }, orderBy: { id: "desc" } });
    const lead = open
      ? await tx.aiLead.update({ where: { id: open.id }, data: { industrySlug: industry.slug, country: str(a.country), crmLeadId: crmLead.id, status: open.status === "NEW_LEAD" ? "ASSESSMENT_COMPLETED" : open.status } })
      : await tx.aiLead.create({ data: { contactId: contact.id, companyId: company.id, crmLeadId: crmLead.id, status: "ASSESSMENT_COMPLETED", industrySlug: industry.slug, country: str(a.country) } });

    const row = await tx.aiAssessment.create({
      data: { publicRef: ref, idempotencyKey: input.idempotencyKey, leadId: lead.id, industryId: industryRow?.id ?? null, industrySlug: industry.slug, businessName, country: str(a.country), entryPage: input.entryPage ?? null, attribution: input.attribution as never, consent: consent as never },
    });
    const byKeyQ = new Map(questions.map((q) => [q.key, q]));
    await tx.aiAssessmentResponse.createMany({
      data: Object.entries(a).map(([key, value]) => ({ assessmentId: row.id, stage: byKeyQ.get(key)?.stage ?? 0, questionKey: key, questionLabel: (byKeyQ.get(key)?.label ?? key).slice(0, 400), value: value as never })),
    });
    return { row, leadId: lead.id };
  });

  await logActivity({ leadId: assessment.leadId, assessmentId: assessment.row.id, actor: "customer", action: "assessment.submitted", detail: { industry: industry.slug, ref } });
  await enqueueJob({ type: "ANALYSIS", key: `analysis:${assessment.row.id}:initial`, payload: { assessmentId: assessment.row.id } });
  return { ok: true, publicRef: ref, duplicate: false };
}

/** Stable hash of the customer's answers; stored with each analysis so it is traceable to the exact input. */
export const inputHash = (obj: unknown) => createHash("sha256").update(JSON.stringify(obj)).digest("hex");
