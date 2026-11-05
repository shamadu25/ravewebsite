import { prisma } from "@/lib/prisma";
import { HUMAN_ACTIVE } from "@/lib/os/chats";

/** The team is "typing" if the admin reply box pinged within this window. */
export const TYPING_WINDOW_MS = 6_000;

export interface LiveMessage {
  id: number;
  role: string;
  content: string;
  created_at: string;
}

export interface LiveState {
  human_active: boolean;
  agent_typing: boolean;
  closed: boolean;
}

export interface LiveUpdates extends LiveState {
  messages: LiveMessage[];
}

export function isAgentTyping(agentTypingAt: Date | null | undefined, now = Date.now()): boolean {
  return Boolean(agentTypingAt) && now - (agentTypingAt as Date).getTime() < TYPING_WINDOW_MS;
}

export function parseAfter(value: string | null | undefined): number {
  const n = Number(value ?? 0);
  return Number.isInteger(n) && n > 0 ? n : 0;
}

/**
 * Team replies (role "agent") after `after`, plus the chat state the widget needs: is a human on the chat,
 * is the team typing right now, has the chat been closed. Shared by the polling and streaming endpoints.
 * Returns null when the conversation does not exist.
 */
export async function readLiveUpdates(externalId: string, after: number): Promise<LiveUpdates | null> {
  const conversation = await prisma.conversation.findUnique({
    where: { externalId },
    select: { id: true, status: true, agentTypingAt: true },
  });
  if (!conversation) return null;

  const rows = await prisma.message.findMany({
    where: { conversationId: conversation.id, role: "agent", id: { gt: after } },
    orderBy: { id: "asc" },
    take: 50,
  });

  return {
    messages: rows.map((m) => ({ id: m.id, role: m.role, content: m.content, created_at: m.createdAt.toISOString() })),
    human_active: conversation.status === HUMAN_ACTIVE,
    agent_typing: isAgentTyping(conversation.agentTypingAt),
    closed: conversation.status === "closed",
  };
}
