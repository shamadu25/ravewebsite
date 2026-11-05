import { NextRequest, NextResponse } from "next/server";
import { optOutByToken } from "@/lib/ai-automation/privacy";

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as { token?: string } | null;
  const ok = await optOutByToken(String(body?.token ?? ""));
  return NextResponse.json(ok ? { ok: true } : { error: "This link is invalid or has expired." }, { status: ok ? 200 : 400 });
}
