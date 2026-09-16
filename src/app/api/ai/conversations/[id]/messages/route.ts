import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { isRateLimited } from "@/lib/ai/rateLimit";
import { sendMessage } from "@/lib/services/conversation";
import { clientIp } from "../../../_shared";

const SendMessageSchema = z.object({
  message: z.string().min(1).max(4000),
  current_page: z.string().max(2048).nullish(),
});

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (isRateLimited(`message:${clientIp(request)}`)) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  const { id } = await params;
  const conversation = await prisma.conversation.findUnique({ where: { externalId: id } });

  if (!conversation) {
    return NextResponse.json({ error: "Conversation not found." }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const parsed = SendMessageSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request.", details: parsed.error.flatten() }, { status: 422 });
  }

  const result = await sendMessage(conversation, parsed.data.message, {
    currentPage: parsed.data.current_page ?? undefined,
  });

  return NextResponse.json({
    message: result.message,
    needs_human: result.needsHuman,
    ai_unavailable: result.aiUnavailable,
    cta: result.cta,
    contact_captured: result.contactCaptured,
  });
}
