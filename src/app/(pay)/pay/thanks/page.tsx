import { paystackConfigured, verifyTransaction } from "@/lib/os/paystack";

export const dynamic = "force-dynamic";

/** Landing page after Paystack. It states only what Paystack's API confirms — the webhook, not this page, activates the account. */
export default async function Thanks({ searchParams }: { searchParams: Promise<{ reference?: string; trxref?: string }> }) {
  const sp = await searchParams;
  const ref = sp.reference ?? sp.trxref;
  let confirmed: boolean | null = null;
  if (ref && paystackConfigured()) { try { confirmed = (await verifyTransaction(ref)).status === "success"; } catch { confirmed = null; } }
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-5 py-10">
      <div className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
        <h1 className="text-2xl font-semibold">{confirmed ? "Payment confirmed — thank you!" : confirmed === false ? "We haven't received your payment" : "Thank you"}</h1>
        <p className="mt-3 text-sm text-slate-600">
          {confirmed ? "Your subscription is being set up. We'll email you within one business day to start onboarding your AI employee." : confirmed === false ? "Paystack reports this payment was not completed. You have not been charged. Please try your link again or contact us on WhatsApp +233 53 156 1484." : "If you completed payment, we'll confirm by email shortly. Questions? WhatsApp +233 53 156 1484."}
        </p>
        {ref && <p className="mt-4 text-xs text-slate-400">Reference: {ref}</p>}
      </div>
    </main>
  );
}
