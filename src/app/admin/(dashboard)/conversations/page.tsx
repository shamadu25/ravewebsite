import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";
import AutoRefresh from "@/components/os/AutoRefresh";
import {
  AWAITING_SCAN_LIMIT,
  PAGE_SIZE,
  buildConversationWhere,
  contactName,
  isAwaitingReply,
  parseChatFilters,
  startOfToday,
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
];

function href(f: ChatFilters, patch: Partial<ChatFilters>): string {
  const n = { ...f, ...patch };
  const p = new URLSearchParams();
  if (n.q) p.set("q", n.q);
  if (n.status !== "all") p.set("status", n.status);
  if (n.view !== "all") p.set("view", n.view);
  if (n.channel === "all") p.set("channel", "all");
  if (n.page > 1) p.set("page", String(n.page));
  const s = p.toString();
  return `/admin/conversations${s ? `?${s}` : ""}`;
}

const include = {
  contact: true,
  visitor: true,
  leads: { select: { id: true } },
  _count: { select: { messages: true } },
  messages: { orderBy: { id: "desc" as const }, take: 1 },
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

  const [stats, rows, total] = await Promise.all([
    Promise.all([
      prisma.conversation.count({ where: { ...websiteOnly, createdAt: { gte: today } } }),
      prisma.message.count({ where: { createdAt: { gte: today }, conversation: websiteOnly } }),
      prisma.conversation.count({ where: { ...websiteOnly, status: "human_handoff" } }),
      prisma.conversation.count({ where: { ...websiteOnly, status: "open" } }),
      prisma.lead.count({ where: { source: "website_chat" } }),
    ]),
    f.view === "awaiting"
      ? prisma.conversation.findMany({ where, orderBy: { lastMessageAt: "desc" }, take: AWAITING_SCAN_LIMIT, include })
      : prisma.conversation.findMany({
          where,
          orderBy: [{ lastMessageAt: "desc" }, { id: "desc" }],
          skip: (f.page - 1) * PAGE_SIZE,
          take: PAGE_SIZE,
          include,
        }),
    f.view === "awaiting" ? Promise.resolve(0) : prisma.conversation.count({ where }),
  ]);

  const [chatsToday, messagesToday, handoffs, open, chatLeads] = stats;

  let list = rows;
  let pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  if (f.view === "awaiting") {
    const all = rows.filter((c) => isAwaitingReply({ status: c.status, lastRole: c.messages[0]?.role ?? null }));
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
        <h1 className="text-2xl font-bold text-gray-900">Live chats</h1>
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
        <form method="get" action="/admin/conversations" className="ml-auto flex flex-wrap items-center gap-2">
          {f.view !== "all" && <input type="hidden" name="view" value={f.view} />}
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
                    {c._count.messages} msg · {c.landingPage ?? c.currentPage ?? "—"}
                  </span>
                </p>
                <p className="text-sm text-gray-500 truncate max-w-xl">
                  {last ? `${last.role === "visitor" ? "Visitor: " : ""}${last.content}` : "—"}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {c.channel === "demo" && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700">Demo</span>
                )}
                {c.leads.length > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">Lead</span>
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
