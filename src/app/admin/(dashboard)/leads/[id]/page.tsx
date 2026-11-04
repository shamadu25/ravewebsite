import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import ApiForm from "@/components/os/ApiForm";
import { LEAD_STAGES, stageLabel } from "@/lib/os/chats";

export const dynamic = "force-dynamic";

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
      conversionEvents: { where: { eventType: { in: ["lead_created", "lead_note", "lead_stage_changed", "lead_assigned"] } }, orderBy: { id: "desc" }, take: 50 },
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
            {lead.conversation && (
              <Link href={`/admin/conversations/${lead.conversation.externalId}`} className="inline-block mt-3 text-sm text-blue-600 hover:underline">
                Open full chat view →
              </Link>
            )}
          </section>

          <section className="bg-white rounded-2xl border border-gray-200 p-5">
            <h2 className="font-semibold text-gray-900 mb-3">Timeline</h2>
            <ul className="space-y-2 text-sm">
              {lead.conversionEvents.length === 0 && <li className="text-gray-400">No activity recorded yet.</li>}
              {lead.conversionEvents.map((e) => {
                const m = (e.metadata ?? {}) as { note?: string; from?: string | null; to?: string; by?: string };
                const text =
                  e.eventType === "lead_note" ? m.note
                  : e.eventType === "lead_stage_changed" ? `Stage: ${stageLabel(m.from ?? "—")} → ${stageLabel(m.to ?? "—")}`
                  : e.eventType === "lead_assigned" ? `Assigned to ${m.to}`
                  : "Lead created";
                return (
                  <li key={e.id} className="border-l-2 border-gray-200 pl-3">
                    <p className="text-gray-800">{text}</p>
                    <p className="text-xs text-gray-400">{[m.by, e.occurredAt.toLocaleString()].filter(Boolean).join(" · ")}</p>
                  </li>
                );
              })}
            </ul>
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
                <dt className="text-gray-500">Owner</dt>
                <dd className="text-gray-900">{lead.owner ?? "Unassigned"}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Source</dt>
                <dd className="text-gray-900">{lead.source ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Service interest</dt>
                <dd className="text-gray-900">{lead.serviceInterest ?? "—"}</dd>
              </div>
            </dl>
          </section>

          <section className="bg-white rounded-2xl border border-gray-200 p-5">
            <h2 className="font-semibold text-gray-900 mb-3">Manage lead</h2>
            <ApiForm
              url={`/api/os/leads/${lead.id}`}
              fields={[
                { name: "stage", label: "Stage", type: "select", options: [...LEAD_STAGES], defaultValue: lead.stage },
                { name: "owner", label: "Owner", type: "text", placeholder: lead.owner ?? "Assign to…" },
                { name: "note", label: "Add a note", type: "textarea", placeholder: "Call outcome, next step…" },
              ]}
              submitLabel="Save"
            />
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
