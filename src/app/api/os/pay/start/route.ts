import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { startCheckout } from "@/lib/os/payments";
import { isRateLimited } from "@/lib/ai/rateLimit";

/** Public (the buyer is not logged in). Authorised only by the signed token in the pay link. */
export async function POST(request: NextRequest) {
  if (isRateLimited(`pay:${request.headers.get("x-forwarded-for")?.split(",")[0] ?? "?"}`)) return NextResponse.json({ error: "Too many attempts. Please wait a minute." }, { status: 429 });
  const b = z.object({ token: z.string().min(10).max(300), email: z.string().email().max(190).optional() }).safeParse(await request.json().catch(() => null));
  if (!b.success) return NextResponse.json({ error: "Please enter a valid email address." }, { status: 422 });
  const r = await startCheckout(b.data.token, b.data.email);
  if ("url" in r) return NextResponse.json({ ok: true, url: r.url });
  if ("needsEmail" in r) return NextResponse.json({ error: "Please enter your email address to continue." }, { status: 422 });
  return NextResponse.json({ error: r.error }, { status: 400 });
}
