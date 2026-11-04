import { z } from "zod";
import { api, jsonBody } from "@/lib/os/http";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/os/audit";

type P = { id: string }; // conversation externalId

const Body = z.discriminatedUnion("action", [
  z.object({ action: z.literal("close") }),
  z.object({ action: z.literal("reopen") }),
  z.object({ action: z.literal("note"), note: z.string().trim().min(1).max(2000) }),
]);

/** Admin actions on a live-chat conversation. Never edits or deletes visitor messages. */
export const POST = api<P>("customer.update", async ({ request, caller, params }) => {
  const body = await jsonBody(request, Body);
  const conversation = await prisma.conversation.findUnique({ where: { externalId: params.id } });
  if (!conversation) throw new Error("Conversation not found.");

  if (body.action === "note") {
    await prisma.conversionEvent.create({
      data: {
        conversationId: conversation.id,
        contactId: conversation.contactId,
        eventType: "conversation_note",
        metadata: { note: body.note, by: caller.name },
        occurredAt: new Date(),
      },
    });
  } else {
    await prisma.conversation.update({
      where: { id: conversation.id },
      data: { status: body.action === "close" ? "closed" : "open" },
    });
    await prisma.conversionEvent.create({
      data: {
        conversationId: conversation.id,
        contactId: conversation.contactId,
        eventType: body.action === "close" ? "conversation_closed" : "conversation_reopened",
        metadata: { by: caller.name },
        occurredAt: new Date(),
      },
    });
  }

  await audit({
    actor: caller.name,
    actorType: "HUMAN",
    action: `conversation.${body.action}`,
    resource: "conversation",
    resourceId: conversation.id,
    ip: caller.ip,
  });
  return { message: body.action === "note" ? "Note saved." : body.action === "close" ? "Chat closed." : "Chat reopened." };
});
