import { z } from "zod";
import { api, jsonBody } from "@/lib/os/http";
import { prisma } from "@/lib/prisma";
import { BUSINESS_UNITS, CHANNELS, ORG_ID } from "@/lib/os/constants";
import { audit } from "@/lib/os/audit";

export const GET = api("campaign.read", async () => prisma.osCampaign.findMany({ where: { orgId: ORG_ID }, orderBy: { id: "desc" }, take: 100 }));

export const POST = api("campaign.create", async ({ request, caller }) => {
  const b = await jsonBody(request, z.object({
    name: z.string().min(2).max(160), businessUnit: z.enum(BUSINESS_UNITS).default("KOVABOT"), channel: z.enum(CHANNELS), goal: z.string().min(2).max(300),
    audience: z.string().min(2).max(300), offer: z.string().min(2).max(300), budgetUsd: z.number().nonnegative(), expectedLeads: z.number().int().nonnegative().default(0),
    expectedCustomers: z.number().int().nonnegative().default(0), expectedRevenueUsd: z.number().nonnegative().default(0),
  }));
  const row = await prisma.osCampaign.create({ data: { orgId: ORG_ID, name: b.name, businessUnit: b.businessUnit, channel: b.channel, goal: b.goal, audience: b.audience, offer: b.offer, budgetCents: Math.round(b.budgetUsd * 100), expectedLeads: b.expectedLeads, expectedCustomers: b.expectedCustomers, expectedRevenueCents: Math.round(b.expectedRevenueUsd * 100) } });
  await audit({ actor: caller.name, actorType: "HUMAN", action: "campaign.create", resource: "campaign", resourceId: row.id, input: b, ip: caller.ip });
  return row;
});
