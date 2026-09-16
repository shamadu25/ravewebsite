import { prisma } from "@/lib/prisma";
import { Tool } from "./types";

/**
 * Logs a human handoff request (spec §27/§28). Does not send a real
 * notification yet — no Slack/email/WhatsApp credentials are configured.
 * Wire a notifier here once those are available.
 */
export const EscalateHumanTool: Tool = {
  name: "EscalateHumanTool",

  async execute(input) {
    const conversationId = input.conversation_id;

    if (typeof conversationId !== "number") {
      throw new Error("conversation_id is required.");
    }

    const conversation = await prisma.conversation.update({
      where: { id: conversationId },
      data: { stage: "human_handoff" },
    });

    await prisma.conversionEvent.create({
      data: {
        contactId: conversation.contactId,
        conversationId: conversation.id,
        eventType: "human_handoff",
        metadata: { reason: typeof input.reason === "string" ? input.reason : null },
        occurredAt: new Date(),
      },
    });

    console.info("RaveSoft AI human handoff requested", {
      conversationId: conversation.id,
      reason: input.reason,
    });

    return { escalated: true };
  },
};
