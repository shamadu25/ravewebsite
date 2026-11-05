import { NextRequest, NextResponse, after } from "next/server";
import { submitAssessment } from "@/lib/ai-automation/intake";
import { aiAutomationTick } from "@/lib/ai-automation/handlers";
import { clientIp } from "@/app/api/ai/_shared";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  if (JSON.stringify(body).length > 60_000) return NextResponse.json({ error: "Request too large." }, { status: 413 });
  let out;
  try { out = await submitAssessment(body, { ip: clientIp(request) }); }
  catch (e) {
    console.error("[ai-automation] submit failed", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "We couldn't save your assessment. Please try again in a moment." }, { status: 500 });
  }
  if (!out.ok) return NextResponse.json({ error: out.error, fieldErrors: out.fieldErrors, stage: out.stage }, { status: out.status });
  // Analysis → pricing → proposal draft run after the response so the customer is never kept waiting.
  if (!out.duplicate && !out.silent) after(async () => { try { await aiAutomationTick(50_000); } catch (e) { console.error("[ai-automation] background tick failed", e instanceof Error ? e.message : e); } });
  return NextResponse.json({ ok: true, reference: out.publicRef, duplicate: out.duplicate }, { status: 201 });
}
