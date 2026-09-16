import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { AI_CONFIG, QUICK_ACTIONS } from "@/lib/ai/config";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const conversation = await prisma.conversation.findUnique({ where: { externalId: id } });

  if (!conversation) {
    return NextResponse.json({ error: "Conversation not found." }, { status: 404 });
  }

  const messages = await prisma.message.findMany({
    where: { conversationId: conversation.id },
    orderBy: { id: "asc" },
  });

  return NextResponse.json({
    id: conversation.externalId,
    stage: conversation.stage,
    status: conversation.status,
    messages: messages.map((m) => ({
      id: m.id,
      role: m.role,
      content: m.content,
      created_at: m.createdAt.toISOString(),
    })),
    quick_actions: QUICK_ACTIONS,
    assistant_name: AI_CONFIG.assistantName,
    contact_captured: Boolean(conversation.contactId),
  });
}
