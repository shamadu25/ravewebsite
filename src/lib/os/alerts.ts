import { prisma } from "@/lib/prisma";
import { ORG_ID } from "./constants";
import { notifyCeo } from "./notify";

export async function raiseAlert(a: { severity: string; category: string; title: string; body?: string; dedupeKey?: string }) {
  if (a.dedupeKey) {
    const open = await prisma.osAlert.findFirst({ where: { orgId: ORG_ID, dedupeKey: a.dedupeKey, resolvedAt: null } });
    if (open) return open;
    await prisma.osAlert.deleteMany({ where: { orgId: ORG_ID, dedupeKey: a.dedupeKey, NOT: { resolvedAt: null } } });
  }
  const alert = await prisma.osAlert.create({ data: { orgId: ORG_ID, severity: a.severity, category: a.category, title: a.title, body: a.body ?? null, dedupeKey: a.dedupeKey ?? null } });
  if (a.severity === "CRITICAL" || a.severity === "HIGH") {
    await notifyCeo(`${a.severity}: ${a.title}`, `${a.category}\n\n${a.body ?? ""}`, a.dedupeKey ?? `alert:${alert.id}`).catch(() => false);
  }
  return alert;
}
