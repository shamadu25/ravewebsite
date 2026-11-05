import { prisma } from "@/lib/prisma";
import { sendHumanHandoffNotification } from "@/lib/mail/notifications";
import { sendSmsAlert } from "@/lib/sms/alerts";
import { inBackground } from "@/lib/services/teamAlerts";
import { Tool } from "./types";

/**
 * Logs a human handoff request (spec §27/§28) and emails the RaveSoft team
 * via the same SMTP configuration used for the contact form. WhatsApp/Slack
 * notifications can be added later once those integrations exist.
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
      include: { contact: true },
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

    const reason = typeof input.reason === "string" ? input.reason : null;
    const contactName = conversation.contact
      ? [conversation.contact.firstName, conversation.contact.lastName].filter(Boolean).join(" ") || null
      : null;

    await sendHumanHandoffNotification({
      conversationExternalId: conversation.externalId,
      contactName,
      reason,
    });

    inBackground(() => sendSmsAlert("human_handoff", { name: contactName, detail: reason ?? "A visitor asked for a human.", path: `/admin/conversations/${conversation.externalId}` }));

    console.info("RaveSoft AI human handoff requested", {
      conversationId: conversation.id,
      reason,
    });

    return { escalated: true };
  },
};
