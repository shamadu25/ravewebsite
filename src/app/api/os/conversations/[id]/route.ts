import { z } from "zod";
import { api, jsonBody } from "@/lib/os/http";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/os/audit";
import { HUMAN_ACTIVE } from "@/lib/os/chats";
import { draftChatReply } from "@/lib/os/chatDraft";

type P = { id: string }; // conversation externalId

const Body = z.discriminatedUnion("action", [
  z.object({ action: z.literal("close") }),
  z.object({ action: z.literal("reopen") }),
  z.object({ action: z.literal("note"), note: z.string().trim().min(1).max(2000) }),
  z.object({ action: z.literal("reply"), message: z.string().trim().min(1).max(4000) }),
  z.object({ action: z.literal("resume_ai") }),
  z.object({ action: z.literal("assign"), assignee: z.string().trim().min(1).max(120).nullable() }),
  z.object({ action: z.literal("suggest") }),
]);

/** Admin actions on a live-chat conversation. Never edits or deletes visitor messages. */
export const POST = api<P>("customer.update", async ({ request, caller, params }) => {
  const body = await jsonBody(request, Body);
  const conversation = await prisma.conversation.findUnique({ where: { externalId: params.id } });
  if (!conversation) throw new Error("Conversation not found.");

  // Drafting touches nothing: the admin edits the draft and sends it with a normal "reply".
  if (body.action === "suggest") {
    try {
      return { message: "Draft ready — edit it before sending.", draft: await draftChatReply(params.id) };
    } catch (e) {
      throw new Error(e instanceof Error && /provider|configured|failed/i.test(e.message) ? "No AI provider is available to draft a reply right now." : "Could not draft a reply.");
    }
  }

  if (body.action === "assign") {
    await prisma.conversation.update({ where: { id: conversation.id }, data: { assignee: body.assignee } });
    await prisma.conversionEvent.create({
      data: {
        conversationId: conversation.id,
        contactId: conversation.contactId,
        eventType: "conversation_assigned",
        metadata: { by: caller.name, reason: body.assignee ? `assigned to ${body.assignee}` : "unassigned" },
        occurredAt: new Date(),
      },
    });
  } else if (body.action === "note") {
    await prisma.conversionEvent.create({
      data: {
        conversationId: conversation.id,
        contactId: conversation.contactId,
        eventType: "conversation_note",
        metadata: { note: body.note, by: caller.name },
        occurredAt: new Date(),
      },
    });
  } else if (body.action === "reply") {
    // A team reply is a real message in the visitor's chat window. While a human is active the AI
    // stays silent; the chat is handed back with "resume_ai" (or closed/reopened).
    await prisma.message.create({ data: { conversationId: conversation.id, role: "agent", content: body.message } });
    await prisma.conversation.update({
      where: { id: conversation.id },
      data: {
        status: HUMAN_ACTIVE,
        lastMessageAt: new Date(),
        agentTypingAt: null,
        // Answering a chat claims it unless someone already owns it; first reply time feeds response-time reporting.
        ...(conversation.assignee ? {} : { assignee: caller.name }),
        ...(conversation.firstAgentReplyAt ? {} : { firstAgentReplyAt: new Date() }),
      },
    });
    await prisma.conversionEvent.create({
      data: {
        conversationId: conversation.id,
        contactId: conversation.contactId,
        eventType: "agent_reply",
        metadata: { by: caller.name },
        occurredAt: new Date(),
      },
    });
  } else if (body.action === "resume_ai") {
    await prisma.conversation.update({ where: { id: conversation.id }, data: { status: "open" } });
    await prisma.conversionEvent.create({
      data: { conversationId: conversation.id, contactId: conversation.contactId, eventType: "ai_resumed", metadata: { by: caller.name }, occurredAt: new Date() },
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
  const done = { note: "Note saved.", reply: "Reply sent to the visitor.", resume_ai: "Handed back to the AI.", close: "Chat closed.", reopen: "Chat reopened.", assign: body.action === "assign" && body.assignee ? "Chat assigned." : "Chat unassigned." };
  return { message: done[body.action as keyof typeof done] };
});
