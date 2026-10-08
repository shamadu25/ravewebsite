import { prisma } from "@/lib/prisma";
import { ORG_ID } from "./constants";

export interface ActivityItem { id: number; title: string; detail: string; at: Date; href: string | null; tone: "default" | "success" | "danger" }

/** Human-readable feed derived from the audit trail (the single source of truth); every row links to its object. */
export async function recentActivity(limit = 6): Promise<ActivityItem[]> {
  const rows = await prisma.osAuditLog.findMany({ where: { orgId: ORG_ID, result: { not: "DENIED" } }, orderBy: { id: "desc" }, take: 120 });
  const oppIds = [...new Set(rows.filter((r) => r.resource === "opportunity" && r.resourceId).map((r) => Number(r.resourceId)))];
  const opps = oppIds.length ? await prisma.osOpportunity.findMany({ where: { id: { in: oppIds } }, select: { id: true, companyName: true } }) : [];
  const name = (id: string | null) => opps.find((o) => String(o.id) === id)?.companyName ?? "Opportunity";
  const out: ActivityItem[] = [];
  let doneTasks: typeof rows = [];
  const flushTasks = () => {
    if (!doneTasks.length) return;
    const names = [...new Set(doneTasks.map((r) => r.actor.replace(/^agent:/, "").replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())))];
    out.push({ id: doneTasks[0].id, title: `${doneTasks.length} task${doneTasks.length > 1 ? "s" : ""} completed`, detail: names.slice(0, 3).join(", ") + (names.length > 3 ? ` +${names.length - 3}` : ""), at: doneTasks[0].createdAt, href: "/admin/tasks?status=COMPLETED", tone: "success" });
    doneTasks = [];
  };
  for (const r of rows) {
    if (r.action === "task.complete") { doneTasks.push(r); continue; }
    flushTasks();
    const stage = (r.input as { to?: string } | null)?.to;
    const amt = (r.input as { amountCents?: number } | null)?.amountCents;
    let item: Omit<ActivityItem, "id" | "at"> | null = null;
    switch (r.action) {
      case "opportunity.create": item = { title: "New prospect added", detail: name(r.resourceId), href: `/admin/revenue/${r.resourceId}`, tone: "default" }; break;
      case "opportunity.research": item = { title: "Prospect researched", detail: `${name(r.resourceId)} · score ${(r.output as { score?: number } | null)?.score ?? "—"}`, href: `/admin/revenue/${r.resourceId}`, tone: "default" }; break;
      case "opportunity.stage_change": item = { title: stage === "WON" ? "Deal won" : stage === "QUALIFIED" ? "Lead qualified" : `Moved to ${(stage ?? "").replace(/_/g, " ").toLowerCase()}`, detail: name(r.resourceId), href: `/admin/revenue/${r.resourceId}`, tone: stage === "WON" ? "success" : "default" }; break;
      case "revenue.payment_recorded": item = { title: "Payment received", detail: amt ? `$${(amt / 100).toLocaleString()}` : "", href: "/admin/customers", tone: "success" }; break;
      case "outreach.send": item = r.result === "SUCCESS" ? { title: "Outreach sent", detail: String((r.output as { channel?: string } | null)?.channel ?? ""), href: "/admin/revenue", tone: "default" } : { title: "Outreach not sent", detail: String((r.output as { reason?: string } | null)?.reason ?? "See details"), href: "/admin/revenue", tone: "danger" }; break;
      case "approval.requested": item = { title: "Approval requested", detail: String((r.input as { title?: string } | null)?.title ?? ""), href: "/admin/approvals", tone: "default" }; break;
      case "approval.approve": case "approval.reject": item = { title: r.action === "approval.approve" ? "Approval granted" : "Approval rejected", detail: `by ${r.actor}`, href: "/admin/approvals", tone: "default" }; break;
      case "task.fail": item = { title: "A task failed", detail: r.actor.replace(/^agent:/, ""), href: `/admin/tasks/${r.resourceId}`, tone: "danger" }; break;
      case "commander.loop": item = { title: "Operating loop ran", detail: "Priorities refreshed", href: "/admin", tone: "default" }; break;
      case "workflow.start": item = { title: "Workflow started", detail: String(r.resourceId ?? ""), href: "/admin/workflows", tone: "default" }; break;
      case "product.batch": item = { title: "Product events received", detail: `${(r.input as { new?: number } | null)?.new ?? 0} new · ${r.actor.replace("product:", "")}`, href: "/admin/products", tone: "default" }; break;
    }
    if (item) out.push({ id: r.id, at: r.createdAt, ...item });
    if (out.length >= limit) break;
  }
  flushTasks();
  return out.slice(0, limit);
}
