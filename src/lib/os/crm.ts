import { prisma } from "@/lib/prisma";
import { ORG_ID, PIPELINE_STAGES, STAGE_PROBABILITY, type ActorType, type PipelineStage } from "./constants";
import { audit } from "./audit";
import { scoreOpportunity, type ProspectSignals } from "./scoring";
import { loadTemplates, recommendEmployees } from "./recommend";
import { analyseWebsite } from "./website";
import { emit } from "./events";

export interface Actor {
  actor: string;
  actorType: ActorType;
}

export async function logActivity(opportunityId: number, a: Actor, type: string, summary: string, channel?: string) {
  await prisma.osActivity.create({ data: { opportunityId, type, summary, channel: channel ?? null, actor: a.actor, actorType: a.actorType } });
}

export async function setStage(opportunityId: number, stage: PipelineStage, a: Actor, reason?: string) {
  if (!PIPELINE_STAGES.includes(stage)) throw new Error(`Invalid stage ${stage}`);
  const before = await prisma.osOpportunity.findUniqueOrThrow({ where: { id: opportunityId } });
  if (before.orgId !== ORG_ID) throw new Error("Cross-tenant access denied.");
  if (before.stage === stage) return before;
  const updated = await prisma.osOpportunity.update({
    where: { id: opportunityId },
    data: { stage, probability: STAGE_PROBABILITY[stage] },
  });
  await logActivity(opportunityId, a, "STAGE_CHANGE", `${before.stage} → ${stage}${reason ? ` (${reason})` : ""}`);
  await audit({ ...a, action: "opportunity.stage_change", resource: "opportunity", resourceId: opportunityId, input: { from: before.stage, to: stage, reason } });
  await emit("opportunity.stage_changed", { id: opportunityId, opportunityId, from: before.stage, to: stage, score: before.score });
  return updated;
}

export interface NewProspect {
  companyName: string;
  industry?: string | null;
  website?: string | null;
  country?: string | null;
  contactName?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  businessUnit?: string;
  source?: string;
  leadId?: number | null;
  isDemo?: boolean;
  notes?: string | null;
}

/** Idempotent on (company name, website): re-running discovery never duplicates a prospect. */
export async function createOpportunity(p: NewProspect, a: Actor) {
  const existing = await prisma.osOpportunity.findFirst({
    where: { orgId: ORG_ID, companyName: p.companyName, ...(p.website ? { website: p.website } : {}) },
  });
  if (existing) return { opportunity: existing, created: false };
  const opportunity = await prisma.osOpportunity.create({
    data: {
      orgId: ORG_ID, companyName: p.companyName, industry: p.industry ?? null, website: p.website ?? null, country: p.country ?? null,
      contactName: p.contactName ?? null, contactEmail: p.contactEmail ?? null, contactPhone: p.contactPhone ?? null,
      businessUnit: p.businessUnit ?? "KOVABOT", source: p.source ?? "manual", leadId: p.leadId ?? null, isDemo: p.isDemo ?? false,
      notes: p.notes ?? null, probability: STAGE_PROBABILITY.NEW, nextAction: "Research prospect",
    },
  });
  await logActivity(opportunity.id, a, "CREATED", `Prospect created from ${p.source ?? "manual"}`);
  await emit("opportunity.created", { id: opportunity.id, opportunityId: opportunity.id, source: p.source ?? "manual", industry: p.industry ?? null });
  await audit({ ...a, action: "opportunity.create", resource: "opportunity", resourceId: opportunity.id, input: p });
  return { opportunity, created: true };
}

/**
 * Research pipeline for one opportunity: analyse website (real fetch) → score → recommend AI employee → persist.
 * Missing evidence is recorded as such; nothing is guessed.
 */
export async function researchOpportunity(opportunityId: number, a: Actor, extra: Partial<ProspectSignals> = {}) {
  const opp = await prisma.osOpportunity.findUniqueOrThrow({ where: { id: opportunityId } });
  if (opp.orgId !== ORG_ID) throw new Error("Cross-tenant access denied.");

  const site = opp.website ? await analyseWebsite(opp.website) : null;
  const signals: ProspectSignals = {
    industry: opp.industry,
    hasWebsite: !!opp.website,
    hasEmail: !!opp.contactEmail,
    hasPhone: !!opp.contactPhone,
    ...(site?.signals ?? {}),
    ...extra,
  };
  if (site?.emails[0] && !opp.contactEmail) signals.hasEmail = true;

  const scored = scoreOpportunity(signals);
  const templates = await loadTemplates();
  const rec = recommendEmployees([opp.industry, site?.title, site?.description].filter(Boolean).join(" "), templates);

  const painPoints: string[] = [];
  if (signals.manualEnquiryProcess) painPoints.push("Enquiries appear to be handled manually");
  if (signals.phoneOnly) painPoints.push("Phone-only contact — after-hours enquiries are likely lost");
  if (signals.bookingFlow && !signals.liveChatPresent) painPoints.push("Bookings handled without automation");
  if (signals.hiringReceptionist) painPoints.push("Hiring for a front-desk role an AI employee can cover");
  if (signals.whatsappContact) painPoints.push("Customers contact via WhatsApp — response speed matters");

  const industry = opp.industry ?? rec.template?.industry ?? null;
  const dealValueCents = opp.dealValueCents || (rec.suggestedMonthlyPriceUsd ? rec.suggestedMonthlyPriceUsd * 12 * 100 : 0);

  const updated = await prisma.osOpportunity.update({
    where: { id: opportunityId },
    data: {
      industry,
      score: scored.score,
      scoreBreakdown: { factors: scored.factors, grade: scored.grade } as never,
      confidence: scored.confidence,
      signals: signals as never,
      recommendedEmployees: rec.employees,
      painPoints,
      valueProposition: rec.template
        ? `${rec.template.name}: ${rec.template.description}`
        : null,
      suggestedOffer: rec.template ? `${rec.template.name} — $${rec.template.monthlyPriceUsd}/month` : null,
      contactEmail: opp.contactEmail ?? site?.emails[0] ?? null,
      contactPhone: opp.contactPhone ?? site?.phones[0] ?? null,
      dealValueCents,
      stage: ["NEW"].includes(opp.stage) ? "RESEARCHED" : opp.stage,
      probability: opp.stage === "NEW" ? STAGE_PROBABILITY.RESEARCHED : opp.probability,
      nextAction: scored.score >= 55 ? "Personalised outreach" : "Nurture — low fit score",
      ownerAgentKey: opp.ownerAgentKey ?? "prospecting-agent",
    },
  });
  await logActivity(opportunityId, a, "RESEARCHED", `Score ${scored.score}/100 (grade ${scored.grade}, confidence ${Math.round(scored.confidence * 100)}%). ${site ? (site.reachable ? "Website analysed." : `Website unreachable${site.error ? `: ${site.error}` : ""}.`) : "No website to analyse."}`);
  await audit({ ...a, action: "opportunity.research", resource: "opportunity", resourceId: opportunityId, output: { score: scored.score, recommended: rec.employees } });
  return { opportunity: updated, score: scored, recommendation: rec, site };
}
