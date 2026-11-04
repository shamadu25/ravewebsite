import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { AI_CONFIG, normalizeCta } from "@/lib/ai/config";
import { runRaveConciergeAgent } from "@/lib/ai/agent/raveConcierge";
import { AiProviderUnavailableError } from "@/lib/ai/providers/types";
import { sendHumanHandoffNotification } from "@/lib/mail/notifications";
import type { Conversation } from "@prisma/client";

const AI_FALLBACK_MESSAGE =
  "Our AI assistant is temporarily unavailable. Leave your name and WhatsApp number and the RaveSoft team will contact you.";

export interface StartConversationInput {
  visitorId: string;
  currentPage?: string;
  landingPage?: string;
  referrer?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  utmTerm?: string;
  device?: string;
  browser?: string;
  language?: string;
}

export async function startConversation(input: StartConversationInput): Promise<Conversation> {
  const visitor = await prisma.visitor.upsert({
    where: { externalId: input.visitorId },
    update: { sessionsCount: { increment: 1 }, lastSeenAt: new Date() },
    create: {
      externalId: input.visitorId,
      firstSeenAt: new Date(),
      lastSeenAt: new Date(),
      sessionsCount: 1,
    },
  });

  await prisma.visitorSession.create({
    data: {
      visitorId: visitor.id,
      landingPage: input.landingPage ?? input.currentPage,
      currentPage: input.currentPage,
      referrer: input.referrer,
      utmSource: input.utmSource,
      utmMedium: input.utmMedium,
      utmCampaign: input.utmCampaign,
      utmContent: input.utmContent,
      utmTerm: input.utmTerm,
      device: input.device,
      browser: input.browser,
      language: input.language,
      startedAt: new Date(),
    },
  });

  // The /ai-agents/demo showcase hits this same endpoint — tag its
  // conversations so they don't read as real leads in the admin CRM.
  const originPage = input.landingPage ?? input.currentPage ?? "";
  const channel = originPage.startsWith("/ai-agents/demo") ? "demo" : "website";

  const conversation = await prisma.conversation.create({
    data: {
      externalId: randomUUID(),
      visitorId: visitor.id,
      channel,
      stage: "new",
      status: "open",
      landingPage: input.landingPage ?? input.currentPage,
      currentPage: input.currentPage,
      lastMessageAt: new Date(),
    },
  });

  const opener = contextualOpener(input.currentPage);

  await prisma.message.create({
    data: { conversationId: conversation.id, role: "assistant", content: opener },
  });

  return conversation;
}

export interface SendMessageResult {
  message: string;
  needsHuman: boolean;
  aiUnavailable: boolean;
  cta: string;
  contactCaptured: boolean;
}

export async function sendMessage(
  conversation: Conversation,
  text: string,
  context: { currentPage?: string } = {}
): Promise<SendMessageResult> {
  await prisma.message.create({
    data: { conversationId: conversation.id, role: "visitor", content: text },
  });

  // Surface the chat in the admin the moment the visitor writes, not only after the AI
  // answers, so a failing AI call can never leave a visitor message sitting unseen.
  // A visitor writing into a chat that was closed reopens it.
  await prisma.conversation.update({
    where: { id: conversation.id },
    data: {
      lastMessageAt: new Date(),
      ...(context.currentPage ? { currentPage: context.currentPage } : {}),
      ...(conversation.status === "closed" ? { status: "open" } : {}),
    },
  });

  const historyRows = await prisma.message.findMany({
    where: { conversationId: conversation.id },
    orderBy: { id: "asc" },
  });

  const history = historyRows.map((m) => ({
    role: (m.role === "visitor" ? "user" : "assistant") as "user" | "assistant",
    content: m.content,
  }));

  let structured;
  try {
    structured = await runRaveConciergeAgent(conversation.id, history, {
      currentPage: context.currentPage ?? conversation.currentPage,
      landingPage: conversation.landingPage,
    });
  } catch (error) {
    // Any agent failure (provider outage OR an unexpected error) is handled the same way:
    // the visitor message is already saved, the visitor gets the fallback, and the team is
    // alerted — never a silent 500.
    if (error instanceof AiProviderUnavailableError) {
      console.warn("RaveSoft AI unavailable, returning fallback", error.message);
    } else {
      console.error("RaveSoft AI agent failed, returning fallback", error);
    }

    await prisma.message.create({
      data: { conversationId: conversation.id, role: "assistant", content: AI_FALLBACK_MESSAGE },
    });
    await prisma.conversation.update({
      where: { id: conversation.id },
      data: { status: "human_handoff", lastMessageAt: new Date() },
    });

    // Alert once per handoff (not on every follow-up message while the AI is down).
    if (conversation.status !== "human_handoff") {
      await notifyAiFailure(conversation, error);
    }

    return {
      message: AI_FALLBACK_MESSAGE,
      needsHuman: true,
      aiUnavailable: true,
      cta: "human_handoff",
      contactCaptured: Boolean(conversation.contactId),
    };
  }

  await prisma.message.create({
    data: {
      conversationId: conversation.id,
      role: "assistant",
      content: structured.message,
      structuredOutput: structured as unknown as object,
    },
  });

  await prisma.conversation.update({
    where: { id: conversation.id },
    data: {
      stage: structured.stage,
      lastMessageAt: new Date(),
      status: structured.needsHuman ? "human_handoff" : conversation.status,
    },
  });

  await recordIntent(conversation.id, structured.intent);

  if (structured.buyingSignal) {
    await prisma.conversionEvent.create({
      data: {
        conversationId: conversation.id,
        contactId: conversation.contactId,
        eventType: "buying_signal_detected",
        metadata: { recommendedNextAction: structured.recommendedNextAction },
        occurredAt: new Date(),
      },
    });
  }

  const refreshed = await prisma.conversation.findUnique({
    where: { id: conversation.id },
    select: { contactId: true },
  });

  return {
    message: structured.message,
    needsHuman: structured.needsHuman,
    aiUnavailable: false,
    cta: normalizeCta(structured.recommendedNextAction),
    contactCaptured: Boolean(refreshed?.contactId),
  };
}

/** Best-effort: records the failure and emails the team. Must never throw into the visitor's request. */
async function notifyAiFailure(conversation: Conversation, error: unknown): Promise<void> {
  const reason =
    error instanceof AiProviderUnavailableError ? "AI provider unavailable" : "AI assistant error";
  try {
    await prisma.conversionEvent.create({
      data: {
        conversationId: conversation.id,
        contactId: conversation.contactId,
        eventType: "human_handoff",
        metadata: { reason, automatic: true },
        occurredAt: new Date(),
      },
    });
    const contact = conversation.contactId
      ? await prisma.contact.findUnique({ where: { id: conversation.contactId } })
      : null;
    await sendHumanHandoffNotification({
      conversationExternalId: conversation.externalId,
      contactName: contact ? [contact.firstName, contact.lastName].filter(Boolean).join(" ") || null : null,
      reason: `${reason} — a visitor message is waiting for a reply.`,
    });
  } catch (notifyError) {
    console.error("Failed to record/notify AI failure handoff", notifyError);
  }
}

async function recordIntent(conversationId: number, intentKey: string): Promise<void> {
  if (intentKey === "" || intentKey === "unknown") {
    return;
  }

  const intent = await prisma.intent.upsert({
    where: { key: intentKey },
    update: {},
    create: { key: intentKey, label: headline(intentKey) },
  });

  await prisma.intentDetection.create({
    data: { conversationId, primaryIntentId: intent.id, confidence: 1 },
  });
}

function headline(key: string): string {
  return key
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function contextualOpener(currentPage?: string): string {
  const assistantName = AI_CONFIG.assistantName;
  const defaultOpener = `Hi, I'm ${assistantName} from RaveSoft. What are you trying to get done, or what's slowing your business down right now?`;

  if (!currentPage) return defaultOpener;
  if (currentPage.includes("cliqpos")) {
    return "What type of business are you running? I'll help you identify the most suitable CliqPOS setup.";
  }
  if (currentPage.includes("hotel")) {
    return "How many rooms does your property manage? I can help identify the right hotel management setup.";
  }
  if (currentPage.includes("business-automation")) {
    return "Want to automate part of your business? I can help identify where an AI employee would produce the most value.";
  }
  if (currentPage.includes("ai-employee")) {
    return "What kind of business do you run, and where are you currently losing the most time or customers — sales, support, follow-up, or something else?";
  }

  return defaultOpener;
}
