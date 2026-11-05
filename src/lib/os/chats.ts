import type { Prisma } from "@prisma/client";

/** Lead stages an admin can set. Includes the two stages the Calendly webhook already writes. */
export const LEAD_STAGES = [
  "new",
  "contacted",
  "qualified",
  "proposal_sent",
  "consultation_booked",
  "consultation_canceled",
  "won",
  "lost",
] as const;
export type LeadStage = (typeof LEAD_STAGES)[number];

/** "human_active": a team member has replied, so the AI stays silent until the chat is handed back. */
export const HUMAN_ACTIVE = "human_active";
export const CHAT_STATUSES = ["open", "human_handoff", HUMAN_ACTIVE, "closed"] as const;
export const PAGE_SIZE = 50;
/** Chats scanned in memory for the "awaiting reply" view (last-message role cannot be filtered in SQL). */
export const AWAITING_SCAN_LIMIT = 400;

export type ChatView = "all" | "awaiting" | "leads" | "no_contact" | "unassigned";
export type ChatSort = "recent" | "score";
export type ChatChannel = "website" | "all";

export interface ChatFilters {
  q: string;
  status: string; // "all" | CHAT_STATUSES
  view: ChatView;
  channel: ChatChannel;
  sort: ChatSort;
  page: number;
}

type Raw = Record<string, string | string[] | undefined>;
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export function parseChatFilters(sp: Raw): ChatFilters {
  const status = first(sp.status) ?? "all";
  const view = first(sp.view) ?? "all";
  const page = Number(first(sp.page) ?? 1);
  return {
    q: (first(sp.q) ?? "").trim().slice(0, 100),
    status: (CHAT_STATUSES as readonly string[]).includes(status) ? status : "all",
    view: (["awaiting", "leads", "no_contact", "unassigned"] as const).find((v) => v === view) ?? "all",
    channel: first(sp.channel) === "all" ? "all" : "website",
    sort: first(sp.sort) === "score" ? "score" : "recent",
    page: Number.isInteger(page) && page > 0 ? page : 1,
  };
}

/** SQL-side filter for the conversations list. The "awaiting" view is applied afterwards in memory. */
export function buildConversationWhere(f: ChatFilters): Prisma.ConversationWhereInput {
  const and: Prisma.ConversationWhereInput[] = [];
  if (f.channel === "website") and.push({ channel: { not: "demo" } });
  if (f.status !== "all") and.push({ status: f.status });
  if (f.view === "leads") and.push({ leads: { some: {} } });
  if (f.view === "no_contact") and.push({ contactId: null });
  if (f.view === "unassigned") and.push({ assignee: null }, { status: { not: "closed" } });
  if (f.q) {
    and.push({
      OR: [
        { contact: { is: { firstName: { contains: f.q } } } },
        { contact: { is: { lastName: { contains: f.q } } } },
        { contact: { is: { email: { contains: f.q } } } },
        { contact: { is: { whatsapp: { contains: f.q } } } },
        { contact: { is: { phone: { contains: f.q } } } },
        { messages: { some: { content: { contains: f.q } } } },
      ],
    });
  }
  return and.length ? { AND: and } : {};
}

/**
 * A chat needs a human when it was handed off and not closed, or when the newest message is
 * from the visitor and nobody (AI or human) has answered it yet.
 */
export function isAwaitingReply(c: { status: string; lastRole: string | null }): boolean {
  if (c.status === "closed") return false;
  if (c.status === HUMAN_ACTIVE) return c.lastRole === "visitor";
  return c.status === "human_handoff" || c.lastRole === "visitor";
}

export function contactName(c: { firstName: string | null; lastName: string | null } | null | undefined): string | null {
  if (!c) return null;
  return [c.firstName, c.lastName].filter(Boolean).join(" ") || null;
}

export function roleLabel(role: string): string {
  if (role === "visitor") return "Visitor";
  if (role === "agent") return "Team";
  return "Ama (AI)";
}

export interface TranscriptMessage {
  role: string;
  content: string;
  createdAt: Date;
}

/** Plain-text transcript for download / archiving. */
export function buildTranscript(
  header: { externalId: string; visitor: string; startedAt: Date; landingPage: string | null; contact: string | null },
  messages: TranscriptMessage[]
): string {
  const lines = [
    `RaveSoft live chat transcript`,
    `Conversation: ${header.externalId}`,
    `Visitor: ${header.visitor}`,
    `Contact: ${header.contact ?? "not captured"}`,
    `Started: ${header.startedAt.toISOString()}`,
    `Landing page: ${header.landingPage ?? "—"}`,
    "",
  ];
  for (const m of messages) lines.push(`[${m.createdAt.toISOString()}] ${roleLabel(m.role)}: ${m.content}`);
  return lines.join("\n") + "\n";
}

/** Plain-text copy of a chat for the visitor themselves (no internal ids). */
export function buildVisitorTranscript(messages: TranscriptMessage[], lang: "en" | "fr" = "en"): string {
  const who =
    lang === "fr"
      ? { visitor: "Vous", agent: "Équipe RaveSoft", assistant: "Ama (assistante IA)" }
      : { visitor: "You", agent: "RaveSoft team", assistant: "Ama (AI assistant)" };
  const label = (role: string) => (role === "visitor" ? who.visitor : role === "agent" ? who.agent : who.assistant);
  return messages.map((m) => `${label(m.role)}: ${m.content}`).join("\n\n");
}

export const startOfToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

export function stageLabel(stage: string): string {
  return stage.replace(/_/g, " ");
}

export const hoursAgo = (h: number) => new Date(Date.now() - h * 3_600_000);

// ── SLA timer ─────────────────────────────────────────────────────────────

/** A visitor waiting longer than this has been left too long. */
export const SLA_WARN_MINUTES = 5;
export const SLA_BREACH_MINUTES = 15;
export type SlaLevel = "ok" | "warn" | "breach";

export function waitingMinutes(since: Date | null | undefined, now = Date.now()): number {
  if (!since) return 0;
  return Math.max(0, Math.floor((now - since.getTime()) / 60_000));
}

export function slaLevel(minutes: number): SlaLevel {
  if (minutes >= SLA_BREACH_MINUTES) return "breach";
  if (minutes >= SLA_WARN_MINUTES) return "warn";
  return "ok";
}

export function formatWaiting(minutes: number): string {
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  return h < 24 ? `${h}h ${minutes % 60}m` : `${Math.floor(h / 24)}d`;
}

export const SLA_STYLES: Record<SlaLevel, string> = {
  ok: "bg-green-100 text-green-700",
  warn: "bg-amber-100 text-amber-800",
  breach: "bg-red-100 text-red-700",
};

// ── Where did this visitor come from? ─────────────────────────────────────

export interface SourceInput {
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
  referrer?: string | null;
}

const PAID_MEDIUMS = /^(cpc|ppc|paid|paid_social|paidsocial|ads?|display|cpm)$/i;

/** Human label for the acquisition source of a chat, e.g. "Facebook/Instagram ad · get-started-gh". */
export function attributionLabel(s: SourceInput | null | undefined): string {
  if (!s) return "Direct";
  const src = (s.utmSource ?? "").trim().toLowerCase();
  const medium = (s.utmMedium ?? "").trim().toLowerCase();
  const campaign = (s.utmCampaign ?? "").trim();
  const host = hostOf(s.referrer);

  const social = (name: string) => src.includes(name) || host?.includes(name);
  let base: string | null = null;

  if (src) {
    const paid = PAID_MEDIUMS.test(medium);
    if (/(^|[^a-z])(fb|facebook|meta|ig|instagram)([^a-z]|$)/.test(src) || src.includes("facebook") || src.includes("instagram")) {
      base = paid || !medium ? "Facebook/Instagram ad" : "Facebook/Instagram";
    } else if (src.includes("google")) base = paid ? "Google ad" : "Google";
    else if (src.includes("linkedin")) base = paid ? "LinkedIn ad" : "LinkedIn";
    else if (src.includes("whatsapp")) base = "WhatsApp";
    else if (src.includes("tiktok")) base = paid ? "TikTok ad" : "TikTok";
    else if (src.includes("email") || medium === "email") base = "Email";
    else base = paid ? `${s.utmSource} ad` : (s.utmSource as string);
  } else if (host) {
    if (social("facebook") || social("instagram") || host.includes("fb.")) base = "Facebook/Instagram";
    else if (host.includes("google.")) base = "Google search";
    else if (host.includes("linkedin.")) base = "LinkedIn";
    else if (host.includes("t.co") || host.includes("twitter.") || host.includes("x.com")) base = "X/Twitter";
    else if (host.includes("whatsapp.")) base = "WhatsApp";
    else base = `Referral · ${host}`;
  }

  if (!base) return "Direct";
  return campaign ? `${base} · ${campaign}` : base;
}

function hostOf(referrer: string | null | undefined): string | null {
  if (!referrer) return null;
  try {
    return new URL(referrer).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return null;
  }
}

// ── Lead score snapshot ───────────────────────────────────────────────────

export const SCORE_STYLES: Record<string, string> = {
  hot: "bg-red-100 text-red-700",
  sales_qualified: "bg-orange-100 text-orange-700",
  qualified: "bg-amber-100 text-amber-800",
  nurture: "bg-blue-100 text-blue-700",
  low: "bg-gray-100 text-gray-600",
};

/** Highest lead score among a chat's leads (a chat normally has one), or null when it has none. */
export function topScore(leads: Array<{ scores: Array<{ totalScore: number; level: string }> }> | undefined): { score: number; level: string } | null {
  let best: { score: number; level: string } | null = null;
  for (const l of leads ?? []) {
    const s = l.scores[0];
    if (s && (!best || s.totalScore > best.score)) best = { score: s.totalScore, level: s.level };
  }
  return best;
}
