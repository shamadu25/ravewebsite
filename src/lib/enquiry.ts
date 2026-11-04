import { z } from "zod";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { BUSINESS_TYPES, BUSINESS_TYPE_VALUES, SOLUTION_VALUES, solutionByValue } from "@/lib/getStarted";

export const ENQUIRY_SOURCE = "website_contact_form";
/** An identical submission (same email + same message) inside this window is treated as a double-click/retry. */
export const DUPLICATE_WINDOW_MS = 10 * 60_000;

export const EnquirySchema = z.object({
  fullName: z.string().trim().min(1).max(200),
  companyName: z.string().trim().max(200).optional().default(""),
  email: z.string().trim().email().max(255),
  phone: z.string().trim().max(50).optional().default(""),
  projectType: z.string().trim().max(100).optional().default(""),
  budget: z.string().trim().max(100).optional().default(""),
  message: z.string().trim().min(1).max(5000),
  /** Honeypot: real visitors never see or fill this field. */
  website: z.string().max(500).optional().default(""),
  page: z.string().trim().max(2048).optional().default(""),
  referrer: z.string().trim().max(2048).optional().default(""),
  formToken: z.string().max(200).nullish(),
  turnstileToken: z.string().max(4096).nullish(),
  utm: z.record(z.string().max(60), z.string().max(255)).optional().default({}),
});
export type Enquiry = z.infer<typeof EnquirySchema>;

export function splitName(fullName: string): { firstName: string; lastName: string | null } {
  const parts = fullName.trim().split(/\s+/);
  return { firstName: parts[0] ?? fullName, lastName: parts.length > 1 ? parts.slice(1).join(" ") : null };
}

export interface PersistResult {
  leadId: number;
  contactId: number;
  duplicate: boolean;
  /** Landing page only: "same_submission" = a retry of the very same form submit; "similar" = identical enquiry made again. */
  duplicateKind?: "same_submission" | "similar";
}

/**
 * Saves a website enquiry as Contact + Lead + ConversionEvent so it shows up in /admin/leads next to
 * chat leads. Reuses an existing contact (matched by email), never overwrites details already stored,
 * and collapses an identical re-submission into the original lead.
 */
export async function persistEnquiry(e: Enquiry, now = new Date()): Promise<PersistResult> {
  const email = e.email.toLowerCase();

  const existingContact = await prisma.contact.findFirst({ where: { email } });

  if (existingContact) {
    const since = new Date(now.getTime() - DUPLICATE_WINDOW_MS);
    const dup = await prisma.conversionEvent.findFirst({
      where: {
        contactId: existingContact.id,
        eventType: "lead_created",
        occurredAt: { gte: since },
        metadata: { path: "$.message", equals: e.message },
        lead: { is: { source: ENQUIRY_SOURCE } },
      },
      orderBy: { id: "desc" },
    });
    if (dup?.leadId) return { leadId: dup.leadId, contactId: existingContact.id, duplicate: true };
  }

  let companyId: number | undefined;
  if (e.companyName) {
    const company = (await prisma.company.findFirst({ where: { name: e.companyName } })) ?? (await prisma.company.create({ data: { name: e.companyName } }));
    companyId = company.id;
  }

  const { firstName, lastName } = splitName(e.fullName);
  let contactId: number;
  if (existingContact) {
    contactId = existingContact.id;
    await prisma.contact.update({
      where: { id: contactId },
      data: {
        ...(existingContact.firstName ? {} : { firstName }),
        ...(existingContact.lastName || !lastName ? {} : { lastName }),
        ...(existingContact.phone || !e.phone ? {} : { phone: e.phone }),
        ...(existingContact.companyId || !companyId ? {} : { companyId }),
      },
    });
  } else {
    contactId = (
      await prisma.contact.create({
        data: { firstName, lastName, email, phone: e.phone || null, ...(companyId ? { companyId } : {}) },
      })
    ).id;
  }

  const lead = await prisma.lead.create({
    data: { contactId, companyId, source: ENQUIRY_SOURCE, serviceInterest: e.projectType || null, stage: "new" },
  });

  await prisma.conversionEvent.create({
    data: {
      contactId,
      leadId: lead.id,
      eventType: "lead_created",
      occurredAt: now,
      metadata: {
        channel: "contact_form",
        message: e.message,
        budget: e.budget || null,
        projectType: e.projectType || null,
        company: e.companyName || null,
        page: e.page || null,
        referrer: e.referrer || null,
        utm: e.utm,
      },
    },
  });

  return { leadId: lead.id, contactId, duplicate: false };
}

/** Records that the team email could not be delivered, so the admin can see the lead needs attention. */
export async function recordNotifyFailure(leadId: number, contactId: number, error: unknown): Promise<void> {
  await prisma.conversionEvent.create({
    data: {
      leadId,
      contactId,
      eventType: "notify_failed",
      occurredAt: new Date(),
      metadata: { error: error instanceof Error ? error.message.slice(0, 300) : "unknown" },
    },
  });
}


// ═══════════════════════════════════════════════════════════════════════════════════════════════
// /get-started landing page enquiries (additive — the legacy contact form above is unchanged)
// ═══════════════════════════════════════════════════════════════════════════════════════════════

const CTRL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;
/** Single-line text: no control characters or line breaks, collapsed spaces. */
export const cleanLine = (s: string) => s.replace(CTRL, "").replace(/[\r\n\t]+/g, " ").replace(/\s{2,}/g, " ").trim();
/** Multi-line text: control characters removed, line breaks kept (max 2 in a row). */
export const cleanBlock = (s: string) => s.replace(CTRL, "").replace(/\r\n?/g, "\n").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();

const line = (min: number, max: number) => z.string().max(max * 3).transform(cleanLine).pipe(z.string().min(min).max(max));
const optLine = (max: number) => z.string().transform((v) => cleanLine(v).slice(0, max)).optional();

const TouchSchema = z
  .object({
    utm_source: optLine(150),
    utm_medium: optLine(150),
    utm_campaign: optLine(150),
    utm_content: optLine(150),
    utm_term: optLine(150),
    fbclid: optLine(300),
    // Only site-relative paths are kept — an attacker cannot smuggle an arbitrary link into the stored/emailed landing URL.
    landingUrl: z.string().transform((v) => cleanLine(v).slice(0, 500)).transform((v) => (v.startsWith("/") && !v.startsWith("//") ? v : "")).optional(),
    referrer: z.string().transform((v) => cleanLine(v).slice(0, 500)).transform((v) => (/^https?:\/\//i.test(v) ? v : "")).optional(),
    capturedAt: z.string().transform((v0) => v0.slice(0, 40)).transform((v) => (Number.isNaN(Date.parse(v)) ? "" : cleanLine(v))).optional(),
  })
  .strip();
export type Touch = z.infer<typeof TouchSchema>;

export const LandingEnquirySchema = z.object({
  formType: z.literal("get_started"),
  fullName: line(2, 120),
  businessName: line(2, 160),
  phone: z
    .string()
    .max(40)
    .transform(cleanLine)
    .pipe(z.string().regex(/^[+(\d][\d\s()-]*$/).refine((v) => v.replace(/\D/g, "").length >= 7 && v.replace(/\D/g, "").length <= 15)),
  email: z.string().trim().email().max(254),
  businessType: z.enum(BUSINESS_TYPE_VALUES),
  solution: z.enum(SOLUTION_VALUES),
  message: z.string().max(6000).transform(cleanBlock).pipe(z.string().max(2000)).optional().default(""),
  /** Client-generated id of this form instance: makes retries/double-clicks idempotent and links browser↔server events. */
  submissionId: z.string().regex(/^[A-Za-z0-9_-]{8,64}$/),
  /** Honeypot. */
  website: z.string().max(500).optional().default(""),
  formToken: z.string().max(200).nullish(),
  turnstileToken: z.string().max(4096).nullish(),
  page: z.string().max(1000).transform((v) => cleanLine(v).slice(0, 500)).optional().default(""),
  referrer: z.string().max(1000).transform((v) => cleanLine(v).slice(0, 500)).optional().default(""),
  attribution: z.object({ first: TouchSchema.optional(), latest: TouchSchema.optional() }).optional(),
});
export type LandingEnquiry = z.infer<typeof LandingEnquirySchema>;

/** Concurrent identical submissions inside one server instance share a single database write. */
const inFlight = new Map<string, Promise<PersistResult>>();

export function persistLandingEnquiry(e: LandingEnquiry, now = new Date()): Promise<PersistResult> {
  const existing = inFlight.get(e.submissionId);
  if (existing) return existing.then((r) => ({ ...r, duplicate: true, duplicateKind: "same_submission" as const }));
  const p = doPersistLanding(e, now).finally(() => setTimeout(() => inFlight.delete(e.submissionId), 5_000));
  inFlight.set(e.submissionId, p);
  return p;
}

async function doPersistLanding(e: LandingEnquiry, now: Date): Promise<PersistResult> {
  const email = e.email.toLowerCase();
  const solution = solutionByValue(e.solution);
  const solutionLabel = solution?.label ?? e.solution;
  const businessTypeLabel = BUSINESS_TYPES.find((b) => b.value === e.businessType)?.label ?? e.businessType;
  const first = e.attribution?.first;
  const latest = e.attribution?.latest;

  const existingContact = await prisma.contact.findFirst({ where: { email } });
  if (existingContact) {
    // 1) the very same form submission (retry after a lost response)
    const same = await prisma.conversionEvent.findFirst({
      where: { contactId: existingContact.id, eventType: "lead_created", metadata: { path: "$.submissionId", equals: e.submissionId } },
      orderBy: { id: "desc" },
    });
    if (same?.leadId) return { leadId: same.leadId, contactId: existingContact.id, duplicate: true, duplicateKind: "same_submission" };

    // 2) the same enquiry (same solution + same text) made again within minutes. A different solution is a NEW lead.
    const since = new Date(now.getTime() - DUPLICATE_WINDOW_MS);
    const similar = await prisma.conversionEvent.findFirst({
      where: {
        contactId: existingContact.id,
        eventType: "lead_created",
        occurredAt: { gte: since },
        AND: [{ metadata: { path: "$.solution", equals: e.solution } }, { metadata: { path: "$.message", equals: e.message } }],
        lead: { is: { source: ENQUIRY_SOURCE } },
      },
      orderBy: { id: "desc" },
    });
    if (similar?.leadId) return { leadId: similar.leadId, contactId: existingContact.id, duplicate: true, duplicateKind: "similar" };
  }

  const company =
    (await prisma.company.findFirst({ where: { name: e.businessName } })) ?? (await prisma.company.create({ data: { name: e.businessName } }));

  const { firstName, lastName } = splitName(e.fullName);
  let contactId: number;
  if (existingContact) {
    contactId = existingContact.id;
    await prisma.contact.update({
      where: { id: contactId },
      data: {
        ...(existingContact.firstName ? {} : { firstName }),
        ...(existingContact.lastName || !lastName ? {} : { lastName }),
        ...(existingContact.phone ? {} : { phone: e.phone }),
        ...(existingContact.companyId ? {} : { companyId: company.id }),
      },
    });
  } else {
    // Phone only: the single "Phone / WhatsApp" field does not by itself grant WhatsApp-marketing consent.
    contactId = (await prisma.contact.create({ data: { firstName, lastName, email, phone: e.phone, companyId: company.id } })).id;
  }

  const lead = await prisma.lead.create({
    data: { contactId, companyId: company.id, source: ENQUIRY_SOURCE, serviceInterest: solutionLabel, stage: "new" },
  });

  const metadata = {
    channel: "get_started",
    submissionId: e.submissionId,
    solution: e.solution,
    solutionLabel,
    businessType: e.businessType,
    businessTypeLabel,
    company: e.businessName,
    message: e.message,
    page: e.page || null,
    referrer: e.referrer || latest?.referrer || null,
    utm_source: latest?.utm_source ?? first?.utm_source ?? null,
    utm_medium: latest?.utm_medium ?? first?.utm_medium ?? null,
    utm_campaign: latest?.utm_campaign ?? first?.utm_campaign ?? null,
    utm_content: latest?.utm_content ?? first?.utm_content ?? null,
    utm_term: latest?.utm_term ?? first?.utm_term ?? null,
    fbclid: latest?.fbclid ?? first?.fbclid ?? null,
    attribution: { first: first ?? null, latest: latest ?? null },
    submittedAt: now.toISOString(),
  };

  await prisma.conversionEvent.create({
    data: { contactId, leadId: lead.id, eventType: "lead_created", occurredAt: now, metadata: metadata as unknown as Prisma.InputJsonValue },
  });

  return { leadId: lead.id, contactId, duplicate: false };
}
