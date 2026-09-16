import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";

export default async function AdminConversationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const conversation = await prisma.conversation.findUnique({
    where: { externalId: id },
    include: {
      contact: true,
      visitor: true,
      messages: { orderBy: { id: "asc" } },
      leads: { include: { scores: { orderBy: { computedAt: "desc" }, take: 1 } } },
    },
  });

  if (!conversation) {
    notFound();
  }

  const lead = conversation.leads[0];

  return (
    <div>
      <Link href="/admin/conversations" className="text-sm text-blue-600 hover:underline">
        ← Back to conversations
      </Link>

      <h1 className="text-2xl font-bold text-gray-900 mt-2 mb-6">
        {conversation.contact
          ? [conversation.contact.firstName, conversation.contact.lastName].filter(Boolean).join(" ") ||
            "Conversation"
          : "Anonymous visitor"}
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <section className="bg-white rounded-2xl border border-gray-200 p-5">
            <div className="space-y-3 max-h-[36rem] overflow-y-auto pr-1">
              {conversation.messages.map((m) => (
                <div
                  key={m.id}
                  className={
                    m.role === "assistant"
                      ? "bg-gray-50 rounded-xl px-4 py-2 text-sm text-gray-800 max-w-[90%]"
                      : "bg-blue-50 rounded-xl px-4 py-2 text-sm text-gray-900 max-w-[90%] ml-auto"
                  }
                >
                  {m.content}
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="space-y-6">
          <section className="bg-white rounded-2xl border border-gray-200 p-5">
            <h2 className="font-semibold text-gray-900 mb-3">Details</h2>
            <dl className="text-sm space-y-2">
              <div>
                <dt className="text-gray-500">Stage</dt>
                <dd className="text-gray-900 capitalize">{conversation.stage.replace(/_/g, " ")}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Status</dt>
                <dd className="text-gray-900 capitalize">{conversation.status.replace(/_/g, " ")}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Landing page</dt>
                <dd className="text-gray-900">{conversation.landingPage ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Contact</dt>
                <dd className="text-gray-900">
                  {conversation.contact?.email ?? conversation.contact?.whatsapp ?? "Not captured"}
                </dd>
              </div>
            </dl>
          </section>

          {lead && (
            <section className="bg-white rounded-2xl border border-gray-200 p-5">
              <h2 className="font-semibold text-gray-900 mb-2">Linked Lead</h2>
              <Link href={`/admin/leads/${lead.id}`} className="text-blue-600 hover:underline text-sm">
                View lead
                {lead.scores[0] ? ` — ${lead.scores[0].totalScore}/100 (${lead.scores[0].level})` : ""}
              </Link>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
