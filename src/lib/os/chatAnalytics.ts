import { attributionLabel, type SourceInput } from "./chats";

/** One website chat with just the fields the analytics need. */
export interface AnalyticsChat {
  createdAt: Date;
  contactId: number | null;
  assignee: string | null;
  language: string | null;
  firstAgentReplyAt: Date | null;
  rating: number | null;
  source: SourceInput | null;
  leads: Array<{ stage: string; booked: boolean; score: { totalScore: number; level: string } | null }>;
}

export interface FunnelStep {
  key: "chats" | "contact" | "lead" | "booked" | "won";
  label: string;
  count: number;
  /** Share of all chats (0-100). */
  ofChats: number;
  /** Share of the previous step (0-100); null for the first step. */
  ofPrevious: number | null;
}

export interface SourceRow {
  source: string;
  chats: number;
  contacts: number;
  leads: number;
  booked: number;
  won: number;
  /** chats → lead, 0-100 */
  leadRate: number;
}

export interface ChatAnalytics {
  days: number;
  totalChats: number;
  funnel: FunnelStep[];
  hotLeads: number;
  response: { measured: number; medianMinutes: number | null; avgMinutes: number | null; under5Share: number | null; humanShare: number };
  rating: { count: number; average: number | null; distribution: Record<1 | 2 | 3 | 4 | 5, number>; responseRate: number };
  daily: Array<{ date: string; chats: number }>;
  sources: SourceRow[];
  owners: Array<{ owner: string; chats: number; measured: number; medianMinutes: number | null }>;
  languages: Array<{ language: string; chats: number }>;
}

const pct = (n: number, d: number) => (d > 0 ? Math.round((n / d) * 1000) / 10 : 0);
const round1 = (n: number) => Math.round(n * 10) / 10;

export function median(values: number[]): number | null {
  if (!values.length) return null;
  const v = [...values].sort((a, b) => a - b);
  const mid = Math.floor(v.length / 2);
  return v.length % 2 ? v[mid] : (v[mid - 1] + v[mid]) / 2;
}

const isHot = (level: string) => level === "hot" || level === "sales_qualified";
const isBooked = (l: AnalyticsChat["leads"][number]) => l.booked || l.stage === "consultation_booked" || l.stage === "won";

/** Minutes from chat start to the first human reply (never negative). */
export function firstReplyMinutes(c: Pick<AnalyticsChat, "createdAt" | "firstAgentReplyAt">): number | null {
  if (!c.firstAgentReplyAt) return null;
  return Math.max(0, (c.firstAgentReplyAt.getTime() - c.createdAt.getTime()) / 60_000);
}

const dayKey = (d: Date) => d.toISOString().slice(0, 10);

export function computeChatAnalytics(chats: AnalyticsChat[], days: number, now = new Date()): ChatAnalytics {
  const total = chats.length;
  const withContact = chats.filter((c) => c.contactId != null).length;
  const withLead = chats.filter((c) => c.leads.length > 0).length;
  const booked = chats.filter((c) => c.leads.some(isBooked)).length;
  const won = chats.filter((c) => c.leads.some((l) => l.stage === "won")).length;

  const steps: Array<[FunnelStep["key"], string, number]> = [
    ["chats", "Chats started", total],
    ["contact", "Left contact details", withContact],
    ["lead", "Became a lead", withLead],
    ["booked", "Booked a call", booked],
    ["won", "Won", won],
  ];
  const funnel: FunnelStep[] = steps.map(([key, label, count], i) => ({
    key,
    label,
    count,
    ofChats: pct(count, total),
    ofPrevious: i === 0 ? null : pct(count, steps[i - 1][2]),
  }));

  const mins = chats.map(firstReplyMinutes).filter((m): m is number => m != null);
  const med = median(mins);

  const rated = chats.filter((c) => c.rating != null);
  const distribution: Record<1 | 2 | 3 | 4 | 5, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const c of rated) if (c.rating! >= 1 && c.rating! <= 5) distribution[c.rating as 1 | 2 | 3 | 4 | 5] += 1;
  const ratedCount = Object.values(distribution).reduce((a, b) => a + b, 0);

  // Daily volume: every day in the window, zero-filled, oldest first.
  const byDay = new Map<string, number>();
  for (let i = days - 1; i >= 0; i--) byDay.set(dayKey(new Date(now.getTime() - i * 86_400_000)), 0);
  for (const c of chats) {
    const k = dayKey(c.createdAt);
    if (byDay.has(k)) byDay.set(k, (byDay.get(k) ?? 0) + 1);
  }

  const srcMap = new Map<string, SourceRow>();
  for (const c of chats) {
    const label = attributionLabel(c.source);
    const row = srcMap.get(label) ?? { source: label, chats: 0, contacts: 0, leads: 0, booked: 0, won: 0, leadRate: 0 };
    row.chats += 1;
    if (c.contactId != null) row.contacts += 1;
    if (c.leads.length) row.leads += 1;
    if (c.leads.some(isBooked)) row.booked += 1;
    if (c.leads.some((l) => l.stage === "won")) row.won += 1;
    srcMap.set(label, row);
  }
  const sources = [...srcMap.values()]
    .map((r) => ({ ...r, leadRate: pct(r.leads, r.chats) }))
    .sort((a, b) => b.won - a.won || b.booked - a.booked || b.leads - a.leads || b.chats - a.chats)
    .slice(0, 15);

  const ownerMap = new Map<string, number[]>();
  const ownerChats = new Map<string, number>();
  for (const c of chats) {
    if (!c.assignee) continue;
    ownerChats.set(c.assignee, (ownerChats.get(c.assignee) ?? 0) + 1);
    const m = firstReplyMinutes(c);
    if (m != null) ownerMap.set(c.assignee, [...(ownerMap.get(c.assignee) ?? []), m]);
  }
  const owners = [...ownerChats.entries()]
    .map(([owner, n]) => ({ owner, chats: n, measured: ownerMap.get(owner)?.length ?? 0, medianMinutes: median(ownerMap.get(owner) ?? []) }))
    .sort((a, b) => b.chats - a.chats);

  const langMap = new Map<string, number>();
  for (const c of chats) {
    const l = /^fr/i.test(c.language ?? "") ? "French" : c.language ? "English / other" : "Unknown";
    langMap.set(l, (langMap.get(l) ?? 0) + 1);
  }

  return {
    days,
    totalChats: total,
    funnel,
    hotLeads: chats.filter((c) => c.leads.some((l) => l.score && isHot(l.score.level))).length,
    response: {
      measured: mins.length,
      medianMinutes: med == null ? null : round1(med),
      avgMinutes: mins.length ? round1(mins.reduce((a, b) => a + b, 0) / mins.length) : null,
      under5Share: mins.length ? pct(mins.filter((m) => m < 5).length, mins.length) : null,
      humanShare: pct(mins.length, total),
    },
    rating: {
      count: ratedCount,
      average: ratedCount ? round1(rated.reduce((a, c) => a + (c.rating ?? 0), 0) / rated.length) : null,
      distribution,
      responseRate: pct(ratedCount, total),
    },
    daily: [...byDay.entries()].map(([date, n]) => ({ date, chats: n })),
    sources,
    owners,
    languages: [...langMap.entries()].map(([language, n]) => ({ language, chats: n })).sort((a, b) => b.chats - a.chats),
  };
}

export const ANALYTICS_RANGES = [7, 30, 90] as const;
export function parseRange(value: string | string[] | undefined): number {
  const v = Number(Array.isArray(value) ? value[0] : value);
  return (ANALYTICS_RANGES as readonly number[]).includes(v) ? v : 30;
}

export function formatMinutes(m: number | null): string {
  if (m == null) return "—";
  if (m < 1) return "<1 min";
  if (m < 60) return `${Math.round(m)} min`;
  const h = m / 60;
  return h < 24 ? `${round1(h)} h` : `${round1(h / 24)} d`;
}
