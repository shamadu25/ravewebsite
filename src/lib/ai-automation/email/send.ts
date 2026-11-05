/**
 * Email delivery with an honest status model:
 *   QUEUED → ACCEPTED (SMTP server took it — NOT proof of delivery) → DELIVERED / BOUNCED (only from a provider event) | FAILED.
 * Unique dedupeKey prevents duplicate customer emails; failures throw so the job queue retries with backoff.
 */
import { prisma } from "@/lib/prisma";
import { getMailTransporter } from "@/lib/mail/transporter";
import type { RenderedEmail } from "./render";
import { cleanHeader } from "./render";

export interface SendInput {
  dedupeKey: string; kind: string; to: string; email: RenderedEmail; leadId?: number | null; proposalId?: number | null;
  attachments?: Array<{ filename: string; content: Buffer; contentType: string }>;
  /** Injectable for tests. */
  transport?: { sendMail(o: Record<string, unknown>): Promise<{ messageId?: string }> };
}
export type SendOutcome = { status: "ACCEPTED" | "SKIPPED_DUPLICATE"; logId: number };

export const smtpConfigured = () => Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
const isUnique = (e: unknown) => typeof e === "object" && e !== null && (e as { code?: string }).code === "P2002";

export async function sendEmail(i: SendInput): Promise<SendOutcome> {
  let log = await prisma.aiEmailLog.findUnique({ where: { dedupeKey: i.dedupeKey } });
  if (log && (log.status === "ACCEPTED" || log.status === "DELIVERED")) return { status: "SKIPPED_DUPLICATE", logId: log.id };
  if (!log) {
    try {
      log = await prisma.aiEmailLog.create({ data: { dedupeKey: i.dedupeKey, kind: i.kind, toEmail: i.to, subject: cleanHeader(i.email.subject), status: "QUEUED", leadId: i.leadId ?? null, proposalId: i.proposalId ?? null } });
    } catch (e) {
      if (!isUnique(e)) throw e;
      log = await prisma.aiEmailLog.findUniqueOrThrow({ where: { dedupeKey: i.dedupeKey } });
      if (log.status === "ACCEPTED" || log.status === "DELIVERED") return { status: "SKIPPED_DUPLICATE", logId: log.id };
    }
  }
  const attempts = log.attempts + 1;
  try {
    if (!i.transport && !smtpConfigured()) throw new Error("SMTP is not configured (SMTP_HOST / SMTP_USER / SMTP_PASS).");
    const transport = i.transport ?? getMailTransporter();
    const from = process.env.SMTP_FROM ?? process.env.SMTP_USER;
    const info = await transport.sendMail({ from: `"RaveSoft Digital Solutions" <${from}>`, to: i.to, replyTo: process.env.REPLY_TO || from, subject: cleanHeader(i.email.subject), html: i.email.html, text: i.email.text, attachments: i.attachments });
    await prisma.aiEmailLog.update({ where: { id: log.id }, data: { status: "ACCEPTED", providerMessageId: info.messageId?.slice(0, 200) ?? null, attempts, error: null, acceptedAt: new Date() } });
    return { status: "ACCEPTED", logId: log.id };
  } catch (e) {
    const msg = (e instanceof Error ? e.message : String(e)).slice(0, 580);
    await prisma.aiEmailLog.update({ where: { id: log.id }, data: { status: "FAILED", attempts, error: msg } });
    throw new Error(`Email failed (${i.kind}): ${msg}`);
  }
}

/** Provider event (delivered / bounced) → log. The ONLY place DELIVERED is ever set. */
export async function recordDeliveryEvent(messageId: string, event: "delivered" | "bounced"): Promise<boolean> {
  const log = await prisma.aiEmailLog.findFirst({ where: { providerMessageId: messageId } });
  if (!log) return false;
  await prisma.aiEmailLog.update({ where: { id: log.id }, data: event === "delivered" ? { status: "DELIVERED", deliveredAt: new Date() } : { status: "BOUNCED", error: "Bounced (provider event)" } });
  return true;
}
