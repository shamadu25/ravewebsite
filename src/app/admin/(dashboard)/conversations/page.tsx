import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";

const STATUS_STYLES: Record<string, string> = {
  open: "bg-green-100 text-green-700",
  human_handoff: "bg-red-100 text-red-700",
  closed: "bg-gray-100 text-gray-600",
};

async function getConversations() {
  return prisma.conversation.findMany({
    orderBy: { lastMessageAt: "desc" },
    take: 100,
    include: {
      contact: true,
      messages: { orderBy: { id: "desc" }, take: 1 },
    },
  });
}

export default async function AdminConversationsPage() {
  const conversations = await getConversations();

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Conversations</h1>

      <div className="bg-white rounded-2xl border border-gray-200 divide-y divide-gray-100">
        {conversations.length === 0 && <p className="px-5 py-8 text-center text-gray-400">No conversations yet.</p>}
        {conversations.map((conversation) => {
          const lastMessage = conversation.messages[0];
          const name = conversation.contact
            ? [conversation.contact.firstName, conversation.contact.lastName].filter(Boolean).join(" ")
            : null;

          return (
            <Link
              key={conversation.id}
              href={`/admin/conversations/${conversation.externalId}`}
              className="flex items-center justify-between gap-4 px-5 py-4 hover:bg-gray-50 transition-colors"
            >
              <div className="min-w-0">
                <p className="font-medium text-gray-900 truncate">{name ?? "Anonymous visitor"}</p>
                <p className="text-sm text-gray-500 truncate max-w-md">{lastMessage?.content ?? "—"}</p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                {conversation.channel === "demo" && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                    Demo
                  </span>
                )}
                <span
                  className={cn(
                    "px-2 py-0.5 rounded-full text-xs font-medium capitalize",
                    STATUS_STYLES[conversation.status] ?? STATUS_STYLES.closed
                  )}
                >
                  {conversation.status.replace(/_/g, " ")}
                </span>
                <span className="text-xs text-gray-400">
                  {conversation.lastMessageAt?.toLocaleString() ?? conversation.createdAt.toLocaleString()}
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
