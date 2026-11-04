import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCaller } from "@/lib/os/http";
import { can } from "@/lib/os/rbac";
import { buildTranscript, contactName } from "@/lib/os/chats";

/** Downloads a full plain-text transcript of one chat (admin only). */
export async function GET(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const caller = await getCaller(request);
  if (!caller) return NextResponse.json({ error: "Unauthenticated." }, { status: 401 });
  if (!can(caller.role, "customer.read")) return NextResponse.json({ error: "Missing permission customer.read." }, { status: 403 });

  const { id } = await ctx.params;
  const conversation = await prisma.conversation.findUnique({
    where: { externalId: id },
    include: { contact: true, messages: { orderBy: { id: "asc" } } },
  });
  if (!conversation) return NextResponse.json({ error: "Conversation not found." }, { status: 404 });

  const text = buildTranscript(
    {
      externalId: conversation.externalId,
      visitor: contactName(conversation.contact) ?? "Anonymous visitor",
      contact: conversation.contact?.email ?? conversation.contact?.whatsapp ?? conversation.contact?.phone ?? null,
      startedAt: conversation.createdAt,
      landingPage: conversation.landingPage,
    },
    conversation.messages
  );
  return new NextResponse(text, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": `attachment; filename="chat-${conversation.externalId}.txt"`,
      "Cache-Control": "no-store",
    },
  });
}
