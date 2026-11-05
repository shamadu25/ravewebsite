import { prisma } from "@/lib/prisma";
import { complete } from "@/lib/os/llm";
import { knowledgeContextFor } from "@/lib/services/knowledgeRetrieval";

const SYSTEM = `You draft replies for a RaveSoft Digital Solutions team member who is taking over a live website chat.
Write the single next message the team member should send to the visitor.
Rules:
- Reply in the language the visitor is using (English, French, Pidgin, ...).
- Warm, direct, human. 1-4 short sentences, no greeting boilerplate like "How can I assist you today", no emojis.
- Answer what the visitor actually asked. Use ONLY facts from the knowledge context for prices, features and promises; if it is not there, say the team will confirm rather than inventing it.
- End with one clear next step (a question, a booking link, or a promised follow-up).
- Output the message text only. No quotes, no labels, no explanation.`;

/** Drafts (never sends) a reply for the admin to edit. Throws if no LLM provider is configured. */
export async function draftChatReply(externalId: string): Promise<string> {
  const conversation = await prisma.conversation.findUnique({
    where: { externalId },
    include: { messages: { orderBy: { id: "desc" }, take: 20 }, contact: true },
  });
  if (!conversation) throw new Error("Conversation not found.");

  const messages = [...conversation.messages].reverse();
  const lastVisitor = [...messages].reverse().find((m) => m.role === "visitor")?.content ?? "";
  const knowledge = await knowledgeContextFor(lastVisitor).catch(() => "");

  const transcript = messages
    .map((m) => `${m.role === "visitor" ? "Visitor" : m.role === "agent" ? "Team" : "Ama (AI)"}: ${m.content}`)
    .join("\n");

  const user = [
    conversation.contact?.firstName ? `Visitor first name: ${conversation.contact.firstName}` : "",
    conversation.currentPage ? `Page they are on: ${conversation.currentPage}` : "",
    `Knowledge context:\n${knowledge || "(none)"}`,
    `Conversation so far:\n${transcript}`,
    "Write the team member's next message.",
  ]
    .filter(Boolean)
    .join("\n\n");

  const out = await complete({ tier: "fast", system: SYSTEM, user, temperature: 0.4, timeoutMs: 20_000 });
  return out.text.trim().replace(/^["“]|["”]$/g, "").slice(0, 1500);
}
