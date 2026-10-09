import { createHmac, timingSafeEqual } from "crypto";

const base = () => process.env.PAYSTACK_BASE_URL ?? "https://api.paystack.co";
const key = () => process.env.PAYSTACK_SECRET_KEY ?? "";

export const paystackConfigured = () => !!key();
/** Currency Paystack charges in (your Paystack account decides what is enabled). USD prices convert at PAYSTACK_FX_RATE. */
export const chargeCurrency = () => (process.env.PAYSTACK_CURRENCY ?? "USD").toUpperCase();
export const fxRate = () => Math.max(0.0001, Number(process.env.PAYSTACK_FX_RATE ?? 1));

/** USD cents (our ledger currency) → minor units in the charge currency. */
export const toChargeMinor = (usdCents: number) => Math.round((usdCents / 100) * fxRate() * 100);
/** Minor units in the charge currency → USD cents. */
export const fromChargeMinor = (minor: number) => Math.round((minor / 100 / fxRate()) * 100);

/** Paystack signs webhooks with HMAC-SHA512 of the raw body using your secret key. */
export function verifyPaystackSignature(raw: string, signature: string | null): boolean {
  if (!key() || !signature) return false;
  const expected = createHmac("sha512", key()).update(raw).digest("hex");
  return expected.length === signature.length && timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  if (!paystackConfigured()) throw new Error("Paystack is not connected (set PAYSTACK_SECRET_KEY).");
  const res = await fetch(`${base()}${path}`, { ...init, headers: { Authorization: `Bearer ${key()}`, "Content-Type": "application/json", ...(init?.headers ?? {}) }, signal: AbortSignal.timeout(20_000) });
  const j = (await res.json().catch(() => ({}))) as { status?: boolean; message?: string; data?: T };
  if (!res.ok || j.status === false) throw new Error(j.message ?? `Paystack ${res.status}`);
  return j.data as T;
}

const INTERVALS: Record<number, string> = { 1: "monthly", 3: "quarterly", 6: "biannually", 12: "annually" };
export const paystackInterval = (months: number): string | null => INTERVALS[months] ?? null;

export async function createPlan(p: { name: string; amountUsdCents: number; periodMonths: number }): Promise<string> {
  const interval = paystackInterval(p.periodMonths);
  if (!interval) throw new Error(`Paystack has no ${p.periodMonths}-month interval; use 1, 3, 6 or 12.`);
  const d = await call<{ plan_code: string }>("/plan", { method: "POST", body: JSON.stringify({ name: p.name, amount: toChargeMinor(p.amountUsdCents), interval, currency: chargeCurrency() }) });
  return d.plan_code;
}

export async function initializeTransaction(t: { email: string; amountUsdCents: number; reference: string; callbackUrl: string; planCode?: string | null; metadata: Record<string, unknown> }) {
  return call<{ authorization_url: string; reference: string }>("/transaction/initialize", {
    method: "POST",
    body: JSON.stringify({ email: t.email, amount: toChargeMinor(t.amountUsdCents), currency: chargeCurrency(), reference: t.reference, callback_url: t.callbackUrl, metadata: t.metadata, ...(t.planCode ? { plan: t.planCode } : {}) }),
  });
}

export async function verifyTransaction(reference: string) {
  return call<{ status: string; amount: number; currency: string; reference: string }>(`/transaction/verify/${encodeURIComponent(reference)}`);
}
