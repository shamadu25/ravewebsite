import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { z } from "zod";
import { recordPayment } from "@/lib/os/revenue";
import { audit } from "@/lib/os/audit";
import "@/lib/os/runtime";

const Payload = z.object({
  externalRef: z.string().min(1).max(120), amountCents: z.number().int().positive(), recurring: z.boolean().default(true),
  opportunityId: z.number().int().optional(), customerName: z.string().max(200).optional(), businessUnit: z.string().optional(), description: z.string().max(300).optional(),
});

/** Signed payment events (provider → RaveSoft). HMAC-SHA256 of the raw body in `x-rave-signature`. Fails closed without a secret. */
export async function POST(request: NextRequest) {
  const secret = process.env.PAYMENTS_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ error: "Payments webhook is not configured." }, { status: 503 });
  const raw = await request.text();
  const expected = createHmac("sha256", secret).update(raw).digest("hex");
  const given = request.headers.get("x-rave-signature") ?? "";
  const ok = given.length === expected.length && timingSafeEqual(Buffer.from(given), Buffer.from(expected));
  if (!ok) {
    await audit({ actor: "webhook:payment", actorType: "WEBHOOK", action: "webhook.rejected", resource: "payment", result: "DENIED" });
    return NextResponse.json({ error: "Invalid signature." }, { status: 401 });
  }
  const parsed = Payload.safeParse(JSON.parse(raw || "{}"));
  if (!parsed.success) return NextResponse.json({ error: "Invalid payload." }, { status: 422 });
  try {
    const r = await recordPayment({ ...parsed.data, source: "webhook" }, { actor: "webhook:payment", actorType: "WEBHOOK" });
    return NextResponse.json({ ok: true, duplicate: r.duplicate, customerId: r.customerId });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "failed" }, { status: 400 });
  }
}
