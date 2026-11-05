import { getChannelAdapter } from "@/lib/os/channels";

// Instant SMS alerts to the team for the moments where minutes matter: a visitor waiting on a human, a handoff
// the AI cannot handle, a hot lead. Sent through the SMS channel adapter (Twilio). Configuration is env-only so
// phone numbers never live in the database or the browser:
//   SMS_ALERT_NUMBERS  comma-separated international numbers, e.g. "+233531561484,+233201234567" (max 5)
//   SMS_ALERT_EVENTS   which events text you (default: human_handoff,visitor_waiting,hot_lead; add new_chat)
//   SMS_DAILY_CAP      max alert messages per rolling 24h (default 40) — a cost and spam guard

export type SmsAlertKind = "new_chat" | "visitor_waiting" | "human_handoff" | "hot_lead";
export const SMS_ALERT_KINDS: SmsAlertKind[] = ["new_chat", "visitor_waiting", "human_handoff", "hot_lead"];
const DEFAULT_EVENTS: SmsAlertKind[] = ["human_handoff", "visitor_waiting", "hot_lead"];
const MAX_NUMBERS = 5;
const DEFAULT_DAILY_CAP = 40;
const APP_URL = () => process.env.NEXT_PUBLIC_APP_URL ?? "https://ravesoftsolutions.com";

const E164 = /^\+[1-9]\d{7,14}$/;

/** Valid, de-duplicated international numbers from SMS_ALERT_NUMBERS. Invalid entries are dropped, never sent to. */
export function alertNumbers(raw: string | undefined = process.env.SMS_ALERT_NUMBERS): string[] {
  const out: string[] = [];
  for (const part of (raw ?? "").split(",")) {
    const cleaned = part.replace(/[\s().-]/g, "");
    const n = cleaned.startsWith("+") ? cleaned : cleaned ? `+${cleaned}` : "";
    if (E164.test(n) && !out.includes(n)) out.push(n);
  }
  return out.slice(0, MAX_NUMBERS);
}

export function enabledEvents(raw: string | undefined = process.env.SMS_ALERT_EVENTS): SmsAlertKind[] {
  if (!raw?.trim()) return DEFAULT_EVENTS;
  const wanted = raw.split(",").map((s) => s.trim().toLowerCase());
  return SMS_ALERT_KINDS.filter((k) => wanted.includes(k));
}

export function dailyCap(raw: string | undefined = process.env.SMS_DAILY_CAP): number {
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : DEFAULT_DAILY_CAP;
}

/** Last 4 digits only: enough for the admin to recognise a number without exposing it. */
export const maskNumber = (n: string) => `${n.slice(0, 4)}•••${n.slice(-3)}`;

/** Accents → base letters, smart punctuation → ASCII, everything else non-ASCII dropped. Keeps SMS in cheap 7-bit segments. */
export function smsSafe(text: string): string {
  return text
    .replace(/[‘’‛]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, "-")
    .replace(/…/g, "...")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^\x20-\x7E]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const LABEL: Record<SmsAlertKind, string> = {
  new_chat: "New chat",
  visitor_waiting: "Visitor waiting",
  human_handoff: "HANDOFF needs a human",
  hot_lead: "HOT LEAD",
};

export interface SmsAlertInput {
  /** Visitor / lead name, if known. */
  name?: string | null;
  /** What they said, or why it was escalated. */
  detail?: string | null;
  /** Path inside the app, e.g. /admin/conversations/abc. */
  path: string;
  /** Extra short fact, e.g. "score 91". */
  extra?: string | null;
}

/** One alert SMS: label, name, a trimmed quote of what happened, and the link. Stays within ~2 segments. */
export function buildAlertSms(kind: SmsAlertKind, input: SmsAlertInput): string {
  const head = [`RaveSoft: ${LABEL[kind]}`, input.name ? smsSafe(input.name).slice(0, 40) : null, input.extra ? smsSafe(input.extra).slice(0, 30) : null]
    .filter(Boolean)
    .join(" - ");
  const link = `${APP_URL()}${input.path}`;
  const budget = Math.max(0, 300 - head.length - link.length - 6); // separators + quotes
  let detail = smsSafe(input.detail ?? "");
  if (detail.length > budget) detail = `${detail.slice(0, Math.max(0, budget - 3)).trimEnd()}...`;
  return `${head}${detail ? `: "${detail}"` : ""}\n${link}`;
}

export type SmsAlertResult = { sent: number; failed: number; skipped?: string };

/**
 * Texts every alert number for `kind`. Best-effort and never throws: a failed SMS must not affect a visitor or a
 * lead. Skips quietly when SMS is not configured, the event is not enabled, or the 24h cap is reached.
 */
export async function sendSmsAlert(kind: SmsAlertKind, input: SmsAlertInput): Promise<SmsAlertResult> {
  try {
    if (!enabledEvents().includes(kind)) return { sent: 0, failed: 0, skipped: "event not enabled" };
    const numbers = alertNumbers();
    if (!numbers.length) return { sent: 0, failed: 0, skipped: "no SMS_ALERT_NUMBERS" };
    const sms = getChannelAdapter("SMS");
    if (!sms.status().connected) return { sent: 0, failed: 0, skipped: "SMS provider not connected" };

    const { prisma } = await import("@/lib/prisma");
    const { ORG_ID } = await import("@/lib/os/constants");
    const since = new Date(Date.now() - 86_400_000);
    const used = await prisma.osAuditLog.count({ where: { orgId: ORG_ID, action: "sms.alert", createdAt: { gte: since } } });
    const cap = dailyCap();
    if (used >= cap) return { sent: 0, failed: 0, skipped: "daily cap reached" };

    const body = buildAlertSms(kind, input);
    const results = await Promise.all(numbers.slice(0, Math.max(0, cap - used)).map((to) => sms.send({ to, body })));
    const sent = results.filter((r) => r.ok).length;
    const failed = results.length - sent;
    const { audit } = await import("@/lib/os/audit");
    // One audit row per message sent: the rolling cap above counts these.
    for (let i = 0; i < sent; i++) {
      await audit({ actor: "system", actorType: "SYSTEM", action: "sms.alert", resource: "sms", resourceId: kind, input: { kind } });
    }
    if (failed) {
      const firstError = results.find((r) => !r.ok) as { error: string } | undefined;
      console.error("[sms] alert delivery failed", { kind, failed, error: firstError?.error });
    }
    return { sent, failed };
  } catch (error) {
    console.error("[sms] alert failed", error);
    return { sent: 0, failed: 0, skipped: "error" };
  }
}
