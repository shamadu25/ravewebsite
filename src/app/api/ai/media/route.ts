import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isRateLimited } from "@/lib/ai/rateLimit";
import { MAX_MEDIA_BYTES, mediaToMessage, understandMedia, validateMedia } from "@/lib/os/media";
import { clientIp } from "../_shared";

export const maxDuration = 60;
const DAILY_CAP = Math.max(10, Number(process.env.MEDIA_DAILY_CAP ?? 200));

/** Daily ceiling on public voice/photo reads so a bot or abuser cannot run up the model bill. */
async function underDailyCap(): Promise<boolean> {
  const key = `media_count:${new Date().toISOString().slice(0, 10)}`;
  const row = await prisma.systemSetting.findUnique({ where: { key } });
  const n = typeof row?.value === "number" ? row.value : 0;
  if (n >= DAILY_CAP) return false;
  await prisma.systemSetting.upsert({ where: { key }, create: { key, value: n + 1 }, update: { value: n + 1 } });
  return true;
}

/**
 * Public: a website visitor sends a voice note or photo to Ama. We turn it into text and return it; the browser then
 * sends that text as a normal chat message. The file itself is NEVER stored.
 */
export async function POST(request: NextRequest) {
  if (isRateLimited(`media:${clientIp(request)}`)) return NextResponse.json({ error: "Too many requests. Please wait a minute." }, { status: 429 });
  if (Number(request.headers.get("content-length") ?? 0) > MAX_MEDIA_BYTES + 50_000) return NextResponse.json({ error: "File too large (max 4 MB)." }, { status: 413 });

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  const conversationId = String(form?.get("conversationId") ?? "");
  if (!(file instanceof File) || !conversationId) return NextResponse.json({ error: "Invalid request." }, { status: 422 });

  // Only people who already have a chat conversation can use it.
  if (!(await prisma.conversation.findUnique({ where: { externalId: conversationId }, select: { id: true } }))) return NextResponse.json({ error: "Conversation not found." }, { status: 404 });

  const v = validateMedia(file.type, file.size);
  if ("error" in v) return NextResponse.json({ error: v.error }, { status: 422 });
  if (!(await underDailyCap())) return NextResponse.json({ error: "Voice and photo messages are paused for today. Please type your message instead." }, { status: 503 });

  try {
    const r = await understandMedia(v.kind, file.type, Buffer.from(await file.arrayBuffer()));
    return NextResponse.json({ ok: true, kind: v.kind, text: mediaToMessage(v.kind, r) });
  } catch {
    return NextResponse.json({ error: "Sorry, I couldn't read that. Please try again or type your message." }, { status: 502 });
  }
}
