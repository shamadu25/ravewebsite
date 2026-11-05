import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Card, PageHeader, Stat } from "@/components/os/ui";
import { cn } from "@/lib/utils";
import { hoursAgo } from "@/lib/os/chats";
import { ANALYTICS_RANGES, computeChatAnalytics, formatMinutes, parseRange, type AnalyticsChat } from "@/lib/os/chatAnalytics";

export const dynamic = "force-dynamic";

/** Hard ceiling on chats read for one report; the page says so when it is hit. */
const MAX_CHATS = 5000;

export default async function ChatAnalyticsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const days = parseRange((await searchParams).days);
  const since = hoursAgo(days * 24);

  const rows = await prisma.conversation.findMany({
    where: { channel: { not: "demo" }, createdAt: { gte: since } },
    orderBy: { id: "desc" },
    take: MAX_CHATS,
    select: {
      createdAt: true,
      contactId: true,
      assignee: true,
      language: true,
      firstAgentReplyAt: true,
      rating: true,
      visitor: { select: { sessions: { orderBy: { id: "desc" }, take: 1, select: { utmSource: true, utmMedium: true, utmCampaign: true, referrer: true } } } },
      leads: {
        select: {
          stage: true,
          scores: { orderBy: { computedAt: "desc" }, take: 1, select: { totalScore: true, level: true } },
          conversionEvents: { where: { eventType: "consultation_booked" }, take: 1, select: { id: true } },
        },
      },
    },
  });

  const chats: AnalyticsChat[] = rows.map((r) => ({
    createdAt: r.createdAt,
    contactId: r.contactId,
    assignee: r.assignee,
    language: r.language,
    firstAgentReplyAt: r.firstAgentReplyAt,
    rating: r.rating,
    source: r.visitor?.sessions[0] ?? null,
    leads: r.leads.map((l) => ({ stage: l.stage, booked: l.conversionEvents.length > 0, score: l.scores[0] ?? null })),
  }));
  const a = computeChatAnalytics(chats, days);
  const peak = Math.max(1, ...a.daily.map((d) => d.chats));
  const lead = a.funnel[2];
  const booked = a.funnel[3];
  const won = a.funnel[4];

  return (
    <div className="space-y-6">
      <Link href="/admin/conversations" className="text-sm text-blue-600 hover:underline">← Back to live chats</Link>
      <PageHeader
        title="Chat analytics"
        subtitle={`Website chats from the last ${days} days (demo chats excluded). Shows whether the chat is turning visitors into booked calls and customers.`}
        actions={
          <div className="flex gap-2">
            {ANALYTICS_RANGES.map((r) => (
              <Link key={r} href={`/admin/conversations/analytics?days=${r}`} className={cn("rounded-full border px-3 py-1.5 text-sm", r === days ? "border-gray-900 bg-gray-900 text-white" : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50")}>
                {r} days
              </Link>
            ))}
          </div>
        }
      />
      {rows.length === MAX_CHATS && <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">Showing the newest {MAX_CHATS} chats only. Choose a shorter range for exact figures.</p>}

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Stat label="Chats" value={String(a.totalChats)} hint={`${a.funnel[1].ofChats}% left contact details`} />
        <Stat label="Chat → lead" value={`${lead.ofChats}%`} hint={`${lead.count} leads · ${a.hotLeads} hot`} tone={lead.count > 0 ? "good" : undefined} />
        <Stat label="Booked a call" value={String(booked.count)} hint={`${booked.ofChats}% of all chats`} tone={booked.count > 0 ? "good" : undefined} />
        <Stat label="Won" value={String(won.count)} hint={`${won.ofChats}% of all chats`} tone={won.count > 0 ? "good" : undefined} />
      </div>

      <Card>
        <h2 className="mb-4 text-sm font-semibold text-gray-900">Funnel: from chat to customer</h2>
        <ul className="space-y-3">
          {a.funnel.map((s) => (
            <li key={s.key}>
              <div className="mb-1 flex justify-between text-[13px]">
                <span className="text-gray-800">{s.label}</span>
                <span className="tabular-nums text-gray-600">
                  <strong className="text-gray-900">{s.count}</strong> · {s.ofChats}% of chats{s.ofPrevious != null ? ` · ${s.ofPrevious}% of previous step` : ""}
                </span>
              </div>
              <div className="h-2.5 rounded-full bg-gray-100">
                <div className="h-2.5 rounded-full bg-blue-600" style={{ width: `${Math.max(s.count > 0 ? 2 : 0, s.ofChats)}%` }} />
              </div>
            </li>
          ))}
        </ul>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="mb-3 text-sm font-semibold text-gray-900">Response time</h2>
          <dl className="grid grid-cols-2 gap-3 text-[13px]">
            <div><dt className="text-gray-500">Median first team reply</dt><dd className="text-2xl font-semibold tabular-nums">{formatMinutes(a.response.medianMinutes)}</dd></div>
            <div><dt className="text-gray-500">Average</dt><dd className="text-2xl font-semibold tabular-nums">{formatMinutes(a.response.avgMinutes)}</dd></div>
            <div><dt className="text-gray-500">Answered within 5 min</dt><dd className="text-2xl font-semibold tabular-nums">{a.response.under5Share == null ? "—" : `${a.response.under5Share}%`}</dd></div>
            <div><dt className="text-gray-500">Chats a human joined</dt><dd className="text-2xl font-semibold tabular-nums">{a.response.humanShare}%</dd></div>
          </dl>
          <p className="mt-3 text-xs text-gray-400">Measured from chat start to the team&apos;s first reply, for {a.response.measured} chat{a.response.measured === 1 ? "" : "s"}. Replies sent before this tracking existed are not included.</p>
        </Card>

        <Card>
          <h2 className="mb-3 text-sm font-semibold text-gray-900">Visitor rating</h2>
          {a.rating.count === 0 ? (
            <p className="text-sm text-gray-500">No ratings yet. Visitors are asked when a chat is closed or they tap End chat.</p>
          ) : (
            <>
              <p className="text-3xl font-semibold tabular-nums">{a.rating.average} <span className="text-base font-normal text-gray-500">/ 5 · {a.rating.count} rating{a.rating.count === 1 ? "" : "s"} ({a.rating.responseRate}% of chats)</span></p>
              <ul className="mt-3 space-y-1.5 text-[13px]">
                {([5, 4, 3, 2, 1] as const).map((n) => (
                  <li key={n} className="flex items-center gap-2">
                    <span className="w-8 text-gray-600">{n} ★</span>
                    <div className="h-2 flex-1 rounded-full bg-gray-100"><div className="h-2 rounded-full bg-amber-400" style={{ width: `${pctOf(a.rating.distribution[n], a.rating.count)}%` }} /></div>
                    <span className="w-6 text-right tabular-nums text-gray-600">{a.rating.distribution[n]}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </Card>
      </div>

      <Card>
        <h2 className="mb-3 text-sm font-semibold text-gray-900">Chats per day</h2>
        <div className="flex h-28 items-end gap-px" role="img" aria-label={`Daily chat volume over ${days} days, peak ${peak}`}>
          {a.daily.map((d) => (
            <div key={d.date} title={`${d.date}: ${d.chats}`} className="flex-1 rounded-t bg-blue-500/80" style={{ height: `${d.chats === 0 ? 2 : Math.max(6, (d.chats / peak) * 100)}%`, opacity: d.chats === 0 ? 0.25 : 1 }} />
          ))}
        </div>
        <div className="mt-1 flex justify-between text-[11px] text-gray-400"><span>{a.daily[0]?.date}</span><span>peak {peak}/day</span><span>{a.daily[a.daily.length - 1]?.date}</span></div>
      </Card>

      <Card>
        <h2 className="mb-1 text-sm font-semibold text-gray-900">Which traffic turns into customers</h2>
        <p className="mb-3 text-xs text-gray-500">Where chat visitors came from (ad campaign, search, referral). Use it to decide where to put ad budget.</p>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[13px]">
            <thead className="text-xs uppercase text-gray-500">
              <tr><th className="py-2 pr-3">Source</th><th className="px-2 text-right">Chats</th><th className="px-2 text-right">Contacts</th><th className="px-2 text-right">Leads</th><th className="px-2 text-right">Lead %</th><th className="px-2 text-right">Booked</th><th className="pl-2 text-right">Won</th></tr>
            </thead>
            <tbody className="divide-y divide-gray-100 tabular-nums">
              {a.sources.length === 0 && <tr><td colSpan={7} className="py-6 text-center text-gray-400">No chats in this range.</td></tr>}
              {a.sources.map((s) => (
                <tr key={s.source}><td className="py-2 pr-3 font-medium text-gray-900">{s.source}</td><td className="px-2 text-right">{s.chats}</td><td className="px-2 text-right">{s.contacts}</td><td className="px-2 text-right">{s.leads}</td><td className="px-2 text-right">{s.leadRate}%</td><td className="px-2 text-right">{s.booked}</td><td className="pl-2 text-right font-semibold">{s.won}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="mb-3 text-sm font-semibold text-gray-900">By team member</h2>
          {a.owners.length === 0 ? <p className="text-sm text-gray-500">No chats owned yet. A chat is assigned to whoever sends the first reply.</p> : (
            <table className="w-full text-left text-[13px]"><thead className="text-xs uppercase text-gray-500"><tr><th className="py-2">Owner</th><th className="text-right">Chats</th><th className="text-right">Median first reply</th></tr></thead>
              <tbody className="divide-y divide-gray-100 tabular-nums">{a.owners.map((o) => <tr key={o.owner}><td className="py-2 text-gray-900">{o.owner.split("@")[0]}</td><td className="text-right">{o.chats}</td><td className="text-right">{formatMinutes(o.medianMinutes)}</td></tr>)}</tbody></table>
          )}
        </Card>
        <Card>
          <h2 className="mb-3 text-sm font-semibold text-gray-900">Visitor language</h2>
          <ul className="space-y-1.5 text-[13px]">
            {a.languages.map((l) => <li key={l.language} className="flex justify-between"><span>{l.language}</span><span className="tabular-nums text-gray-600">{l.chats} ({pctOf(l.chats, a.totalChats)}%)</span></li>)}
            {a.languages.length === 0 && <li className="text-gray-400">No chats in this range.</li>}
          </ul>
        </Card>
      </div>
    </div>
  );
}

const pctOf = (n: number, d: number) => (d > 0 ? Math.round((n / d) * 100) : 0);
