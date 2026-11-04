import { z } from "zod";
import { prisma } from "@/lib/prisma";

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
