"use client";

import { useState } from "react";

export default function PayForm({ token, defaultEmail, amountLabel }: { token: string; defaultEmail: string; amountLabel: string }) {
  const [email, setEmail] = useState(defaultEmail);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function go(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setError(null);
    try {
      const res = await fetch("/api/os/pay/start", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, email }) });
      const j = await res.json().catch(() => null);
      if (res.ok && j?.url) { window.location.href = j.url; return; }
      setError(j?.error ?? "We couldn't start the payment. Please try again.");
    } catch { setError("Network error. Please check your connection and try again."); }
    setBusy(false);
  }

  return (
    <form onSubmit={go} className="mt-6 space-y-4">
      <label className="block text-sm"><span className="mb-1 block font-medium text-slate-700">Your email (for your receipt and account)</span>
        <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-base outline-none focus:border-violet-600" /></label>
      <button disabled={busy} className="h-12 w-full rounded-xl bg-violet-700 text-base font-semibold text-white transition hover:bg-violet-800 disabled:opacity-60">{busy ? "Opening secure checkout…" : `Pay ${amountLabel} securely`}</button>
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      <p className="text-center text-xs text-slate-500">Payments are processed by Paystack. RaveSoft never sees your card details.</p>
    </form>
  );
}
