import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";

export default async function AdminLeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const leadId = Number(id);

  if (Number.isNaN(leadId)) {
    notFound();
  }

  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    include: {
      contact: true,
      company: true,
      conversation: { include: { messages: { orderBy: { id: "asc" } } } },
      scores: { orderBy: { computedAt: "desc" }, include: { components: true } },
    },
  });

  if (!lead) {
    notFound();
  }

  const latestScore = lead.scores[0];
  const contactName = [lead.contact.firstName, lead.contact.lastName].filter(Boolean).join(" ") || "Unknown";

  return (
    <div>
      <Link href="/admin/leads" className="text-sm text-blue-600 hover:underline">
        ← Back to leads
      </Link>

      <h1 className="text-2xl font-bold text-gray-900 mt-2 mb-6">{contactName}</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <section className="bg-white rounded-2xl border border-gray-200 p-5">
            <h2 className="font-semibold text-gray-900 mb-3">Conversation</h2>
            {lead.conversation ? (
              <div className="space-y-3 max-h-[32rem] overflow-y-auto pr-1">
                {lead.conversation.messages.map((m) => (
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
            ) : (
              <p className="text-sm text-gray-400">No linked conversation.</p>
            )}
          </section>
        </div>

        <div className="space-y-6">
          <section className="bg-white rounded-2xl border border-gray-200 p-5">
            <h2 className="font-semibold text-gray-900 mb-3">Contact</h2>
            <dl className="text-sm space-y-2">
              <div>
                <dt className="text-gray-500">Email</dt>
                <dd className="text-gray-900">{lead.contact.email ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Phone</dt>
                <dd className="text-gray-900">{lead.contact.phone ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-gray-500">WhatsApp</dt>
                <dd className="text-gray-900">{lead.contact.whatsapp ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Company</dt>
                <dd className="text-gray-900">{lead.company?.name ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Stage</dt>
                <dd className="text-gray-900 capitalize">{lead.stage.replace(/_/g, " ")}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Service interest</dt>
                <dd className="text-gray-900">{lead.serviceInterest ?? "—"}</dd>
              </div>
            </dl>
          </section>

          <section className="bg-white rounded-2xl border border-gray-200 p-5">
            <h2 className="font-semibold text-gray-900 mb-3">Lead Score</h2>
            {latestScore ? (
              <>
                <p className="text-3xl font-bold text-gray-900">{latestScore.totalScore}/100</p>
                <p className="text-sm text-gray-500 capitalize mb-3">{latestScore.level.replace(/_/g, " ")}</p>
                <ul className="text-sm space-y-1">
                  {latestScore.components.map((c) => (
                    <li key={c.id} className="flex justify-between text-gray-700">
                      <span className="capitalize">{c.key.replace(/_/g, " ")}</span>
                      <span className="font-medium">+{c.points}</span>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <p className="text-sm text-gray-400">Not yet scored.</p>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
