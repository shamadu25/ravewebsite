import { NextRequest, NextResponse } from "next/server";
import { isRateLimited } from "@/lib/ai/rateLimit";
import { parseAfter, readLiveUpdates } from "@/lib/ai/liveUpdates";

export const dynamic = "force-dynamic";

/**
 * Polling fallback for the chat widget (the primary path is the SSE stream next to this route): returns
 * team replies written after the given message id, plus whether a human is handling the chat, whether the
 * team is typing, and whether the chat was closed. The conversation id is an unguessable UUID, the same
 * capability the widget already uses to load its own chat.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (isRateLimited(`poll:${id}`)) return NextResponse.json({ error: "Too many requests." }, { status: 429 });

  const updates = await readLiveUpdates(id, parseAfter(request.nextUrl.searchParams.get("after")));
  if (!updates) return NextResponse.json({ error: "Conversation not found." }, { status: 404 });

  return NextResponse.json(updates, { headers: { "Cache-Control": "no-store" } });
}
