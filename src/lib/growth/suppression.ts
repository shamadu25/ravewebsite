import { prisma } from "@/lib/prisma";
import { GROWTH_ORG } from "./config";

export type SuppressionKind = "EMAIL" | "DOMAIN";
export const emailDomain = (e: string) => e.split("@")[1]?.toLowerCase() ?? "";

/** Combines growth suppressions with the platform-wide opt-out list. Returns the reason, or null if clear. */
export async function suppressionReason(email: string, domain?: string | null): Promise<string | null> {
  const e = email.toLowerCase(), d = (domain ?? emailDomain(e)).toLowerCase();
  const row = await prisma.grSuppression.findFirst({ where: { orgId: GROWTH_ORG, OR: [{ kind: "EMAIL", value: e }, { kind: "DOMAIN", value: d }] } });
  if (row) return `Suppressed (${row.kind.toLowerCase()}): ${row.reason}`;
  const opt = await prisma.osOptOut.findFirst({ where: { orgId: GROWTH_ORG, channel: "EMAIL", address: e } });
  return opt ? "Recipient opted out." : null;
}

export async function suppress(kind: SuppressionKind, value: string, reason: string, by: string) {
  const v = value.toLowerCase();
  await prisma.grSuppression.upsert({ where: { orgId_kind_value: { orgId: GROWTH_ORG, kind, value: v } }, create: { orgId: GROWTH_ORG, kind, value: v, reason, createdBy: by }, update: {} });
  if (kind === "EMAIL") {
    await prisma.osOptOut.upsert({ where: { orgId_channel_address: { orgId: GROWTH_ORG, channel: "EMAIL", address: v } }, create: { orgId: GROWTH_ORG, channel: "EMAIL", address: v, reason }, update: {} });
  }
  // Stop-condition: cancel every unsent message to this recipient/domain.
  const pending = await prisma.grOutbox.findMany({ where: { status: { in: ["SCHEDULED", "SENDING"] }, ...(kind === "EMAIL" ? { toEmail: v } : { toEmail: { endsWith: `@${v}` } }) }, select: { id: true } });
  if (pending.length) await prisma.grOutbox.updateMany({ where: { id: { in: pending.map((p) => p.id) }, status: "SCHEDULED" }, data: { status: "CANCELLED", cancelReason: `suppression: ${reason}` } });
  return { cancelled: pending.length };
}
