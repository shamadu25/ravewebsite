import { prisma } from "@/lib/prisma";
import { GROWTH_ORG } from "./config";

export const rate = (num: number, den: number): number | null => (den > 0 ? Math.round((num / den) * 1000) / 10 : null);
export const fmtRate = (r: number | null) => (r === null ? "N/A" : `${r}%`);

export const METRIC_DEFINITIONS: Record<string, string> = {
  researched: "GrCompany rows with researchedAt in range.",
  qualified: "GrCompany with status QUALIFIED (sourced evidence, fit >= threshold, confidence >= minimum).",
  qualificationRate: "qualified / researched.",
  decisionMakers: "GrPerson rows with verified=true.",
  verifiedContacts: "GrContact with status VERIFIED (provider smtp_status valid).",
  contactCoverage: "qualified companies with >=1 VERIFIED contact / qualified companies.",
  draftsGenerated: "GrDraft rows (all versions).",
  draftsApproved: "GrApproval rows (human approvals recorded).",
  sent: "GrOutbox rows with status SENT (SMTP accepted the message).",
  delivered: "Not measurable: SMTP gives no delivery receipt. Reported as N/A rather than guessed.",
  replies: "GrReply rows excluding bounces and auto-replies.",
  positiveReplies: "GrReply in INTERESTED, REQUESTING_DETAILS, PRICING_QUESTION, REFERRAL.",
  positiveReplyRate: "positive replies / sent first-touch messages (delivered is unavailable, so sent is the denominator).",
  paying: "OsCustomer linked to a Growth company whose opportunity has non-demo OsRevenueEntry rows.",
  cashCollected: "Sum of non-demo OsRevenueEntry.amountCents (USD) for customers attributed to Growth companies via opportunityId.",
};

export const lastDays = (n: number) => ({ from: new Date(Date.now() - n * 86400_000), to: new Date() });

export async function growthFunnel(from: Date, to: Date) {
  const range = { gte: from, lte: to };
  const [researched, qualified, people, verifiedContacts, drafts, approvals, sent, replies, positive, firstSent, usage] = await Promise.all([
    prisma.grCompany.count({ where: { orgId: GROWTH_ORG, researchedAt: range } }),
    prisma.grCompany.count({ where: { orgId: GROWTH_ORG, status: "QUALIFIED", researchedAt: range } }),
    prisma.grPerson.count({ where: { verified: true, createdAt: range } }),
    prisma.grContact.count({ where: { status: "VERIFIED", createdAt: range } }),
    prisma.grDraft.count({ where: { createdAt: range } }),
    prisma.grApproval.count({ where: { approvedAt: range } }),
    prisma.grOutbox.count({ where: { status: "SENT", sentAt: range } }),
    prisma.grReply.count({ where: { createdAt: range, category: { not: "OUT_OF_OFFICE" }, NOT: { nextAction: { startsWith: "Bounced" } } } }),
    prisma.grReply.count({ where: { createdAt: range, category: { in: ["INTERESTED", "REQUESTING_DETAILS", "PRICING_QUESTION", "REFERRAL"] } } }),
    prisma.grOutbox.count({ where: { status: "SENT", sentAt: range, draft: { touch: 1 } } }),
    prisma.grProviderUsage.groupBy({ by: ["provider", "ok"], where: { createdAt: range }, _sum: { credits: true }, _count: true }),
  ]);
  const covered = await prisma.grCompany.findMany({ where: { orgId: GROWTH_ORG, status: "QUALIFIED", researchedAt: range }, select: { contacts: { where: { status: "VERIFIED" }, select: { id: true }, take: 1 } } });
  const withContact = covered.filter((c) => c.contacts.length > 0).length;

  const linked = await prisma.grCompany.findMany({ where: { opportunityId: { not: null } }, select: { opportunityId: true } });
  const oppIds = linked.map((l) => l.opportunityId as number);
  const customers = oppIds.length ? await prisma.osCustomer.findMany({ where: { opportunityId: { in: oppIds }, isDemo: false }, select: { id: true } }) : [];
  const rev = customers.length ? await prisma.osRevenueEntry.aggregate({ where: { customerId: { in: customers.map((c) => c.id) }, isDemo: false, occurredAt: range }, _sum: { amountCents: true } }) : null;

  return {
    researched, qualified, qualificationRate: rate(qualified, researched),
    verifiedDecisionMakers: people, verifiedContacts, contactCoverage: rate(withContact, qualified),
    draftsGenerated: drafts, draftsApproved: approvals, sent, delivered: null as number | null,
    replies, positiveReplies: positive, positiveReplyRate: rate(positive, firstSent),
    payingCustomers: customers.length, cashCollectedCents: rev?._sum.amountCents ?? 0,
    providerUsage: usage.map((u) => ({ provider: u.provider, ok: u.ok, calls: u._count, credits: u._sum.credits ?? 0 })),
  };
}
