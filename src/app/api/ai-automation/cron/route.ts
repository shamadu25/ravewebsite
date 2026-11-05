import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { aiAutomationTick } from "@/lib/ai-automation/handlers";

export const maxDuration = 60;

function authorised(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false; // fail closed
  const given = Buffer.from(request.headers.get("authorization") ?? "");
  const want = Buffer.from(`Bearer ${secret}`);
  return given.length === want.length && timingSafeEqual(given, want);
}

/** Scheduler tick: drain the job queue (with retries), expire proposals, send due follow-ups. Idempotent. */
export async function GET(request: NextRequest) {
  if (!authorised(request)) return NextResponse.json({ error: "Unauthorised." }, { status: 401 });
  try { return NextResponse.json({ ok: true, ...(await aiAutomationTick(45_000)) }); }
  catch (e) { return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "tick failed" }, { status: 500 }); }
}
