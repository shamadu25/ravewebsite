import { api } from "@/lib/os/http";
import { prisma } from "@/lib/prisma";
import { ORG_ID } from "@/lib/os/constants";
import { can } from "@/lib/os/rbac";

/** "Unread" = items that still need a human: pending approvals + unresolved alerts. Acting on an item clears it. */
export const GET = api("os.read", async ({ caller }) => {
  const [approvals, alerts] = await Promise.all([
    can(caller.role, "approval.read") ? prisma.osApproval.findMany({ where: { orgId: ORG_ID, status: { in: ["PENDING", "INFO_REQUESTED"] } }, orderBy: { id: "desc" }, take: 8 }) : [],
    prisma.osAlert.findMany({ where: { orgId: ORG_ID, resolvedAt: null }, orderBy: { id: "desc" }, take: 8 }),
  ]);
  const items = [
    ...approvals.map((a) => ({ id: `a${a.id}`, kind: "approval" as const, rawId: a.id, title: a.title, detail: `Approval · ${a.kind.replace(/_/g, " ").toLowerCase()}`, href: "/admin/approvals", at: a.createdAt })),
    ...alerts.map((a) => ({ id: `l${a.id}`, kind: "alert" as const, rawId: a.id, title: a.title, detail: `${a.severity} · ${a.category}`, href: "/admin/operations", at: a.createdAt })),
  ].sort((x, y) => y.at.getTime() - x.at.getTime());
  return { count: items.length, items: items.slice(0, 10) };
});
