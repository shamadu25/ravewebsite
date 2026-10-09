import { z } from "zod";
import { api, jsonBody } from "@/lib/os/http";
import { prisma } from "@/lib/prisma";
import { BUSINESS_UNITS, ORG_ID, REVENUE_ENGINES } from "@/lib/os/constants";
import { audit } from "@/lib/os/audit";

export const GET = api("finance.read", async () => prisma.osPlan.findMany({ where: { orgId: ORG_ID }, orderBy: { id: "asc" } }));

/** Create or update a sellable plan. Editing the price clears the "assumed" flag and detaches the old Paystack plan (a new one is created on next checkout). */
export const POST = api("finance.execute", async ({ request, caller }) => {
  const b = await jsonBody(request, z.object({
    key: z.string().regex(/^[a-z0-9-]{3,60}$/), name: z.string().min(2).max(120), description: z.string().max(500).optional(),
    businessUnit: z.enum(BUSINESS_UNITS).default("KOVABOT"), revenueEngine: z.enum(REVENUE_ENGINES).default("SAAS"),
    amountUsd: z.number().positive().max(100000), periodMonths: z.number().int().min(1).max(36).default(1), active: z.boolean().default(true),
  }));
  const existing = await prisma.osPlan.findUnique({ where: { orgId_key: { orgId: ORG_ID, key: b.key } } });
  const priceChanged = !existing || existing.amountCents !== Math.round(b.amountUsd * 100) || existing.periodMonths !== b.periodMonths;
  const data = { name: b.name, description: b.description ?? null, businessUnit: b.businessUnit, revenueEngine: b.revenueEngine, amountCents: Math.round(b.amountUsd * 100), periodMonths: b.periodMonths, active: b.active, assumed: false, ...(priceChanged ? { paystackPlanCode: null } : {}) };
  const row = await prisma.osPlan.upsert({ where: { orgId_key: { orgId: ORG_ID, key: b.key } }, create: { orgId: ORG_ID, key: b.key, ...data }, update: data });
  await audit({ actor: caller.name, actorType: "HUMAN", action: "plan.save", resource: "plan", resourceId: b.key, input: b, ip: caller.ip });
  return row;
});
