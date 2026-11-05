import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";
import AutoRefresh from "@/components/os/AutoRefresh";
import {
  AWAITING_SCAN_LIMIT,
  PAGE_SIZE,
  buildConversationWhere,
  SCORE_STYLES,
  SLA_STYLES,
  attributionLabel,
  contactName,
  formatWaiting,
  isAwaitingReply,
  parseChatFilters,
  slaLevel,
  startOfToday,
  topScore,
  waitingMinutes,
  type ChatFilters,
} from "@/lib/os/chats";

export const dynamic = "force-dynamic";

const STATUS_STYLES: Record<string, string> = {
  open: "bg-green-100 text-green-700",
  human_handoff: "bg-red-100 text-red-700",
  human_active: "bg-blue-100 text-blue-700",
  closed: "bg-gray-100 text-gray-600",
};

const VIEWS: { key: ChatFilters["view"]; label: string }[] = [
  { key: "all", label: "All chats" },
  { key: "awaiting", label: "Needs a reply" },
  { key: "leads", label: "With a lead" },
  { key: "no_contact", label: "No contact yet" },
  { key: "unassigned", label: "Unassigned" },
];

function href(f: ChatFilters, patch: Partial<ChatFilters>): string {
  const n = { ...f, ...patch };
  const p = new URLSearchParams();
  if (n.q) p.set("q", n.q);
  if (n.status !== "all") p.set("status", n.status);
  if (n.view !== "all") p.set("view", n.view);
  if (n.sort === "score") p.set("sort", "score");
  if (n.channel === "all") p.set("channel", "all");
  if (n.page > 1) p.set("page", String(n.page));
  const s = p.toString();
  return `/admin/conversations${s ? `?${s}` : ""}`;
}

const include = {
  contact: true,
  visitor: { include: { sessions: { orderBy: { id: "desc" as const }, take: 1 } } },
  leads: { select: { id: true, scores: { orderBy: { computedAt: "desc" as const }, take: 1, select: { totalScore: true, level: true } } } },
  _count: { select: { messages: true } },
  // Newest few messages: the newest decides "needs a reply"; the latest VISITOR message is the preview.
  messages: { orderBy: { id: "desc" as const }, take: 6 },
};

export default async function AdminConversationsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const f = parseChatFilters(await searchParams);
  const where = buildConversationWhere(f);
  const today = startOfToday();
  const websiteOnly = { channel: { not: "demo" } };
  // "Needs a reply" (last-message role) and "hottest first" (lead score) cannot be done in SQL, so those scan recent chats in memory.
  const scanInMemory = f.view === "awaiting" || f.sort === "score";

  const [stats, rows, total] = await Promise.all([
    Promise.all([
      prisma.conversation.count({ where: { ...websiteOnly, createdAt: { gte: today } } }),
      prisma.message.count({ where: { createdAt: { gte: today }, conversation: websiteOnly } }),
      prisma.conversation.count({ where: { ...websiteOnly, status: "human_handoff" } }),
      prisma.conversation.count({ where: { ...websiteOnly, status: "open" } }),
      prisma.lead.count({ where: { source: "website_chat" } }),
    ]),
    scanInMemory
      ? prisma.conversation.findMany({ where, orderBy: { lastMessageAt: "desc" }, take: AWAITING_SCAN_LIMIT, include })
      : prisma.conversation.findMany({
          where,
          orderBy: [{ lastMessageAt: "desc" }, { id: "desc" }],
          skip: (f.page - 1) * PAGE_SIZE,
          take: PAGE_SIZE,
          include,
        }),
    scanInMemory ? Promise.resolve(0) : prisma.conversation.count({ where }),
  ]);

  const [chatsToday, messagesToday, handoffs, open, chatLeads] = stats;

  let list = rows;
  let pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  if (scanInMemory) {
    let all = f.view === "awaiting" ? rows.filter((c) => isAwaitingReply({ status: c.status, lastRole: c.messages[0]?.role ?? null })) : rows;
    if (f.sort === "score") {
      all = [...all].sort((a, b) => (topScore(b.leads)?.score ?? -1) - (topScore(a.leads)?.score ?? -1) || (b.lastMessageAt?.getTime() ?? 0) - (a.lastMessageAt?.getTime() ?? 0));
    }
    pages = Math.max(1, Math.ceil(all.length / PAGE_SIZE));
    list = all.slice((f.page - 1) * PAGE_SIZE, f.page * PAGE_SIZE);
  }

  const tiles = [
    { label: "Chats today", value: chatsToday },
    { label: "Messages today", value: messagesToday },
    { label: "Open", value: open },
    { label: "Human handoff", value: handoffs, alert: handoffs > 0 },
    { label: "Leads from chat", value: chatLeads },
  ];

  return (
    <div>
      <AutoRefresh seconds={10} />
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-baseline gap-4">
          <h1 className="text-2xl font-bold text-gray-900">Live chats</h1>
          <Link href="/admin/leads" className="text-sm font-medium text-blue-600 hover:underline">Leads →</Link>
        </div>
        <span className="text-xs text-gray-400">Auto-refreshes every 10s · every message is stored</span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        {tiles.map((t) => (
          <div key={t.label} className="bg-white rounded-2xl border border-gray-200 px-4 py-3">
            <p className="text-xs text-gray-500">{t.label}</p>
            <p className={cn("text-2xl font-bold", t.alert ? "text-red-600" : "text-gray-900")}>{t.value}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        {VIEWS.map((v) => (
          <Link
            key={v.key}
            href={href(f, { view: v.key, page: 1 })}
            className={cn(
              "px-3 py-1.5 rounded-full text-sm border",
              f.view === v.key ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
            )}
          >
            {v.label}
          </Link>
        ))}
        <Link
          href={href(f, { sort: f.sort === "score" ? "recent" : "score", page: 1 })}
          className={cn(
            "px-3 py-1.5 rounded-full text-sm border",
            f.sort === "score" ? "bg-red-600 text-white border-red-600" : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
          )}
          title="Sort by lead score, hottest first"
        >
          🔥 Hottest first
        </Link>
        <form method="get" action="/admin/conversations" className="ml-auto flex flex-wrap items-center gap-2">
          {f.view !== "all" && <input type="hidden" name="view" value={f.view} />}
          {f.sort === "score" && <input type="hidden" name="sort" value="score" />}
          <input
            name="q"
            defaultValue={f.q}
            placeholder="Search name, email, phone or message text"
            className="w-64 rounded-lg border border-gray-300 px-3 py-1.5 text-sm"
          />
          <select name="status" defaultValue={f.status} className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm">
            <option value="all">Any status</option>
            <option value="open">Open</option>
            <option value="human_handoff">Human handoff</option>
            <option value="human_active">Team handling</option>
            <option value="closed">Closed</option>
          </select>
          <select name="channel" defaultValue={f.channel} className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm">
            <option value="website">Website only</option>
            <option value="all">Include demo chats</option>
          </select>
          <button className="rounded-lg bg-gray-900 text-white px-3 py-1.5 text-sm">Filter</button>
        </form>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 divide-y divide-gray-100">
        {list.length === 0 && <p className="px-5 py-8 text-center text-gray-400">No conversations match.</p>}
        {list.map((c) => {
          const last = c.messages[0];
          const name = contactName(c.contact);
          const awaiting = isAwaitingReply({ status: c.status, lastRole: last?.role ?? null });
          const when = c.lastMessageAt ?? c.createdAt;
          const score = topScore(c.leads);
          const wait = awaiting ? waitingMinutes(last?.role === "visitor" ? last.createdAt : c.lastMessageAt) : 0;
          const session = c.visitor?.sessions[0];
          const source = attributionLabel({ utmSource: session?.utmSource, utmMedium: session?.utmMedium, utmCampaign: session?.utmCampaign, referrer: session?.referrer });

          return (
            <Link
              key={c.id}
              href={`/admin/conversations/${c.externalId}`}
              className="flex items-center justify-between gap-4 px-5 py-4 hover:bg-gray-50 transition-colors"
            >
              <div className="min-w-0">
                <p className="font-medium text-gray-900 truncate">
                  {awaiting && <span className="inline-block w-2 h-2 rounded-full bg-red-500 mr-2 align-middle" title="Needs a reply" />}
                  {name ?? c.contact?.email ?? c.contact?.whatsapp ?? "Anonymous visitor"}
                  <span className="ml-2 text-xs font-normal text-gray-400">
                    {c._count.messages} msg · {c.landingPage ?? c.currentPage ?? "—"} · {source}
                  </span>
                </p>
                <p className="text-sm text-gray-500 truncate max-w-xl">
                  {(() => {
                    const v = c.messages.find((m) => m.role === "visitor");
                    return v ? `Visitor: ${v.content}` : last ? last.content : "—";
                  })()}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {c.channel === "demo" && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700">Demo</span>
                )}
                {awaiting && (
                  <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium", SLA_STYLES[slaLevel(wait)])} title="How long the visitor has been waiting">
                    ⏱ {formatWaiting(wait)}
                  </span>
                )}
                {score ? (
                  <span className={cn("px-2 py-0.5 rounded-full text-xs font-semibold", SCORE_STYLES[score.level] ?? SCORE_STYLES.low)}>
                    {score.score} · {score.level.replace(/_/g, " ")}
                  </span>
                ) : (
                  c.leads.length > 0 && <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">Lead</span>
                )}
                {c.assignee && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 max-w-32 truncate" title={`Owner: ${c.assignee}`}>
                    {c.assignee.split("@")[0]}
                  </span>
                )}
                {!c.contactId && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">No contact</span>
                )}
                <span
                  className={cn(
                    "px-2 py-0.5 rounded-full text-xs font-medium capitalize",
                    STATUS_STYLES[c.status] ?? STATUS_STYLES.closed
                  )}
                >
                  {c.status.replace(/_/g, " ")}
                </span>
                <span className="text-xs text-gray-400 w-36 text-right">{when.toLocaleString()}</span>
              </div>
            </Link>
          );
        })}
      </div>

      {pages > 1 && (
        <div className="flex items-center justify-between mt-4 text-sm">
          {f.page > 1 ? (
            <Link href={href(f, { page: f.page - 1 })} className="text-blue-600 hover:underline">← Newer</Link>
          ) : <span />}
          <span className="text-gray-500">Page {f.page} of {pages}</span>
          {f.page < pages ? (
            <Link href={href(f, { page: f.page + 1 })} className="text-blue-600 hover:underline">Older →</Link>
          ) : <span />}
        </div>
      )}
    </div>
  );
}
