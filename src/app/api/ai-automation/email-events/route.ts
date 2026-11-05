import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { recordDeliveryEvent } from "@/lib/ai-automation/email/send";

/**
 * Delivery confirmations from your email provider (webhook). Body: {"messageId": "...", "event": "delivered" | "bounced"},
 * signed with header x-rave-signature = hex HMAC-SHA256(raw body, AI_EMAIL_WEBHOOK_SECRET). Fails closed without the secret.
 * This is the ONLY way an email is ever marked DELIVERED.
 */
export async function POST(request: NextRequest) {
  const secret = process.env.AI_EMAIL_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ error: "Not configured." }, { status: 503 });
  const raw = await request.text();
  const sig = Buffer.from(request.headers.get("x-rave-signature") ?? "", "hex");
  const want = createHmac("sha256", secret).update(raw).digest();
  if (sig.length !== want.length || !timingSafeEqual(sig, want)) return NextResponse.json({ error: "Bad signature." }, { status: 401 });
  let body: { messageId?: string; event?: string };
  try { body = JSON.parse(raw); } catch { return NextResponse.json({ error: "Bad body." }, { status: 400 }); }
  if (!body.messageId || (body.event !== "delivered" && body.event !== "bounced")) return NextResponse.json({ error: "Bad event." }, { status: 422 });
  return NextResponse.json({ ok: await recordDeliveryEvent(body.messageId, body.event) });
}
