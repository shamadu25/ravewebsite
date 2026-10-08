import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { ProductEvent, ingestProductBatch, type IngestResult, type ProductEventInput } from "@/lib/os/products";
import { audit } from "@/lib/os/audit";
import "@/lib/os/runtime";

export const maxDuration = 60;

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
  const results: IngestResult[] = batch.map(() => ({ ok: false, error: "Invalid event." }));
  const valid: Array<{ i: number; e: ProductEventInput }> = [];
  batch.forEach((item, i) => {
    const parsed = ProductEvent.safeParse(item);
    if (parsed.success) valid.push({ i, e: parsed.data });
    else { const issue = parsed.error.issues[0]; results[i] = { ok: false, error: `Invalid event: ${issue.path.join(".") || "(root)"} — ${issue.message}` }; }
  });
  try {
    const done = await ingestProductBatch(valid.map((v) => v.e));
    valid.forEach((v, k) => { results[v.i] = done[k]; });
  } catch (e) {
    valid.forEach((v) => { results[v.i] = { ok: false, error: e instanceof Error ? e.message.slice(0, 200) : "failed" }; });
  }
  return NextResponse.json({ ok: results.every((r) => r.ok), results });
}
