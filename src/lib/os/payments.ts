import { createHmac, randomBytes, timingSafeEqual } from "crypto";
import { prisma } from "@/lib/prisma";
import { ORG_ID } from "./constants";
import { audit } from "./audit";
import { createPlan, initializeTransaction, paystackConfigured } from "./paystack";

const APP = () => process.env.NEXT_PUBLIC_APP_URL ?? "https://ravesoftsolutions.com";
const secret = () => process.env.OS_UNSUBSCRIBE_SECRET ?? process.env.ADMIN_SESSION_SECRET ?? "";

/** Stable, tamper-proof pay link token. The link never expires, but the Paystack checkout behind it is created fresh on each click. */
export function signPayToken(opportunityId: number, planKey: string): string {
  const body = Buffer.from(`${opportunityId}|${planKey}`).toString("base64url");
  return `${body}.${createHmac("sha256", secret()).update(body).digest("hex").slice(0, 24)}`;
}
export function verifyPayToken(token: string): { opportunityId: number; planKey: string } | null {
  const [body, sig] = token.split(".");
  if (!body || !sig || !secret()) return null;
  const expected = createHmac("sha256", secret()).update(body).digest("hex").slice(0, 24);
  if (sig.length !== expected.length || !timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  const [id, planKey] = Buffer.from(body, "base64url").toString().split("|");
  return Number.isInteger(Number(id)) && planKey ? { opportunityId: Number(id), planKey } : null;
}

export const payLinkUrl = (opportunityId: number, planKey: string) => `${APP()}/pay/${signPayToken(opportunityId, planKey)}`;

/** Pick the plan that matches what we recommended to this prospect (by employee name), else null. */
export async function planForOpportunity(opp: { recommendedEmployees: unknown; suggestedOffer: string | null }) {
  const plans = await prisma.osPlan.findMany({ where: { orgId: ORG_ID, active: true } });
  const names = [...((opp.recommendedEmployees as string[] | null) ?? []), (opp.suggestedOffer ?? "").split(" — ")[0]].map((n) => n.toLowerCase()).filter(Boolean);
  return plans.find((p) => names.includes(p.name.toLowerCase())) ?? null;
}

export async function createPaymentLink(opportunityId: number, planKey: string, actor: { actor: string; actorType: "HUMAN" | "AI_AGENT" | "SYSTEM" | "WEBHOOK" }) {
  const [opp, plan] = await Promise.all([
    prisma.osOpportunity.findFirst({ where: { id: opportunityId, orgId: ORG_ID } }),
    prisma.osPlan.findUnique({ where: { orgId_key: { orgId: ORG_ID, key: planKey } } }),
  ]);
  if (!opp) throw new Error("Opportunity not found.");
  if (!plan || !plan.active) throw new Error(`Plan "${planKey}" does not exist or is inactive.`);
  const url = payLinkUrl(opportunityId, planKey);
  await audit({ ...actor, action: "payment.link_created", resource: "opportunity", resourceId: opportunityId, output: { plan: planKey, amountUsd: plan.amountCents / 100 } });
  return { url, plan: { key: plan.key, name: plan.name, amountUsd: plan.amountCents / 100, periodMonths: plan.periodMonths }, paystackConnected: paystackConfigured() };
}

/** Creates a fresh Paystack checkout for a verified pay token and returns where to send the buyer. */
export async function startCheckout(token: string, emailOverride?: string): Promise<{ url: string } | { needsEmail: true; plan: string } | { error: string }> {
  const t = verifyPayToken(token);
  if (!t) return { error: "This payment link is invalid." };
  if (!paystackConfigured()) return { error: "Online payment is not available right now. Please contact RaveSoft." };
  const [opp, plan] = await Promise.all([
    prisma.osOpportunity.findFirst({ where: { id: t.opportunityId, orgId: ORG_ID } }),
    prisma.osPlan.findUnique({ where: { orgId_key: { orgId: ORG_ID, key: t.planKey } } }),
  ]);
  if (!opp || !plan || !plan.active) return { error: "This offer is no longer available." };
  const email = (emailOverride ?? opp.contactEmail ?? "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { needsEmail: true, plan: plan.name };
  if (emailOverride && !opp.contactEmail) await prisma.osOpportunity.update({ where: { id: opp.id }, data: { contactEmail: email } });
  try {
    let planCode = plan.paystackPlanCode;
    if (!planCode) { try { planCode = await createPlan({ name: `${plan.name}${plan.periodMonths > 1 ? ` (${plan.periodMonths}-month)` : ""}`, amountUsdCents: plan.amountCents, periodMonths: plan.periodMonths }); await prisma.osPlan.update({ where: { id: plan.id }, data: { paystackPlanCode: planCode } }); } catch { planCode = null; /* unsupported interval → one-time charge */ } }
    const reference = `os-${opp.id}-${randomBytes(5).toString("hex")}`;
    const tx = await initializeTransaction({ email, amountUsdCents: plan.amountCents, reference, planCode, callbackUrl: `${APP()}/pay/thanks`, metadata: { opportunityId: opp.id, planKey: plan.key, company: opp.companyName } });
    await audit({ actor: "buyer", actorType: "WEBHOOK", action: "payment.checkout_started", resource: "opportunity", resourceId: opp.id, output: { plan: plan.key, reference } });
    return { url: tx.authorization_url };
  } catch (e) {
    return { error: e instanceof Error ? e.message.slice(0, 160) : "Could not start checkout." };
  }
}

/** Default sellable plans: one per AI-employee template (monthly). Prices are working assumptions until you edit them. */
export async function seedPlans(): Promise<number> {
  const { DEFAULT_TEMPLATES } = await import("./recommend");
  let created = 0;
  for (const t of DEFAULT_TEMPLATES) {
    const key = `${t.key}-employee-monthly`;
    if (await prisma.osPlan.findUnique({ where: { orgId_key: { orgId: ORG_ID, key } } })) continue;
    await prisma.osPlan.create({ data: { orgId: ORG_ID, key, name: t.name, description: t.description, businessUnit: "KOVABOT", revenueEngine: "SAAS", amountCents: t.monthlyPriceUsd * 100, periodMonths: 1, assumed: true } });
    created++;
  }
  return created;
}

// ── Paystack webhook handling ────────────────────────────────────────────────

interface PaystackData {
  reference?: string; status?: string; amount?: number; currency?: string; paid_at?: string;
  customer?: { email?: string; customer_code?: string; first_name?: string | null; last_name?: string | null };
  plan?: { plan_code?: string } | null; metadata?: { opportunityId?: number | string; planKey?: string; company?: string } | null;
  subscription_code?: string;
}

export interface PaystackHandled { handled: boolean; note: string }

/** Idempotent: charge.success is deduplicated by Paystack's transaction reference inside recordPayment. */
export async function handlePaystackEvent(ev: { event: string; data: PaystackData }): Promise<PaystackHandled> {
  const { raiseAlert } = await import("./alerts");
  const { recordPayment } = await import("./revenue");
  const { fromChargeMinor, chargeCurrency } = await import("./paystack");
  const actor = { actor: "webhook:paystack", actorType: "WEBHOOK" as const };
  const d = ev.data ?? {};
  const code = d.customer?.customer_code ?? null;
  const email = d.customer?.email?.toLowerCase() ?? null;

  const findCustomer = async () => (code ? prisma.osCustomer.findFirst({ where: { orgId: ORG_ID, billingRef: code } }) : null);

  if (ev.event === "charge.success") {
    if (d.status !== "success" || !d.reference) return { handled: false, note: "Ignored: not a successful charge." };
    const meta = d.metadata ?? {};
    const planByKey = meta.planKey ? await prisma.osPlan.findUnique({ where: { orgId_key: { orgId: ORG_ID, key: meta.planKey } } }) : null;
    const plan = planByKey ?? (d.plan?.plan_code ? await prisma.osPlan.findFirst({ where: { orgId: ORG_ID, paystackPlanCode: d.plan.plan_code } }) : null);
    const customer = await findCustomer();
    let opportunityId = meta.opportunityId ? Number(meta.opportunityId) : customer?.opportunityId ?? null;
    if (!opportunityId && !customer && email) opportunityId = (await prisma.osOpportunity.findFirst({ where: { orgId: ORG_ID, contactEmail: email } }))?.id ?? null;
    if (opportunityId && !(await prisma.osOpportunity.findFirst({ where: { id: opportunityId, orgId: ORG_ID } }))) opportunityId = null;

    // Money: trust the amount actually paid when it is in our charge currency; otherwise fall back to the plan price.
    const sameCurrency = (d.currency ?? "").toUpperCase() === chargeCurrency();
    const paidCents = d.amount && sameCurrency ? fromChargeMinor(d.amount) : plan?.amountCents ?? 0;
    if (paidCents <= 0) { await raiseAlert({ severity: "HIGH", category: "Financial Risk", title: "Paystack payment could not be valued", body: `Reference ${d.reference}, ${d.amount} ${d.currency}. Record it manually.`, dedupeKey: `ps-unvalued:${d.reference}` }); return { handled: false, note: "Could not determine amount." }; }
    if (plan && sameCurrency && paidCents < plan.amountCents * 0.98) await raiseAlert({ severity: "MEDIUM", category: "Financial Risk", title: `Underpayment on ${plan.name}`, body: `Paid $${(paidCents / 100).toFixed(2)} vs plan $${(plan.amountCents / 100).toFixed(2)} (ref ${d.reference}).`, dedupeKey: `ps-under:${d.reference}` });

    const when = d.paid_at ? new Date(d.paid_at) : new Date();
    const months = plan?.periodMonths ?? 1;
    const end = new Date(when); end.setUTCMonth(end.getUTCMonth() + months);
    const name = d.metadata?.company ?? ([d.customer?.first_name, d.customer?.last_name].filter(Boolean).join(" ") || email || "Paystack customer");
    const r = await recordPayment({ opportunityId: opportunityId ?? undefined, customerId: customer?.id, customerName: name, businessUnit: plan?.businessUnit, revenueEngine: plan?.revenueEngine, amountCents: paidCents, recurring: true, periodMonths: months, recurringEndsAt: end, description: plan?.name, source: "paystack", externalRef: d.reference, occurredAt: when }, actor);
    if (r.customerId && code) await prisma.osCustomer.updateMany({ where: { id: r.customerId, billingRef: null }, data: { billingRef: code } });
    if (!opportunityId && !customer) await raiseAlert({ severity: "HIGH", category: "Financial Risk", title: "Paystack payment from an unmatched payer", body: `${email ?? "unknown"} paid $${(paidCents / 100).toFixed(2)} (ref ${d.reference}). A customer was created from their email — review it.`, dedupeKey: `ps-unmatched:${d.reference}` });
    return { handled: true, note: r.duplicate ? "Duplicate (already recorded)." : "Payment recorded." };
  }

  if (ev.event === "subscription.disable" || ev.event === "subscription.not_renew") {
    const c = await findCustomer();
    await raiseAlert({ severity: "MEDIUM", category: "Customer Risk", title: `Subscription ${ev.event === "subscription.disable" ? "cancelled" : "will not renew"}: ${c?.name ?? email ?? "unknown customer"}`, body: "Revenue stops counting at the end of the paid period. Consider a win-back call.", dedupeKey: `ps-sub:${d.subscription_code ?? code}:${ev.event}` });
    if (c) { const { emit } = await import("./events"); await emit("customer.at_risk", { id: c.id, customerId: c.id, reasons: [ev.event] }); }
    return { handled: true, note: "Cancellation flagged." };
  }

  if (ev.event === "invoice.payment_failed") {
    const c = await findCustomer();
    if (c) await prisma.osCustomer.update({ where: { id: c.id }, data: { health: "RED", healthReasons: { reasons: ["Subscription payment failed"], missing: [] } as never } });
    await raiseAlert({ severity: "HIGH", category: "Financial Risk", title: `Subscription payment failed: ${c?.name ?? email ?? "unknown customer"}`, body: "Paystack will retry; contact the customer if it persists.", dedupeKey: `ps-fail:${d.subscription_code ?? code}:${new Date().toISOString().slice(0, 10)}` });
    return { handled: true, note: "Failed payment flagged." };
  }
  return { handled: false, note: `Event ${ev.event} not used.` };
}
