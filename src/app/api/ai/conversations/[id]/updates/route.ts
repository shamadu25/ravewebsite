import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isRateLimited } from "@/lib/ai/rateLimit";
import { HUMAN_ACTIVE } from "@/lib/os/chats";

/**
 * Lightweight poll for the chat widget: returns only messages written by the team (role "agent")
 * after the given message id, plus whether a human is currently handling the chat. The conversation
 * id is an unguessable UUID, the same capability the widget already uses to load its own chat.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (isRateLimited(`poll:${id}`)) return NextResponse.json({ error: "Too many requests." }, { status: 429 });

  const conversation = await prisma.conversation.findUnique({ where: { externalId: id }, select: { id: true, status: true } });
  if (!conversation) return NextResponse.json({ error: "Conversation not found." }, { status: 404 });

  const afterParam = Number(request.nextUrl.searchParams.get("after") ?? 0);
  const after = Number.isInteger(afterParam) && afterParam > 0 ? afterParam : 0;

  const rows = await prisma.message.findMany({
    where: { conversationId: conversation.id, role: "agent", id: { gt: after } },
    orderBy: { id: "asc" },
    take: 50,
  });

  return NextResponse.json(
    {
      messages: rows.map((m) => ({ id: m.id, role: m.role, content: m.content, created_at: m.createdAt.toISOString() })),
      human_active: conversation.status === HUMAN_ACTIVE,
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
