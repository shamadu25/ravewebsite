import { prisma } from "@/lib/prisma";
import { getMailTransporter, notificationRecipient, isMailConfigured } from "@/lib/mail/transporter";
import { ORG_ID } from "./constants";

const DAILY_CAP = 10;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://ravesoftsolutions.com";

/**
 * Intelligent notifications (spec §60): email the CEO only for things that warrant it, deduped per key and
 * capped per day so the inbox is never spammed. Returns whether an email was actually sent.
 */
export async function notifyCeo(subject: string, text: string, dedupeKey: string): Promise<boolean> {
  if (!isMailConfigured()) return false;
  const since = new Date(Date.now() - 86400_000);
  const recent = await prisma.osAuditLog.findMany({ where: { orgId: ORG_ID, action: "notify.sent", createdAt: { gte: since } }, select: { resourceId: true } });
  if (recent.length >= DAILY_CAP || recent.some((r) => r.resourceId === dedupeKey)) return false;
  try {
    await getMailTransporter().sendMail({ from: process.env.SMTP_FROM ?? process.env.SMTP_USER, to: notificationRecipient(), subject: `[RaveSoft OS] ${subject.replace(/[\r\n]+/g, " ")}`, text: `${text}\n\n${APP_URL}/admin` });
  } catch (e) {
    console.error("[os.notify] failed", e);
    return false;
  }
  const { audit } = await import("./audit");
  await audit({ actor: "system", actorType: "SYSTEM", action: "notify.sent", resource: "notification", resourceId: dedupeKey, input: { subject } });
  return true;
}
