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

export type ChatView = "all" | "awaiting" | "leads" | "no_contact";
export type ChatChannel = "website" | "all";

export interface ChatFilters {
  q: string;
  status: string; // "all" | CHAT_STATUSES
  view: ChatView;
  channel: ChatChannel;
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
    view: (["awaiting", "leads", "no_contact"] as const).find((v) => v === view) ?? "all",
    channel: first(sp.channel) === "all" ? "all" : "website",
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

export const startOfToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

export function stageLabel(stage: string): string {
  return stage.replace(/_/g, " ");
}

export const hoursAgo = (h: number) => new Date(Date.now() - h * 3_600_000);
