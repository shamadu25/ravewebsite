import { api } from "@/lib/os/http";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/ai/rateLimit";

type P = { id: string }; // conversation externalId

/**
 * "The team is typing" ping from the admin reply box. Deliberately separate from the main conversation
 * action route: it fires every few seconds while someone types, so it skips the audit trail.
 */
export const POST = api<P>("customer.update", async ({ caller, params }) => {
  if (rateLimit(`typing:${caller.name}:${params.id}`, 30, 60_000)) return { ok: true };
  await prisma.conversation.updateMany({ where: { externalId: params.id }, data: { agentTypingAt: new Date() } });
  return { ok: true };
});
