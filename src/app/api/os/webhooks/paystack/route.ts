import { NextRequest, NextResponse } from "next/server";
import { verifyPaystackSignature } from "@/lib/os/paystack";
import { handlePaystackEvent } from "@/lib/os/payments";
import { audit } from "@/lib/os/audit";
import "@/lib/os/runtime";

export const maxDuration = 60;

/** Paystack → RaveSoft. Signature = HMAC-SHA512 of the raw body with your secret key. Fails closed when unconfigured. */
export async function POST(request: NextRequest) {
  if (!process.env.PAYSTACK_SECRET_KEY) return NextResponse.json({ error: "Paystack is not configured." }, { status: 503 });
  const raw = await request.text();
  if (!verifyPaystackSignature(raw, request.headers.get("x-paystack-signature"))) {
    await audit({ actor: "webhook:paystack", actorType: "WEBHOOK", action: "webhook.rejected", resource: "paystack", result: "DENIED" });
    return NextResponse.json({ error: "Invalid signature." }, { status: 401 });
  }
  let ev: { event: string; data: never };
  try { ev = JSON.parse(raw); } catch { return NextResponse.json({ error: "Invalid JSON." }, { status: 400 }); }
  try {
    const r = await handlePaystackEvent(ev);
    await audit({ actor: "webhook:paystack", actorType: "WEBHOOK", action: "paystack.event", resource: "paystack", input: { event: ev.event }, output: r });
    return NextResponse.json({ ok: true, ...r });
  } catch (e) {
    // 500 makes Paystack retry — a real payment must never be silently dropped.
    await audit({ actor: "webhook:paystack", actorType: "WEBHOOK", action: "paystack.event", resource: "paystack", input: { event: ev.event }, result: "FAILURE", output: { error: e instanceof Error ? e.message : "failed" } });
    return NextResponse.json({ error: "Processing failed; please retry." }, { status: 500 });
  }
}
