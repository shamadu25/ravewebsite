/** Opt-out, correction/deletion requests and anonymisation. */
import { prisma } from "@/lib/prisma";
import { logActivity } from "./crm";
import { verifyToken } from "./tokens";

export async function optOutByToken(token: string): Promise<boolean> {
  const t = verifyToken(token, "optout");
  if (!t) return false;
  const lead = await prisma.aiLead.findUnique({ where: { id: t.id } });
  if (!lead) return false;
  await prisma.aiLead.update({ where: { id: lead.id }, data: { emailOptOut: true, followupsStopped: true, optedOutAt: new Date() } });
  await prisma.aiFollowupRun.updateMany({ where: { proposal: { leadId: lead.id }, status: "PENDING" }, data: { status: "CANCELLED", reason: "OPT_OUT" } });
  await prisma.contact.update({ where: { id: lead.contactId }, data: { consentEmail: false } }).catch(() => undefined);
  await logActivity({ leadId: lead.id, actor: "customer", action: "lead.opted_out" });
  return true;
}

export async function createDataRequest(email: string, kind: "CORRECTION" | "DELETION" | "OPT_OUT", details?: string) {
  const row = await prisma.aiDataRequest.create({ data: { email: email.toLowerCase().slice(0, 254), kind, details: details?.slice(0, 1000) ?? null } });
  if (kind === "OPT_OUT") {
    const leads = await prisma.aiLead.findMany({ where: { contact: { email: email.toLowerCase() } }, select: { id: true } });
    for (const l of leads) {
      await prisma.aiLead.update({ where: { id: l.id }, data: { emailOptOut: true, followupsStopped: true, optedOutAt: new Date() } });
      await prisma.aiFollowupRun.updateMany({ where: { proposal: { leadId: l.id }, status: "PENDING" }, data: { status: "CANCELLED", reason: "OPT_OUT" } });
    }
  }
  return row;
}

/** Right to erasure: remove personal data but keep non-identifying commercial records for reporting and audit. */
export async function anonymiseLead(leadId: number, actor: string) {
  const lead = await prisma.aiLead.findUniqueOrThrow({ where: { id: leadId } });
  const stamp = new Date();
  await prisma.$transaction([
    prisma.contact.update({ where: { id: lead.contactId }, data: { firstName: "Removed", lastName: null, jobTitle: null, email: null, phone: null, whatsapp: null, city: null, consentEmail: false, consentWhatsapp: false } }),
    prisma.aiAssessmentResponse.updateMany({ where: { assessment: { leadId }, questionKey: { in: ["fullName", "email", "phone", "position", "additionalInfo", "description", "workflows", "challengeDetail", "challengeOther", "website"] } }, data: { value: "[removed]" } }),
    prisma.aiAssessment.updateMany({ where: { leadId }, data: { anonymisedAt: stamp, businessName: "[removed]" } }),
    prisma.aiLead.update({ where: { id: leadId }, data: { anonymisedAt: stamp, emailOptOut: true, followupsStopped: true, nextActionNote: null, assignedTo: lead.assignedTo } }),
    prisma.aiLeadNote.deleteMany({ where: { leadId } }),
    prisma.aiEmailLog.updateMany({ where: { leadId }, data: { toEmail: "removed@invalid" } }),
    prisma.aiFollowupRun.updateMany({ where: { proposal: { leadId }, status: "PENDING" }, data: { status: "CANCELLED", reason: "ERASED" } }),
  ]);
  // Stored proposal documents carry the customer's identity too: scrub the JSON and drop the PDFs (they cannot be edited in place).
  const versions = await prisma.aiProposalVersion.findMany({ where: { proposal: { leadId } }, select: { id: true, content: true } });
  for (const v of versions) {
    const c = v.content as { customer?: Record<string, string> } & Record<string, unknown>;
    if (c.customer) c.customer = { ...c.customer, contactName: "Removed", position: "", email: "", phone: "", businessName: "[removed]" };
    await prisma.aiProposalVersion.update({ where: { id: v.id }, data: { content: c as never, pdf: null, pdfSha256: null, pdfBytes: null } });
  }
  await logActivity({ leadId, actor, action: "lead.anonymised" });
}
