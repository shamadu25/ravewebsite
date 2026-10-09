import { prisma } from "@/lib/prisma";
import { ORG_ID } from "@/lib/os/constants";
import { verifyPayToken } from "@/lib/os/payments";
import { chargeCurrency, fxRate, paystackConfigured, toChargeMinor } from "@/lib/os/paystack";
import PayForm from "./PayForm";

export const dynamic = "force-dynamic";

function Shell({ children }: { children: React.ReactNode }) {
  return <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-5 py-10"><p className="mb-6 text-center text-sm font-semibold tracking-wide text-violet-700">RaveSoft Digital Solutions</p><div className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">{children}</div></main>;
}

export default async function PayPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const t = verifyPayToken(token);
  const [opp, plan] = t ? await Promise.all([
    prisma.osOpportunity.findFirst({ where: { id: t.opportunityId, orgId: ORG_ID } }),
    prisma.osPlan.findUnique({ where: { orgId_key: { orgId: ORG_ID, key: t.planKey } } }),
  ]) : [null, null];

  if (!t || !opp || !plan || !plan.active) return <Shell><h1 className="text-xl font-semibold">This link isn&apos;t valid</h1><p className="mt-2 text-sm text-slate-600">It may have expired or been changed. Please reply to the email you received and we&apos;ll send a fresh link.</p></Shell>;
  if (!paystackConfigured()) return <Shell><h1 className="text-xl font-semibold">Online payment isn&apos;t available yet</h1><p className="mt-2 text-sm text-slate-600">Please contact RaveSoft on WhatsApp +233 53 156 1484 and we&apos;ll complete your order directly.</p></Shell>;

  const usd = plan.amountCents / 100;
  const per = plan.periodMonths === 1 ? "month" : plan.periodMonths === 12 ? "year" : `${plan.periodMonths} months`;
  const local = fxRate() !== 1 || chargeCurrency() !== "USD" ? ` (charged as ${chargeCurrency()} ${(toChargeMinor(plan.amountCents) / 100).toLocaleString()})` : "";
  return (
    <Shell>
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Order summary · {opp.companyName}</p>
      <h1 className="mt-1 text-2xl font-semibold">{plan.name}</h1>
      {plan.description && <p className="mt-2 text-sm text-slate-600">{plan.description}</p>}
      <p className="mt-5 text-3xl font-semibold tabular-nums">${usd.toLocaleString()}<span className="text-base font-normal text-slate-500"> / {per}</span></p>
      <p className="mt-1 text-xs text-slate-500">Recurring subscription{local}. Cancel any time by contacting us.</p>
      <PayForm token={token} defaultEmail={opp.contactEmail ?? ""} amountLabel={`$${usd.toLocaleString()}`} />
    </Shell>
  );
}
