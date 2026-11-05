import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { isRateLimited, rateLimit } from "@/lib/ai/rateLimit";
import { buildVisitorTranscript } from "@/lib/os/chats";
import { chatLang } from "@/lib/ai/i18n";
import { sendTranscriptToVisitor } from "@/lib/mail/notifications";
import { clientIp } from "../../../_shared";

const FeedbackSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().max(1000).nullish(),
  email: z.string().trim().email().max(254).nullish(),
  send_transcript: z.boolean().nullish(),
});

/**
 * End-of-chat feedback: a 1-5 rating and an optional comment, plus an optional emailed copy of the chat.
 * The email doubles as a contact-capture point for visitors who never shared details. The transcript is
 * only ever sent once per chat, and to the contact's address when we already have one, so this cannot be
 * used to mail arbitrary addresses repeatedly.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (isRateLimited(`feedback:${clientIp(request)}`) || rateLimit(`feedback-conv:${id}`, 6, 10 * 60_000)) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  const parsed = FeedbackSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request." }, { status: 422 });
  const { rating, comment, email, send_transcript } = parsed.data;

  const conversation = await prisma.conversation.findUnique({ where: { externalId: id }, include: { contact: true } });
  if (!conversation) return NextResponse.json({ error: "Conversation not found." }, { status: 404 });

  await prisma.conversation.update({
    where: { id: conversation.id },
    data: { rating, ratingComment: comment || null, ratedAt: new Date() },
  });
  await prisma.conversionEvent.create({
    data: {
      conversationId: conversation.id,
      contactId: conversation.contactId,
      eventType: "chat_feedback",
      metadata: { rating, hasComment: Boolean(comment) },
      occurredAt: new Date(),
    },
  });

  let transcriptSent = false;
  if (send_transcript && !conversation.transcriptEmailedAt) {
    let contact = conversation.contact;
    if (!contact && email) {
      contact = await prisma.contact.create({ data: { email, consentEmail: true } });
      await prisma.conversation.update({ where: { id: conversation.id }, data: { contactId: contact.id } });
      await prisma.conversionEvent.create({
        data: { conversationId: conversation.id, contactId: contact.id, eventType: "contact_captured_feedback", occurredAt: new Date() },
      });
    } else if (contact && !contact.email && email) {
      contact = await prisma.contact.update({ where: { id: contact.id }, data: { email, consentEmail: true } });
    }

    const to = contact?.email ?? null;
    if (to) {
      const messages = await prisma.message.findMany({ where: { conversationId: conversation.id }, orderBy: { id: "asc" } });
      const text = buildVisitorTranscript(
        messages.map((m) => ({ role: m.role, content: m.content, createdAt: m.createdAt })),
        chatLang(conversation.language)
      );
      // Claim the single send before mailing so a double-click cannot send twice.
      const claimed = await prisma.conversation.updateMany({
        where: { id: conversation.id, transcriptEmailedAt: null },
        data: { transcriptEmailedAt: new Date() },
      });
      if (claimed.count === 1) {
        transcriptSent = await sendTranscriptToVisitor(to, text);
        if (!transcriptSent) {
          await prisma.conversation.update({ where: { id: conversation.id }, data: { transcriptEmailedAt: null } });
        }
      }
    }
  }

  return NextResponse.json({ ok: true, transcript_sent: transcriptSent });
}
