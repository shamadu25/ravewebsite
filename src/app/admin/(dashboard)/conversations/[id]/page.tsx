import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import AutoRefresh from "@/components/os/AutoRefresh";
import ApiButton from "@/components/os/ApiButton";
import ApiForm from "@/components/os/ApiForm";
import ChatReplyBox from "@/components/os/ChatReplyBox";
import ChatAssign from "@/components/os/ChatAssign";
import { CANNED_REPLIES } from "@/lib/os/cannedReplies";
import {
  SCORE_STYLES,
  SLA_STYLES,
  attributionLabel,
  contactName,
  formatWaiting,
  roleLabel,
  slaLevel,
  topScore,
  waitingMinutes,
} from "@/lib/os/chats";
import { COMPANY } from "@/lib/data";

export const dynamic = "force-dynamic";

const waLink = (num: string, name: string | null) =>
  `https://wa.me/${num.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(
    `Hi${name ? ` ${name}` : ""}, this is ${COMPANY.shortName}. Following up on your chat on our website.`
  )}`;

export default async function AdminConversationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const conversation = await prisma.conversation.findUnique({
    where: { externalId: id },
    include: {
      contact: { include: { company: true } },
      visitor: { include: { sessions: { orderBy: { id: "desc" }, take: 1 } } },
      messages: { orderBy: { id: "asc" } },
      leads: { include: { scores: { orderBy: { computedAt: "desc" }, take: 1 } } },
      intentDetections: { orderBy: { id: "desc" }, take: 12, include: { primaryIntent: true } },
      conversionEvents: {
        where: { eventType: { in: ["conversation_note", "conversation_closed", "conversation_reopened", "human_handoff", "agent_reply", "ai_resumed", "conversation_assigned"] } },
        orderBy: { id: "desc" },
        take: 30,
      },
    },
  });

  if (!conversation) notFound();

  const [buyingSignals, users] = await Promise.all([
    prisma.conversionEvent.count({ where: { conversationId: conversation.id, eventType: "buying_signal_detected" } }),
    prisma.osUser.findMany({ where: { active: true }, select: { email: true }, orderBy: { email: "asc" } }),
  ]);
  const assigneeOptions = Array.from(new Set([process.env.ADMIN_EMAIL, ...users.map((u) => u.email)].filter((e): e is string => Boolean(e))));

  const lead = conversation.leads[0];
  const session = conversation.visitor?.sessions[0];
  const contact = conversation.contact;
  const name = contactName(contact);
  const reachNumber = contact?.whatsapp ?? contact?.phone ?? null;
  const url = `/api/os/conversations/${conversation.externalId}`;
  const lastMessage = conversation.messages[conversation.messages.length - 1];
  const awaiting = conversation.status !== "closed" && (conversation.status === "human_handoff" || lastMessage?.role === "visitor");
  const waiting = awaiting ? waitingMinutes(lastMessage?.role === "visitor" ? lastMessage.createdAt : conversation.lastMessageAt) : 0;
  const sla = slaLevel(waiting);
  const score = topScore(lead ? [lead] : []);
  const source = attributionLabel({ utmSource: session?.utmSource, utmMedium: session?.utmMedium, utmCampaign: session?.utmCampaign, referrer: session?.referrer });
  const intents = Array.from(new Set(conversation.intentDetections.map((d) => d.primaryIntent.label))).slice(0, 5);
  const firstResponse =
    conversation.firstAgentReplyAt
      ? formatWaiting(Math.max(0, Math.round((conversation.firstAgentReplyAt.getTime() - conversation.createdAt.getTime()) / 60_000)))
      : null;

  return (
    <div>
      <AutoRefresh seconds={8} />
      <Link href="/admin/conversations" className="text-sm text-blue-600 hover:underline">
        ← Back to conversations
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-3 mt-2 mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          {name ?? contact?.email ?? "Anonymous visitor"}
          {awaiting && (
            <span className={`ml-3 align-middle px-2 py-0.5 rounded-full text-xs font-medium ${SLA_STYLES[sla]}`}>
              Needs a reply · waiting {formatWaiting(waiting)}
            </span>
          )}
        </h1>
        <div className="flex flex-wrap gap-2">
          {reachNumber && (
            <a href={waLink(reachNumber, name)} target="_blank" rel="noopener noreferrer" className="rounded-lg bg-green-600 text-white px-3 py-2 text-sm font-medium hover:bg-green-700">
              Reply on WhatsApp
            </a>
          )}
          {contact?.email && (
            <a href={`mailto:${contact.email}`} className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50">
              Email
            </a>
          )}
          <a href={`${url}/export`} className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50">
            Download transcript
          </a>
          {conversation.status === "closed" ? (
            <ApiButton label="Reopen" url={url} body={{ action: "reopen" }} variant="secondary" />
          ) : (
            <ApiButton label="Mark handled / close" url={url} body={{ action: "close" }} variant="secondary" />
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <section className="bg-white rounded-2xl border border-gray-200 p-5">
            <h2 className="font-semibold text-gray-900 mb-3">Full conversation ({conversation.messages.length} messages)</h2>
            <div className="space-y-3 max-h-[40rem] overflow-y-auto pr-1">
              {conversation.messages.map((m) => (
                <div key={m.id} className={m.role === "visitor" ? "ml-auto max-w-[90%]" : "max-w-[90%]"}>
                  <p className={`text-[11px] text-gray-400 mb-0.5 ${m.role === "visitor" ? "text-right" : ""}`}>
                    {roleLabel(m.role)} · {m.createdAt.toLocaleString()}
                  </p>
                  <div
                    className={
                      m.role === "visitor"
                        ? "bg-blue-50 rounded-xl px-4 py-2 text-sm text-gray-900 whitespace-pre-wrap"
                        : "bg-gray-50 rounded-xl px-4 py-2 text-sm text-gray-800 whitespace-pre-wrap"
                    }
                  >
                    {m.content}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {conversation.status !== "closed" && (
            <section className="bg-white rounded-2xl border border-gray-200 p-5">
              <h2 className="font-semibold text-gray-900 mb-1">Reply in the visitor&apos;s chat window</h2>
              <p className="text-xs text-gray-500 mb-3">
                {conversation.status === "human_active"
                  ? "You are handling this chat — the AI is paused. The visitor sees replies within a few seconds if their page is open."
                  : "Sending a reply pauses the AI for this chat so it does not talk over you."}
              </p>
              <ChatReplyBox
                url={url}
                typingUrl={`${url}/typing`}
                firstName={contact?.firstName ?? null}
                canned={CANNED_REPLIES}
                humanActive={conversation.status === "human_active"}
              />
              {conversation.status === "human_active" && (
                <div className="mt-3">
                  <ApiButton label="Hand back to AI" url={url} body={{ action: "resume_ai" }} variant="secondary" />
                </div>
              )}
            </section>
          )}

          <section className="bg-white rounded-2xl border border-gray-200 p-5">
            <h2 className="font-semibold text-gray-900 mb-3">Internal notes &amp; activity</h2>
            <ApiForm
              url={url}
              fields={[{ name: "note", label: "Add a private note", type: "textarea", required: true, placeholder: "e.g. Called, wants a demo Friday" }]}
              extra={{ action: "note" }}
              submitLabel="Save note"
            />
            <ul className="mt-4 space-y-2 text-sm">
              {conversation.conversionEvents.length === 0 && <li className="text-gray-400">No notes or activity yet.</li>}
              {conversation.conversionEvents.map((e) => {
                const meta = (e.metadata ?? {}) as { note?: string; by?: string; reason?: string };
                return (
                  <li key={e.id} className="border-l-2 border-gray-200 pl-3">
                    <p className="text-gray-800">
                      {e.eventType === "conversation_note"
                        ? meta.note
                        : e.eventType.replace(/_/g, " ") + (meta.reason ? ` — ${meta.reason}` : "")}
                    </p>
                    <p className="text-xs text-gray-400">{[meta.by, e.occurredAt.toLocaleString()].filter(Boolean).join(" · ")}</p>
                  </li>
                );
              })}
            </ul>
          </section>
        </div>

        <div className="space-y-6">
          <section className="bg-white rounded-2xl border border-gray-200 p-5">
            <h2 className="font-semibold text-gray-900 mb-3">Lead snapshot</h2>
            <div className="flex items-center gap-3 mb-3">
              {score ? (
                <span className={`px-3 py-1 rounded-full text-sm font-semibold ${SCORE_STYLES[score.level] ?? SCORE_STYLES.low}`}>
                  {score.score}/100 · {score.level.replace(/_/g, " ")}
                </span>
              ) : (
                <span className="px-3 py-1 rounded-full text-sm bg-gray-100 text-gray-500">Not scored yet</span>
              )}
              {buyingSignals > 0 && <span className="text-xs font-medium text-green-700">🔥 {buyingSignals} buying signal{buyingSignals === 1 ? "" : "s"}</span>}
            </div>
            <dl className="text-sm space-y-2">
              <Row k="Came from" v={source} />
              <Row k="Interests" v={intents.join(", ")} />
              <Row k="Language" v={conversation.language} />
              <Row k="First team reply" v={firstResponse} />
              <Row k="Visitor rating" v={conversation.rating ? `${"★".repeat(conversation.rating)}${"☆".repeat(5 - conversation.rating)}${conversation.ratingComment ? ` — “${conversation.ratingComment}”` : ""}` : null} />
            </dl>
            <div className="mt-4">
              <p className="text-xs text-gray-500 mb-1">Owner</p>
              <ChatAssign url={url} current={conversation.assignee} options={assigneeOptions} />
            </div>
          </section>

          <section className="bg-white rounded-2xl border border-gray-200 p-5">
            <h2 className="font-semibold text-gray-900 mb-3">Details</h2>
            <dl className="text-sm space-y-2">
              <Row k="Status" v={conversation.status.replace(/_/g, " ")} />
              <Row k="Stage" v={conversation.stage.replace(/_/g, " ")} />
              <Row k="Channel" v={conversation.channel} />
              <Row k="Started" v={conversation.createdAt.toLocaleString()} />
              <Row k="Last message" v={(conversation.lastMessageAt ?? conversation.createdAt).toLocaleString()} />
              <Row k="Landing page" v={conversation.landingPage} />
              <Row k="Current page" v={conversation.currentPage} />
            </dl>
          </section>

          <section className="bg-white rounded-2xl border border-gray-200 p-5">
            <h2 className="font-semibold text-gray-900 mb-3">Contact</h2>
            <dl className="text-sm space-y-2">
              <Row k="Name" v={name} />
              <Row k="Email" v={contact?.email} />
              <Row k="WhatsApp" v={contact?.whatsapp} />
              <Row k="Phone" v={contact?.phone} />
              <Row k="Company" v={contact?.company?.name} />
              <Row k="Country" v={contact?.country} />
            </dl>
            {!contact && <p className="text-xs text-gray-400 mt-2">Not captured yet — the visitor has not shared contact details.</p>}
          </section>

          <section className="bg-white rounded-2xl border border-gray-200 p-5">
            <h2 className="font-semibold text-gray-900 mb-3">Visitor</h2>
            <dl className="text-sm space-y-2">
              <Row k="Device" v={[session?.device, session?.browser].filter(Boolean).join(" · ")} />
              <Row k="Language" v={session?.language} />
              <Row k="Referrer" v={session?.referrer} />
              <Row k="UTM source" v={session?.utmSource} />
              <Row k="UTM campaign" v={session?.utmCampaign} />
              <Row k="Sessions" v={conversation.visitor ? String(conversation.visitor.sessionsCount) : null} />
            </dl>
          </section>

          {lead && (
            <section className="bg-white rounded-2xl border border-gray-200 p-5">
              <h2 className="font-semibold text-gray-900 mb-2">Linked lead</h2>
              <Link href={`/admin/leads/${lead.id}`} className="text-blue-600 hover:underline text-sm">
                Manage lead ({lead.stage.replace(/_/g, " ")})
                {lead.scores[0] ? ` — ${lead.scores[0].totalScore}/100 (${lead.scores[0].level})` : ""}
              </Link>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string | null | undefined }) {
  return (
    <div>
      <dt className="text-gray-500">{k}</dt>
      <dd className="text-gray-900 break-words">{v || "—"}</dd>
    </div>
  );
}
