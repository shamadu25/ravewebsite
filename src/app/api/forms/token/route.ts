import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/lib/ai/rateLimit";
import { issueFormToken } from "@/lib/antispam/formToken";
import { clientIp } from "../../ai/_shared";

/** Issues a signed time-trap token for public forms. Cheap, but limited so it cannot be farmed. */
export async function GET(request: NextRequest) {
  if (rateLimit(`form-token:${clientIp(request)}`, 30, 60_000)) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }
  return NextResponse.json({ token: issueFormToken() }, { headers: { "Cache-Control": "no-store" } });
}
