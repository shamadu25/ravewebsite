import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { ORG_ID } from "@/lib/os/constants";
import { hoursAgo } from "@/lib/os/time";

/** Single calm line that answers "what needs me?" — renders nothing when nothing does. */
export default async function AttentionStrip() {
  const [approvals, alerts, failed] = await Promise.all([
    prisma.osApproval.count({ where: { orgId: ORG_ID, status: { in: ["PENDING", "INFO_REQUESTED"] } } }),
    prisma.osAlert.count({ where: { orgId: ORG_ID, resolvedAt: null, severity: { in: ["HIGH", "CRITICAL"] } } }),
    prisma.osTask.count({ where: { orgId: ORG_ID, status: "FAILED", deadLetter: true, completedAt: { gte: hoursAgo(24) } } }),
  ]);
  const parts = [
    approvals && { href: "/admin/approvals", text: `${approvals} approval${approvals > 1 ? "s" : ""} waiting` },
    alerts && { href: "/admin/operations", text: `${alerts} high-severity alert${alerts > 1 ? "s" : ""}` },
    failed && { href: "/admin/tasks?status=FAILED", text: `${failed} failed task${failed > 1 ? "s" : ""} (24h)` },
  ].filter(Boolean) as Array<{ href: string; text: string }>;
  if (!parts.length) return null;
  return (
    <div role="status" className="flex flex-wrap items-center gap-x-5 gap-y-1 rounded-[14px] border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] text-amber-900">
      <span className="font-medium">Needs your attention</span>
      {parts.map((p) => <Link key={p.href} href={p.href} className="underline-offset-2 hover:underline">{p.text} →</Link>)}
    </div>
  );
}
