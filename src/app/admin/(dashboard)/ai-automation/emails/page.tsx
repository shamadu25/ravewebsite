import Link from "next/link";
import { Badge, Card, PageHeader } from "@/components/os/ui";
import { JsonEditor } from "@/components/admin-ai/controls";
import { requireAdmin } from "@/lib/ai-automation/admin-auth";
import { DEFAULT_TEMPLATES } from "@/lib/ai-automation/email/render";
import { getTemplates } from "@/lib/ai-automation/email/jobs";
import { first, fmtDate, human } from "@/lib/ai-automation/format";
import { EMAIL_STATUSES } from "@/lib/ai-automation/types";
import { can } from "@/lib/os/rbac";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AiEmails({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { user, allowed } = await requireAdmin("ai.read");
  if (!allowed) return <p>No access.</p>;
  const status = first((await searchParams).status) ?? "";
  const [logs, counts, custom] = await Promise.all([prisma.aiEmailLog.findMany({ where: status ? { status } : {}, orderBy: { createdAt: "desc" }, take: 100 }), prisma.aiEmailLog.groupBy({ by: ["status"], _count: { _all: true } }), getTemplates()]);
  const c = Object.fromEntries(counts.map((x) => [x.status, x._count._all]));
  return (
    <div>
      <PageHeader title="Emails" subtitle="“Accepted” means the mail server took the message. It is only shown as Delivered when your provider confirms it through the delivery webhook." />
      <div className="mb-4 flex flex-wrap gap-2 text-xs"><Link href="/admin/ai-automation/emails" className={cn("rounded-full border px-3 py-1", !status ? "border-gray-900 bg-gray-900 text-white" : "border-gray-200 bg-white")}>All</Link>{EMAIL_STATUSES.map((s) => <Link key={s} href={`/admin/ai-automation/emails?status=${s}`} className={cn("rounded-full border px-3 py-1", status === s ? "border-gray-900 bg-gray-900 text-white" : "border-gray-200 bg-white", s === "FAILED" && c[s] ? "!border-red-300 text-red-700" : "")}>{s.toLowerCase()} · {c[s] ?? 0}</Link>)}</div>
      <Card className="overflow-x-auto !p-0"><table className="w-full min-w-[760px] text-sm"><thead className="bg-gray-50 text-left text-xs text-gray-500"><tr><th className="p-3">When</th><th>Type</th><th>To</th><th>Subject</th><th>Status</th><th>Tries</th></tr></thead><tbody>
        {logs.map((l) => <tr key={l.id} className="border-t border-gray-100 align-top"><td className="p-3 text-xs text-gray-500">{fmtDate(l.createdAt)}</td><td>{human(l.kind)}</td><td className="text-xs">{l.toEmail}</td><td>{l.subject}{l.error && <p className="text-xs text-red-700">{l.error}</p>}</td><td><Badge>{l.status === "ACCEPTED" ? "SENT" : l.status}</Badge>{l.status === "ACCEPTED" && <p className="text-[11px] text-gray-500">delivery unconfirmed</p>}</td><td>{l.attempts}</td></tr>)}
        {logs.length === 0 && <tr><td colSpan={6} className="p-6 text-center text-gray-500">No emails.</td></tr>}
      </tbody></table></Card>
      {can(user.role, "ai.settings") && <Card className="mt-6"><h2 className="mb-1 text-base font-semibold">Email templates</h2><p className="mb-3 text-xs text-gray-500">Subject and wording for the customer proposal, internal notification and follow-ups. Variables: {"{{business}} {{solutions}} {{name}}"}. The customer proposal email keeps its fixed structure (summary, challenges, solutions, investment, timeline, link, next steps).</p><JsonEditor url="/api/ai-automation/admin/settings" wrapKey="email.templates" rows={22} initial={{ ...DEFAULT_TEMPLATES, ...custom }} /></Card>}
    </div>
  );
}
