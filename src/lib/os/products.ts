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
  // Cosmetic fields never cause a rejection: a malformed email is dropped and a long name is trimmed.
  email: z.string().email().max(190).optional().catch(undefined),
  name: z.string().transform((v) => v.slice(0, 200)).optional().catch(undefined),
  amountCents: z.number().int().positive().optional(),
  recurring: z.boolean().optional(),
  /** Months of service this payment covers (monthly=1, annual=12). */
  periodMonths: z.number().int().min(1).max(1200).optional(),
  /** End of the paid period (ISO). Required for correct MRR on renewals. */
  periodEndsAt: z.string().datetime({ offset: true }).optional(),
  count: z.number().int().nonnegative().optional(),
  payload: z.record(z.string(), z.unknown()).optional(),
  occurredAt: z.string().datetime({ offset: true }).optional(),
});
export type ProductEventInput = z.infer<typeof ProductEvent>;

const EVENT_NAME = { REGISTERED: "product.registered", ACTIVATED: "product.activated", SUBSCRIBED: "product.subscribed", CHURNED: "product.churned" } as const;

const SIMPLE = new Set(["REGISTERED", "ACTIVATED", "USAGE", "SUBSCRIBED", "SUPPORT_TICKET"]);
const isHistorical = (d: Date) => d.getTime() < Date.now() - 7 * 86400_000;

export interface IngestResult { ok: boolean; duplicate?: boolean; error?: string }

/**
 * Ingest a batch of lifecycle events from CliqPOS / KOVABOT / HMS / Restovax. Idempotent on (businessUnit, externalId).
 * Built for bulk loads over a high-latency database: duplicate detection is one query, simple events are one bulk insert,
 * and only payments/churn (which touch revenue) run one at a time. Historical events skip automation emits.
 */
export async function ingestProductBatch(events: ProductEventInput[]): Promise<IngestResult[]> {
  const results: IngestResult[] = events.map(() => ({ ok: true }));
  if (!events.length) return results;

  const existing = await prisma.osProductEvent.findMany({ where: { orgId: ORG_ID, externalId: { in: events.map((e) => e.externalId) } }, select: { businessUnit: true, externalId: true } });
  const seen = new Set(existing.map((x) => `${x.businessUnit}:${x.externalId}`));
  const fresh: Array<{ e: ProductEventInput; i: number; at: Date }> = [];
  events.forEach((e, i) => {
    const key = `${e.businessUnit}:${e.externalId}`;
    if (seen.has(key)) { results[i] = { ok: true, duplicate: true }; return; }
    seen.add(key); // also dedupes repeats inside the same batch
    fresh.push({ e, i, at: e.occurredAt ? new Date(e.occurredAt) : new Date() });
  });

  const row = ({ e, at }: (typeof fresh)[number]) => ({ orgId: ORG_ID, businessUnit: e.businessUnit, type: e.type, externalId: e.externalId, userRef: e.userRef, email: e.email, name: e.name, amountCents: e.amountCents, count: e.count, payload: (e.payload ?? undefined) as never, occurredAt: at });

  // 1. Simple events: one bulk insert.
  const simple = fresh.filter((f) => SIMPLE.has(f.e.type));
  if (simple.length) await prisma.osProductEvent.createMany({ data: simple.map(row), skipDuplicates: true });

  // 2. Keep customers' last-activity current: one update per distinct user, not per event.
  const lastActive = new Map<string, { bu: string; ref: string; at: Date }>();
  for (const f of simple) if (f.e.type === "USAGE" || f.e.type === "ACTIVATED") {
    const k = `${f.e.businessUnit}:${f.e.userRef}`, cur = lastActive.get(k);
    if (!cur || f.at > cur.at) lastActive.set(k, { bu: f.e.businessUnit, ref: f.e.userRef, at: f.at });
  }
  for (const v of lastActive.values()) await prisma.osCustomer.updateMany({ where: { orgId: ORG_ID, businessUnit: v.bu, externalRef: v.ref }, data: { lastActiveAt: v.at } });

  // 3. Revenue-affecting events, one at a time.
  for (const f of fresh.filter((x) => !SIMPLE.has(x.e.type))) {
    try {
      await prisma.osProductEvent.create({ data: row(f) });
      await ingestHeavy(f.e, f.at);
    } catch (err) {
      results[f.i] = { ok: false, error: err instanceof Error ? err.message.slice(0, 200) : "failed" };
    }
  }

  // 4. Automation hooks only for recent events (a backfill must not fire rules 461 times).
  for (const f of simple) {
    const name = EVENT_NAME[f.e.type as keyof typeof EVENT_NAME];
    if (name && !isHistorical(f.at)) await emit(name, { id: f.e.externalId, businessUnit: f.e.businessUnit, userRef: f.e.userRef });
  }

  const byType: Record<string, number> = {};
  for (const f of fresh) byType[f.e.type] = (byType[f.e.type] ?? 0) + 1;
  if (fresh.length) await audit({ actor: `product:${events[0].businessUnit}`, actorType: "WEBHOOK", action: "product.batch", resource: "product_event", resourceId: events[0].externalId, input: { received: events.length, new: fresh.length, byType } });
  return results;
}

async function ingestHeavy(e: ProductEventInput, occurredAt: Date) {
  if (e.type === "PAYMENT" && e.amountCents) {
    // Link / create the customer record the first time a user pays.
    const existing = await prisma.osCustomer.findFirst({ where: { orgId: ORG_ID, businessUnit: e.businessUnit, externalRef: e.userRef } });
    const r = await recordPayment({ customerId: existing?.id, customerName: e.name ?? e.email ?? `${e.businessUnit} user ${e.userRef}`, businessUnit: e.businessUnit, amountCents: e.amountCents, recurring: (e.recurring ?? true) && (e.periodMonths ?? 1) <= 60, periodMonths: Math.min(60, e.periodMonths ?? 1), recurringEndsAt: e.periodEndsAt ? new Date(e.periodEndsAt) : null, source: `product:${e.businessUnit}`, externalRef: e.externalId, occurredAt }, { actor: `product:${e.businessUnit}`, actorType: "WEBHOOK" });
    if (!existing && r.customerId) await prisma.osCustomer.update({ where: { id: r.customerId }, data: { externalRef: e.userRef } });
  }
  if (e.type === "CHURNED") {
    const gone = await prisma.osCustomer.findMany({ where: { orgId: ORG_ID, businessUnit: e.businessUnit, externalRef: e.userRef }, select: { id: true } });
    // Close any still-open recurring windows so churned customers stop counting toward MRR/ARR immediately.
    await prisma.osRevenueEntry.updateMany({ where: { orgId: ORG_ID, customerId: { in: gone.map((g) => g.id) }, kind: "RECURRING", OR: [{ recurringEndsAt: null }, { recurringEndsAt: { gt: occurredAt } }] }, data: { recurringEndsAt: occurredAt } });
    await prisma.osCustomer.updateMany({ where: { id: { in: gone.map((g) => g.id) } }, data: { status: "CHURNED", mrrCents: 0 } });
    if (!isHistorical(occurredAt)) await emit("product.churned", { id: e.externalId, businessUnit: e.businessUnit, userRef: e.userRef });
  }
}

/** Single-event convenience wrapper (live traffic, tests). */
export async function ingestProductEvent(e: ProductEventInput): Promise<IngestResult> {
  return (await ingestProductBatch([e]))[0];
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
