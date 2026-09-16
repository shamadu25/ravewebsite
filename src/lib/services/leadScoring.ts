import { prisma } from "@/lib/prisma";
import { LEAD_SCORE_LEVELS, LEAD_SCORING_WEIGHTS } from "@/lib/ai/config";
import { sendHotLeadNotification } from "@/lib/mail/notifications";
import type { LeadScore } from "@prisma/client";

/**
 * Deterministic lead scoring (spec §12). `signals` maps a subset of the
 * configured component keys to true when that signal was observed.
 */
export async function scoreLead(leadId: number, signals: Record<string, boolean>): Promise<LeadScore> {
  const components = Object.entries(signals)
    .filter(([, present]) => present)
    .filter(([key]) => key in LEAD_SCORING_WEIGHTS)
    .map(([key]) => ({ key, points: LEAD_SCORING_WEIGHTS[key] }));

  const totalScore = Math.min(
    100,
    components.reduce((sum, c) => sum + c.points, 0)
  );

  const level = levelFor(totalScore);

  const wasAlreadyHot = await prisma.leadScore.findFirst({ where: { leadId, level: "hot" } });

  const score = await prisma.leadScore.create({
    data: {
      leadId,
      totalScore,
      level,
      computedAt: new Date(),
      components: {
        create: components,
      },
    },
    include: { components: true },
  });

  if (level === "hot" && !wasAlreadyHot) {
    await notifyHotLead(leadId, totalScore);
  }

  return score;
}

async function notifyHotLead(leadId: number, totalScore: number): Promise<void> {
  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    include: { contact: true, company: true },
  });

  if (!lead) return;

  const contactName = [lead.contact.firstName, lead.contact.lastName].filter(Boolean).join(" ") || "Unknown visitor";

  await sendHotLeadNotification({
    leadId: lead.id,
    contactName,
    contactEmail: lead.contact.email,
    contactPhone: lead.contact.phone,
    contactWhatsapp: lead.contact.whatsapp,
    companyName: lead.company?.name ?? null,
    serviceInterest: lead.serviceInterest,
    totalScore,
  });
}

function levelFor(totalScore: number): string {
  const match = LEAD_SCORE_LEVELS.find((l) => totalScore >= l.min && totalScore <= l.max);
  return match?.level ?? "low";
}
