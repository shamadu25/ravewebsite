import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { ORG_ID, BUSINESS_UNITS } from "./constants";
import { emit } from "./events";
import { recordPayment } from "./revenue";
import { audit } from "./audit";

export const ProductEvent = z.object({
  businessUnit: z.enum(BUSINESS_UNITS),
  type: z.enum(["REGISTERED", "ACTIVATED", "SUBSCRIBED", "PAYMENT", "USAGE", "CHURNED", "SUPPORT_TICKET"]),
  /** Provider event id — makes retries idempotent. */
  externalId: z.string().min(1).max(120),
  userRef: z.string().min(1).max(120),
  email: z.string().email().optional(),
  name: z.string().max(200).optional(),
  amountCents: z.number().int().positive().optional(),
  recurring: z.boolean().optional(),
  count: z.number().int().nonnegative().optional(),
  payload: z.record(z.string(), z.unknown()).optional(),
  occurredAt: z.string().datetime().optional(),
});
export type ProductEventInput = z.infer<typeof ProductEvent>;

const EVENT_NAME = { REGISTERED: "product.registered", ACTIVATED: "product.activated", SUBSCRIBED: "product.subscribed", CHURNED: "product.churned" } as const;

/** Ingest one lifecycle event from CliqPOS / KOVABOT / HMS / Restovax. Idempotent on (businessUnit, externalId). */
export async function ingestProductEvent(e: ProductEventInput) {
  const dupe = await prisma.osProductEvent.findUnique({ where: { orgId_businessUnit_externalId: { orgId: ORG_ID, businessUnit: e.businessUnit, externalId: e.externalId } } });
  if (dupe) return { duplicate: true };
  const occurredAt = e.occurredAt ? new Date(e.occurredAt) : new Date();
  await prisma.osProductEvent.create({ data: { orgId: ORG_ID, businessUnit: e.businessUnit, type: e.type, externalId: e.externalId, userRef: e.userRef, email: e.email, name: e.name, amountCents: e.amountCents, count: e.count, payload: (e.payload ?? undefined) as never, occurredAt } });

  // Link / create the customer record the first time a user pays or subscribes.
  if (e.type === "PAYMENT" && e.amountCents) {
    const existing = await prisma.osCustomer.findFirst({ where: { orgId: ORG_ID, businessUnit: e.businessUnit, externalRef: e.userRef } });
    const r = await recordPayment({ customerId: existing?.id, customerName: e.name ?? e.email ?? `${e.businessUnit} user ${e.userRef}`, businessUnit: e.businessUnit, amountCents: e.amountCents, recurring: e.recurring ?? true, source: `product:${e.businessUnit}`, externalRef: e.externalId, occurredAt }, { actor: `product:${e.businessUnit}`, actorType: "WEBHOOK" });
    if (!existing && r.customerId) await prisma.osCustomer.update({ where: { id: r.customerId }, data: { externalRef: e.userRef } });
  }
  if (e.type === "USAGE" || e.type === "ACTIVATED") {
    await prisma.osCustomer.updateMany({ where: { orgId: ORG_ID, businessUnit: e.businessUnit, externalRef: e.userRef }, data: { lastActiveAt: occurredAt } });
  }
  if (e.type === "CHURNED") await prisma.osCustomer.updateMany({ where: { orgId: ORG_ID, businessUnit: e.businessUnit, externalRef: e.userRef }, data: { status: "CHURNED", mrrCents: 0 } });
  if (e.type in EVENT_NAME) await emit(EVENT_NAME[e.type as keyof typeof EVENT_NAME], { id: e.externalId, businessUnit: e.businessUnit, userRef: e.userRef });
  await audit({ actor: `product:${e.businessUnit}`, actorType: "WEBHOOK", action: "product.event", resource: "product_event", resourceId: e.externalId, input: { type: e.type } });
  return { duplicate: false };
}

/** Recompute 30d / prior-30d usage for every product-linked customer so Customer Health uses real data. */
export async function refreshUsageFromEvents(now = new Date()): Promise<number> {
  const customers = await prisma.osCustomer.findMany({ where: { orgId: ORG_ID, externalRef: { not: null }, status: { not: "CHURNED" } } });
  const d30 = new Date(now.getTime() - 30 * 86400_000), d60 = new Date(now.getTime() - 60 * 86400_000);
  for (const c of customers) {
    const ev = await prisma.osProductEvent.findMany({ where: { orgId: ORG_ID, businessUnit: c.businessUnit, userRef: c.externalRef as string, type: "USAGE", occurredAt: { gte: d60 } }, select: { count: true, occurredAt: true } });
    if (!ev.length) continue;
    const sum = (xs: typeof ev) => xs.reduce((n, e) => n + (e.count ?? 1), 0);
    await prisma.osCustomer.update({ where: { id: c.id }, data: { usage30d: sum(ev.filter((e) => e.occurredAt >= d30)), usagePrev30d: sum(ev.filter((e) => e.occurredAt < d30)), lastActiveAt: ev.map((e) => e.occurredAt).sort((a, b) => b.getTime() - a.getTime())[0] } });
  }
  return customers.length;
}

export interface Funnel { businessUnit: string; registered: number; activated: number; paid: number; regToActPct: number | null; actToPaidPct: number | null; biggestDrop: string }

/** Registration → activation → payment per business unit, counting distinct users; identifies where users drop. */
export async function getFunnels(): Promise<Funnel[]> {
  const rows = await prisma.osProductEvent.findMany({ where: { orgId: ORG_ID, type: { in: ["REGISTERED", "ACTIVATED", "SUBSCRIBED", "PAYMENT"] } }, select: { businessUnit: true, type: true, userRef: true } });
  const units = [...new Set(rows.map((r) => r.businessUnit))];
  return units.map((bu) => {
    const set = (types: string[]) => new Set(rows.filter((r) => r.businessUnit === bu && types.includes(r.type)).map((r) => r.userRef));
    const reg = set(["REGISTERED"]), act = set(["ACTIVATED"]), paid = set(["SUBSCRIBED", "PAYMENT"]);
    const pct = (a: number, b: number) => (b ? Math.round((a / b) * 1000) / 10 : null);
    const r2a = pct(act.size, reg.size), a2p = pct(paid.size, act.size);
    const biggestDrop = reg.size < 20 ? "INSUFFICIENT DATA (fewer than 20 registrations)" : r2a != null && a2p != null ? (r2a <= a2p ? "Registration → Activation" : "Activation → Payment") : "INSUFFICIENT DATA";
    return { businessUnit: bu, registered: reg.size, activated: act.size, paid: paid.size, regToActPct: r2a, actToPaidPct: a2p, biggestDrop };
  });
}
