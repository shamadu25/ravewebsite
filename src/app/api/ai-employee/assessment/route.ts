import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { isRateLimited } from "@/lib/ai/rateLimit";
import { computeRecommendation } from "@/lib/assessment/recommend";
import { BUSINESS_TYPES, INQUIRY_CHANNELS, INQUIRY_VOLUMES, MAIN_PROBLEMS, RESPONSE_SPEEDS } from "@/lib/assessment/types";
import { scoreLead } from "@/lib/services/leadScoring";
import { sendAssessmentCompletedNotification } from "@/lib/mail/notifications";
import { clientIp } from "../../ai/_shared";

const AssessmentSchema = z.object({
  answers: z.object({
    businessType: z.enum(BUSINESS_TYPES),
    mainProblem: z.enum(MAIN_PROBLEMS),
    inquiryChannel: z.enum(INQUIRY_CHANNELS),
    inquiryVolume: z.enum(INQUIRY_VOLUMES),
    responseSpeed: z.enum(RESPONSE_SPEEDS),
    successCriteria: z.string().max(1000).optional().default(""),
  }),
  contact: z.object({
    fullName: z.string().min(1).max(200),
    businessName: z.string().min(1).max(200),
    workEmail: z.string().email(),
    whatsapp: z.string().min(6).max(30),
    country: z.string().min(1).max(100),
  }),
  attribution: z
    .object({
      utmSource: z.string().max(255).nullish(),
      utmMedium: z.string().max(255).nullish(),
      utmCampaign: z.string().max(255).nullish(),
      utmContent: z.string().max(255).nullish(),
      utmTerm: z.string().max(255).nullish(),
      fbclid: z.string().max(255).nullish(),
      landingVariant: z.string().max(100).nullish(),
      device: z.string().max(50).nullish(),
      landingPage: z.string().max(2048).nullish(),
    })
    .optional()
    .default({}),
  consent: z.boolean().optional().default(false),
});

export async function POST(request: NextRequest) {
  if (isRateLimited(`assessment:${clientIp(request)}`)) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  const body = await request.json().catch(() => null);
  const parsed = AssessmentSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request.", details: parsed.error.flatten() }, { status: 422 });
  }

  const { answers, contact, attribution, consent } = parsed.data;
  const recommendation = computeRecommendation(answers);

  const existingCompany = await prisma.company.findFirst({ where: { name: contact.businessName } });
  const company =
    existingCompany ?? (await prisma.company.create({ data: { name: contact.businessName, country: contact.country } }));

  const [firstName, ...rest] = contact.fullName.trim().split(/\s+/);
  const lastName = rest.join(" ") || null;

  let dbContact = await prisma.contact.findFirst({ where: { email: contact.workEmail } });

  const contactData = {
    companyId: company.id,
    firstName,
    lastName,
    email: contact.workEmail,
    whatsapp: contact.whatsapp,
    country: contact.country,
    consentWhatsapp: consent,
    consentEmail: consent,
  };

  dbContact = dbContact
    ? await prisma.contact.update({ where: { id: dbContact.id }, data: contactData })
    : await prisma.contact.create({ data: contactData });

  const lead = await prisma.lead.create({
    data: {
      contactId: dbContact.id,
      companyId: company.id,
      source: "ai_employee_assessment",
      serviceInterest: recommendation.agentName,
      stage: "new",
    },
  });

  await prisma.conversionEvent.create({
    data: {
      contactId: dbContact.id,
      leadId: lead.id,
      eventType: "ai_employee_assessment_completed",
      metadata: { answers, attribution, recommendation } as unknown as Prisma.InputJsonValue,
      occurredAt: new Date(),
    },
  });

  await scoreLead(lead.id, {
    clear_problem: true,
    contact_details_complete: true,
    meaningful_lead_volume: answers.inquiryVolume === "101_500" || answers.inquiryVolume === "gt_500",
    implementation_under_30_days: recommendation.complexity === "Simple",
  });

  await sendAssessmentCompletedNotification({
    leadId: lead.id,
    contactName: contact.fullName,
    businessName: contact.businessName,
    contactEmail: contact.workEmail,
    contactWhatsapp: contact.whatsapp,
    recommendedAgent: recommendation.agentName,
    complexity: recommendation.complexity,
  });

  return NextResponse.json({ recommendation, lead_id: lead.id }, { status: 201 });
}
