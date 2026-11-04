import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";
import AutoRefresh from "@/components/os/AutoRefresh";
import { LEAD_STAGES, PAGE_SIZE, contactName, hoursAgo, stageLabel } from "@/lib/os/chats";

export const dynamic = "force-dynamic";

const LEVEL_STYLES: Record<string, string> = {
  hot: "bg-red-100 text-red-700",
  sales_qualified: "bg-orange-100 text-orange-700",
  qualified: "bg-blue-100 text-[var(--primary)]",
  nurture: "bg-amber-100 text-amber-700",
  low: "bg-gray-100 text-gray-600",
};

const SOURCE_LABELS: Record<string, string> = {
  website_chat: "Live chat",
  calendly_booking: "Calendly booking",
  website_contact_form: "Contact form",
};

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function AdminLeadsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const q = (first(sp.q) ?? "").trim().slice(0, 100);
  const source = first(sp.source) ?? "all";
  const stage = first(sp.stage) ?? "all";
  const pageNum = Number(first(sp.page) ?? 1);
  const page = Number.isInteger(pageNum) && pageNum > 0 ? pageNum : 1;

  const and: object[] = [];
  if (source !== "all") and.push({ source });
  if (stage !== "all") and.push({ stage });
  if (q) {
    and.push({
      OR: [
        { contact: { is: { firstName: { contains: q } } } },
        { contact: { is: { lastName: { contains: q } } } },
        { contact: { is: { email: { contains: q } } } },
        { contact: { is: { whatsapp: { contains: q } } } },
        { contact: { is: { phone: { contains: q } } } },
        { company: { is: { name: { contains: q } } } },
        { serviceInterest: { contains: q } },
      ],
    });
  }
  const where = and.length ? { AND: and } : {};

  const since = hoursAgo(24);
  const [leads, total, sources, byStage, spamBlocked] = await Promise.all([
    prisma.lead.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        contact: true,
        company: true,
        conversation: { select: { externalId: true, lastMessageAt: true, status: true } },
        scores: { orderBy: { computedAt: "desc" }, take: 1 },
      },
    }),
    prisma.lead.count({ where }),
    prisma.lead.groupBy({ by: ["source"], _count: { _all: true } }),
    prisma.lead.groupBy({ by: ["stage"], _count: { _all: true } }),
    prisma.conversionEvent.count({ where: { eventType: "spam_blocked", occurredAt: { gte: since } } }),
  ]);

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const link = (patch: Record<string, string | number>) => {
    const p = new URLSearchParams();
    const next = { q, source, stage, page, ...patch } as Record<string, string | number>;
    for (const [k, v] of Object.entries(next)) if (v && v !== "all" && !(k === "page" && v === 1)) p.set(k, String(v));
    const s = p.toString();
    return `/admin/leads${s ? `?${s}` : ""}`;
  };
  const stageCount = Object.fromEntries(byStage.map((s) => [s.stage, s._count._all]));

  return (
    <div>
      <AutoRefresh seconds={30} />
      <div className="flex items-baseline justify-between mb-4">
        <div className="flex items-baseline gap-4">
          <h1 className="text-2xl font-bold text-gray-900">Leads</h1>
          <Link href="/admin/conversations" className="text-sm font-medium text-blue-600 hover:underline">Live chats →</Link>
        </div>
        <span className="text-xs text-gray-500" title="Honeypot, bad token, spam content and similar blocks on public forms">
          🛡 {spamBlocked} spam attempt{spamBlocked === 1 ? "" : "s"} blocked in the last 24h
        </span>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        <Link href={link({ source: "all", page: 1 })} className={cn("px-3 py-1.5 rounded-full text-sm border", source === "all" ? "bg-gray-900 text-white border-gray-900" : "bg-white border-gray-200 text-gray-700")}>
          All sources
        </Link>
        {sources.map((s) => (
          <Link key={s.source ?? "none"} href={link({ source: s.source ?? "all", page: 1 })} className={cn("px-3 py-1.5 rounded-full text-sm border", source === s.source ? "bg-gray-900 text-white border-gray-900" : "bg-white border-gray-200 text-gray-700")}>
            {SOURCE_LABELS[s.source ?? ""] ?? s.source ?? "Unknown"} ({s._count._all})
          </Link>
        ))}
      </div>

      <div className="flex flex-wrap gap-2 mb-4 text-xs">
        {LEAD_STAGES.map((s) => (
          <Link key={s} href={link({ stage: stage === s ? "all" : s, page: 1 })} className={cn("px-2.5 py-1 rounded-full border capitalize", stage === s ? "bg-blue-600 text-white border-blue-600" : "bg-white border-gray-200 text-gray-600")}>
            {stageLabel(s)} · {stageCount[s] ?? 0}
          </Link>
        ))}
      </div>

      <form method="get" action="/admin/leads" className="mb-4 flex gap-2">
        {source !== "all" && <input type="hidden" name="source" value={source} />}
        {stage !== "all" && <input type="hidden" name="stage" value={stage} />}
        <input name="q" defaultValue={q} placeholder="Search name, email, phone, company or interest" className="w-80 rounded-lg border border-gray-300 px-3 py-1.5 text-sm" />
        <button className="rounded-lg bg-gray-900 text-white px-3 py-1.5 text-sm">Search</button>
      </form>

      <div className="bg-white rounded-2xl border border-gray-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-left text-gray-500">
              <th className="px-4 py-3 font-medium">Contact</th>
              <th className="px-4 py-3 font-medium">Service Interest</th>
              <th className="px-4 py-3 font-medium">Stage</th>
              <th className="px-4 py-3 font-medium">Owner</th>
              <th className="px-4 py-3 font-medium">Score</th>
              <th className="px-4 py-3 font-medium">Source</th>
              <th className="px-4 py-3 font-medium">Chat</th>
              <th className="px-4 py-3 font-medium">Created</th>
            </tr>
          </thead>
          <tbody>
            {leads.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-gray-400">No leads match.</td>
              </tr>
            )}
            {leads.map((lead) => {
              const score = lead.scores[0];
              const name = contactName(lead.contact) ?? "—";
              return (
                <tr key={lead.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <Link href={`/admin/leads/${lead.id}`} className="font-medium text-gray-900 hover:text-blue-600">{name}</Link>
                    <p className="text-xs text-gray-500">
                      {lead.contact.email ?? lead.contact.whatsapp ?? lead.contact.phone ?? "no contact info"}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-gray-700">{lead.serviceInterest ?? "—"}</td>
                  <td className="px-4 py-3 text-gray-700 capitalize">{stageLabel(lead.stage)}</td>
                  <td className="px-4 py-3 text-gray-700">{lead.owner ?? <span className="text-gray-400">unassigned</span>}</td>
                  <td className="px-4 py-3">
                    {score ? (
                      <span className={cn("inline-flex px-2 py-0.5 rounded-full text-xs font-medium capitalize", LEVEL_STYLES[score.level] ?? LEVEL_STYLES.low)}>
                        {score.level.replace(/_/g, " ")} ({score.totalScore})
                      </span>
                    ) : (
                      <span className="text-gray-400 text-xs">unscored</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-500">{SOURCE_LABELS[lead.source ?? ""] ?? lead.source ?? "—"}</td>
                  <td className="px-4 py-3">
                    {lead.conversation ? (
                      <Link href={`/admin/conversations/${lead.conversation.externalId}`} className="text-blue-600 hover:underline">Open chat</Link>
                    ) : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-4 py-3 text-gray-500">{lead.createdAt.toLocaleDateString()}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {pages > 1 && (
        <div className="flex items-center justify-between mt-4 text-sm">
          {page > 1 ? <Link href={link({ page: page - 1 })} className="text-blue-600 hover:underline">← Newer</Link> : <span />}
          <span className="text-gray-500">Page {page} of {pages} · {total} leads</span>
          {page < pages ? <Link href={link({ page: page + 1 })} className="text-blue-600 hover:underline">Older →</Link> : <span />}
        </div>
      )}
    </div>
  );
}
