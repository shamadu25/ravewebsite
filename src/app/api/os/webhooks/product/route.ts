import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { ProductEvent, ingestProductEvent } from "@/lib/os/products";
import { audit } from "@/lib/os/audit";
import "@/lib/os/runtime";

/** Product lifecycle events from CliqPOS / KOVABOT / HMS / Restovax. HMAC-SHA256 of the raw body in `x-rave-signature`. */
export async function POST(request: NextRequest) {
  const secret = process.env.PRODUCT_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ error: "Product webhook is not configured." }, { status: 503 });
  const raw = await request.text();
  const expected = createHmac("sha256", secret).update(raw).digest("hex");
  const given = request.headers.get("x-rave-signature") ?? "";
  if (given.length !== expected.length || !timingSafeEqual(Buffer.from(given), Buffer.from(expected))) {
    await audit({ actor: "webhook:product", actorType: "WEBHOOK", action: "webhook.rejected", resource: "product_event", result: "DENIED" });
    return NextResponse.json({ error: "Invalid signature." }, { status: 401 });
  }
  let json: unknown;
  try { json = JSON.parse(raw); } catch { return NextResponse.json({ error: "Invalid JSON." }, { status: 400 }); }
  const batch = Array.isArray(json) ? json.slice(0, 100) : [json];
  const results = [];
  for (const item of batch) {
    const parsed = ProductEvent.safeParse(item);
    if (!parsed.success) { results.push({ ok: false, error: "Invalid event." }); continue; }
    try { results.push({ ok: true, ...(await ingestProductEvent(parsed.data)) }); } catch (e) { results.push({ ok: false, error: e instanceof Error ? e.message : "failed" }); }
  }
  return NextResponse.json({ ok: results.every((r) => r.ok), results });
}
