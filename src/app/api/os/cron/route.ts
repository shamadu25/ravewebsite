import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { runHeartbeats, runOperatingLoop } from "@/lib/os/commander";
import { processQueue } from "@/lib/os/runtime";
import { audit } from "@/lib/os/audit";

export const maxDuration = 60;

function authorised(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false; // fail closed: no secret configured → endpoint disabled
  const given = Buffer.from(request.headers.get("authorization") ?? "");
  const want = Buffer.from(`Bearer ${secret}`);
  return given.length === want.length && timingSafeEqual(given, want);
}

/** Scheduler tick (Vercel Cron): operating loop → heartbeats → drain the queue. */
export async function GET(request: NextRequest) {
  if (!authorised(request)) return NextResponse.json({ error: "Unauthorised." }, { status: 401 });
  try {
    const loop = await runOperatingLoop();
    const heartbeats = await runHeartbeats();
    const queue = await processQueue({ budgetMs: 45_000 });
    return NextResponse.json({ ok: true, loop, heartbeats, queue });
  } catch (e) {
    await audit({ actor: "cron", actorType: "SYSTEM", action: "cron.tick", resource: "scheduler", result: "FAILURE", output: { error: e instanceof Error ? e.message : String(e) } });
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "tick failed" }, { status: 500 });
  }
}
