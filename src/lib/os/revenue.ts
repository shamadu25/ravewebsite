import { prisma } from "@/lib/prisma";
import { ORG_ID } from "./constants";
import { audit } from "./audit";
import { logActivity, setStage, type Actor } from "./crm";
import { enqueueTask } from "./queue";
import { emit } from "./events";
import { mrrCentsAt } from "./mrr";

export interface PaymentInput {
  opportunityId?: number;
  customerId?: number;
  customerName?: string;
  businessUnit?: string;
  revenueEngine?: string;
  amountCents: number;
  recurring: boolean;
  description?: string;
  source: string;
  /** Provider payment id — makes webhook retries idempotent. */
  externalRef: string;
  /** Months of service the payment covers (annual plan = 12). MRR is amount / periodMonths. */
  periodMonths?: number;
  /** When the paid period ends; after this the entry stops counting toward MRR. Omit only for open-ended manual entries. */
  recurringEndsAt?: Date | null;
  occurredAt?: Date;
  isDemo?: boolean;
}

/**
 * Records real revenue. Idempotent on (source, externalRef). When tied to an opportunity it marks the deal WON,
 * creates the customer and launches the onboarding task chain.
 */
export async function recordPayment(p: PaymentInput, a: Actor) {
  if (!Number.isInteger(p.amountCents) || p.amountCents <= 0) throw new Error("amountCents must be a positive integer.");

  const dupe = await prisma.osRevenueEntry.findUnique({ where: { orgId_source_externalRef: { orgId: ORG_ID, source: p.source, externalRef: p.externalRef } } });
  if (dupe) return { entry: dupe, customerId: dupe.customerId, duplicate: true };

  const opp = p.opportunityId ? await prisma.osOpportunity.findUniqueOrThrow({ where: { id: p.opportunityId } }) : null;
  if (opp && opp.orgId !== ORG_ID) throw new Error("Cross-tenant access denied.");

  let customer = p.customerId
    ? await prisma.osCustomer.findUniqueOrThrow({ where: { id: p.customerId } })
    : opp
      ? await prisma.osCustomer.findUnique({ where: { opportunityId: opp.id } })
      : null;
  let newCustomer = false;
  const name = customer?.name ?? opp?.companyName ?? p.customerName;
  if (!name) throw new Error("A customer name or opportunity is required.");

  if (!customer) {
    customer = await prisma.osCustomer.create({
      data: {
        orgId: ORG_ID, opportunityId: opp?.id ?? null, name, businessUnit: p.businessUnit ?? opp?.businessUnit ?? "KOVABOT",
        revenueEngine: p.revenueEngine ?? opp?.revenueEngine ?? "SAAS", status: "ONBOARDING", health: "YELLOW",
        mrrCents: p.recurring ? p.amountCents : 0, isDemo: p.isDemo ?? opp?.isDemo ?? false, plan: opp?.suggestedOffer ?? null,
      },
    });
    newCustomer = true;
  }

  const entry = await prisma.osRevenueEntry.create({
    data: {
      orgId: ORG_ID, customerId: customer.id, businessUnit: customer.businessUnit, revenueEngine: customer.revenueEngine,
      kind: p.recurring ? "RECURRING" : "ONE_TIME", amountCents: p.amountCents, description: p.description ?? null, source: p.source,
      externalRef: p.externalRef, periodMonths: Math.max(1, Math.min(60, p.periodMonths ?? 1)), recurringEndsAt: p.recurring ? (p.recurringEndsAt ?? null) : null, occurredAt: p.occurredAt ?? new Date(), isDemo: p.isDemo ?? customer.isDemo,
    },
  });

  // Customer MRR is always recomputed from live ledger entries — never incremented — so renewals and plan changes cannot drift.
  if (p.recurring) {
    const all = await prisma.osRevenueEntry.findMany({ where: { orgId: ORG_ID, customerId: customer.id, kind: "RECURRING" }, select: { kind: true, amountCents: true, periodMonths: true, occurredAt: true, recurringEndsAt: true } });
    customer = await prisma.osCustomer.update({ where: { id: customer.id }, data: { mrrCents: mrrCentsAt(all, new Date()) } });
  }

  if (opp) {
    await setStage(opp.id, "WON", a, `payment ${p.externalRef}`);
    await prisma.osOpportunity.update({ where: { id: opp.id }, data: { nextAction: "Onboarding", dealValueCents: opp.dealValueCents || p.amountCents * (p.recurring ? 12 : 1) } });
    await logActivity(opp.id, a, "PAYMENT", `Payment of $${(p.amountCents / 100).toLocaleString()} received (${p.recurring ? "recurring" : "one-time"}).`);
  }
  await audit({ ...a, action: "revenue.payment_recorded", resource: "revenue_entry", resourceId: entry.id, input: { amountCents: p.amountCents, recurring: p.recurring, source: p.source, externalRef: p.externalRef, customerId: customer.id } });

  await emit("payment.received", { id: entry.id, customerId: customer.id, opportunityId: opp?.id ?? null, amountCents: p.amountCents, recurring: p.recurring, newCustomer });
  if (newCustomer) {
    await enqueueTask({
      agentKey: "onboarding-agent", title: `Onboard ${customer.name}`, priority: "HIGH", createdBy: a.actor,
      idempotencyKey: `onboard:${customer.id}`, input: { customerId: customer.id }, customerId: customer.id, opportunityId: opp?.id, isDemo: customer.isDemo,
    });
  }
  return { entry, customerId: customer.id, duplicate: false };
}
