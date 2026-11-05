import Link from "next/link";
import { Badge, Card, PageHeader, Stat } from "@/components/os/ui";
import { ActionButton } from "@/components/admin-ai/controls";
import { dashboardStats, readiness } from "@/lib/ai-automation/analytics";
import { requireAdmin } from "@/lib/ai-automation/admin-auth";
import { formatMoney } from "@/lib/ai-automation/pricing";
import { human } from "@/lib/ai-automation/format";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AiAutomationOverview() {
  const { allowed } = await requireAdmin("ai.read");
  if (!allowed) return <p>You do not have access to AI Automation.</p>;
  const [stats, ready, jobs, failedEmails] = await Promise.all([
    dashboardStats().catch(() => null), readiness(),
    prisma.aiJob.groupBy({ by: ["status"], _count: { _all: true } }).catch(() => []),
    prisma.aiEmailLog.count({ where: { status: "FAILED" } }).catch(() => 0),
  ]);
  const job = Object.fromEntries(jobs.map((j) => [j.status, j._count._all]));
  const todo = ready.filter((r) => !r.ok);
  return (
    <div>
      <PageHeader title="AI Automation" subtitle="Assessments, AI analysis, approved pricing, proposals and follow-up — one pipeline." actions={<ActionButton label="Initialise catalogue" url="/api/ai-automation/admin/seed" confirm="Create any missing industries, solutions and mappings? Existing records are never overwritten." />} />

      <Card className="mb-6">
        <h2 className="text-base font-semibold">Go-live checklist {todo.length === 0 ? "— complete" : `— ${todo.length} item${todo.length === 1 ? "" : "s"} to configure`}</h2>
        <ul className="mt-3 divide-y divide-gray-100 text-sm">
          {ready.map((r) => (
            <li key={r.key} className="flex flex-wrap items-start justify-between gap-2 py-2.5">
              <div><span className={r.ok ? "text-emerald-700" : "text-amber-700"}>{r.ok ? "✓" : "○"}</span> <span className="font-medium">{r.label}</span><p className="ml-5 text-xs text-gray-500">{r.detail}</p></div>
              {!r.ok && <span className="text-xs text-gray-500">{r.fix}</span>}
            </li>
          ))}
        </ul>
      </Card>

      {stats ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="Total assessments" value={String(stats.totalAssessments)} />
            <Stat label="New leads" value={String(stats.newLeads)} />
            <Stat label="Qualified leads" value={String(stats.qualifiedLeads)} hint="High or medium priority" />
            <Stat label="Conversion rate" value={stats.conversionRate == null ? "—" : `${stats.conversionRate}%`} hint="Accepted ÷ sent proposals" />
            <Stat label="Proposals generated" value={String(stats.proposals.total)} />
            <Stat label="Awaiting approval" value={String(stats.proposals.awaitingApproval)} tone={stats.proposals.awaitingApproval ? "bad" : undefined} />
            <Stat label="Needs manual pricing" value={String(stats.proposals.manualReview)} tone={stats.proposals.manualReview ? "bad" : undefined} />
            <Stat label="Sent / accepted / declined" value={`${stats.proposals.sent} / ${stats.proposals.accepted} / ${stats.proposals.declined}`} />
          </div>
          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            <Card><h2 className="mb-3 text-base font-semibold">Pipeline value (open deals)</h2>
              {stats.pipeline.length === 0 ? <p className="text-sm text-gray-500">No priced open deals yet.</p> : <table className="w-full text-sm"><thead><tr className="text-left text-xs text-gray-500"><th>Currency</th><th>Deals</th><th>Pipeline</th><th>Monthly recurring</th><th>Average</th></tr></thead><tbody>{stats.pipeline.map((p) => <tr key={p.currency} className="border-t border-gray-100"><td className="py-1.5">{p.currency}</td><td>{p.deals}</td><td>{formatMoney(p.value, p.currency)}</td><td>{formatMoney(p.monthlyRecurring, p.currency)}</td><td>{formatMoney(p.averageValue, p.currency)}</td></tr>)}</tbody></table>}
              <p className="mt-2 text-xs text-gray-500">Amounts are never added across currencies.</p></Card>
            <Card><h2 className="mb-3 text-base font-semibold">Leads by industry</h2>
              {stats.leadsByIndustry.length === 0 ? <p className="text-sm text-gray-500">No leads yet.</p> : <ul className="space-y-1.5 text-sm">{stats.leadsByIndustry.map((i) => <li key={i.industry} className="flex justify-between"><span>{human(i.industry)}</span><span className="tabular-nums">{i.count}</span></li>)}</ul>}</Card>
            <Card><h2 className="mb-3 text-base font-semibold">Lead pipeline</h2><ul className="space-y-1.5 text-sm">{Object.entries(stats.leadsByStatus).map(([s, n]) => <li key={s} className="flex justify-between"><span>{human(s)}</span><span className="tabular-nums">{n}</span></li>)}{Object.keys(stats.leadsByStatus).length === 0 && <li className="text-gray-500">No leads yet.</li>}</ul></Card>
            <Card><h2 className="mb-3 text-base font-semibold">System health</h2><ul className="space-y-1.5 text-sm"><li className="flex justify-between"><span>Jobs queued / running</span><span>{(job.QUEUED ?? 0)} / {(job.RUNNING ?? 0)}</span></li><li className="flex justify-between"><span>Failed jobs</span><Link href="/admin/ai-automation/jobs" className={job.FAILED ? "font-semibold text-red-700" : ""}>{job.FAILED ?? 0}</Link></li><li className="flex justify-between"><span>Failed emails</span><Link href="/admin/ai-automation/emails" className={failedEmails ? "font-semibold text-red-700" : ""}>{failedEmails}</Link></li></ul></Card>
          </div>
        </>
      ) : <Card><Badge>ERROR</Badge> <span className="text-sm">Could not read statistics. Has the database been migrated (npm run db:push)?</span></Card>}
    </div>
  );
}
