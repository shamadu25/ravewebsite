import { prisma } from "@/lib/prisma";
import { sendChatActivityNotification } from "@/lib/mail/notifications";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://ravesoftsolutions.com";

/** Minimum gap between "visitor is waiting" alerts for the same chat. */
export const WAITING_ALERT_GAP_MS = 10 * 60_000;

export type AlertKind = "new_chat" | "visitor_waiting";

const EVENT: Record<AlertKind, string> = {
  new_chat: "team_alert_new_chat",
  visitor_waiting: "team_alert_waiting",
};

/** Decides whether an alert is due. new_chat fires once per conversation; visitor_waiting at most once per gap. */
export async function alertDue(conversationId: number, kind: AlertKind, now = Date.now()): Promise<boolean> {
  const last = await prisma.conversionEvent.findFirst({
    where: { conversationId, eventType: EVENT[kind] },
    orderBy: { id: "desc" },
  });
  if (!last) return true;
  return kind === "visitor_waiting" && now - last.occurredAt.getTime() >= WAITING_ALERT_GAP_MS;
}

async function postSlack(text: string): Promise<void> {
  const url = process.env.SLACK_WEBHOOK_URL;
  if (!url) return;
  await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
    signal: AbortSignal.timeout(8_000),
  });
}

export interface ChatAlertInput {
  conversationId: number;
  externalId: string;
  contactId: number | null;
  page: string | null;
  message: string;
}

/**
 * Best-effort instant alert (email, plus Slack when SLACK_WEBHOOK_URL is set). Never throws: a failed
 * alert must not affect the visitor. The alert is recorded as an event so it is throttled and auditable.
 */
export async function alertTeam(kind: AlertKind, input: ChatAlertInput): Promise<boolean> {
  try {
    if (!(await alertDue(input.conversationId, kind))) return false;
    // Record first so concurrent messages cannot trigger duplicate alerts.
    await prisma.conversionEvent.create({
      data: { conversationId: input.conversationId, contactId: input.contactId, eventType: EVENT[kind], occurredAt: new Date() },
    });
    const contact = input.contactId ? await prisma.contact.findUnique({ where: { id: input.contactId } }) : null;
    const visitorName = contact ? [contact.firstName, contact.lastName].filter(Boolean).join(" ") || contact.email || null : null;
    const preview = input.message.slice(0, 300);
    const link = `${APP_URL}/admin/conversations/${input.externalId}`;
    await Promise.allSettled([
      sendChatActivityNotification({ kind, conversationExternalId: input.externalId, visitorName, page: input.page, preview }),
      postSlack(`${kind === "new_chat" ? "💬 New website chat" : "⏳ Visitor waiting"}${visitorName ? ` — ${visitorName}` : ""}\n> ${preview}\n${link}`),
    ]);
    return true;
  } catch (error) {
    console.error("[teamAlerts] failed", error);
    return false;
  }
}

/** Runs work after the response is sent when possible (so alerts never slow the visitor down). */
export function inBackground(work: () => Promise<unknown>): void {
  const run = () => work().catch((e) => console.error("[background] failed", e));
  import("next/server")
    .then(({ after }) => {
      try {
        after(run);
      } catch {
        void run(); // outside a request scope (scripts, tests)
      }
    })
    .catch(() => void run());
}
