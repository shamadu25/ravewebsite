import { NextRequest, NextResponse } from "next/server";
import { parseEvent, recordEvent } from "@/lib/ai-automation/events";
import { rateLimit } from "@/lib/ai/rateLimit";
import { clientIp } from "@/app/api/ai/_shared";

/** Anonymous funnel beacon. Stores no IP/cookie/PII; rate limited; unknown event names are dropped. */
export async function POST(request: NextRequest) {
  if (rateLimit(`ai-events:${clientIp(request)}`, 120, 60_000)) return new NextResponse(null, { status: 204 });
  const body = await request.json().catch(() => null);
  const ev = parseEvent(body);
  if (ev) await recordEvent(ev).catch(() => undefined);
  return new NextResponse(null, { status: 204 });
}
