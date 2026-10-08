import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { ORG_ID } from "@/lib/os/constants";
import ApiButton from "@/components/os/ApiButton";
import { Badge, Card, PageHeader, Stat, ago } from "@/components/os/ui";

export const dynamic = "force-dynamic";

export default async function OperationsPage() {
  const [counts, failed, alerts, runs] = await Promise.all([
    prisma.osTask.groupBy({ by: ["status"], where: { orgId: ORG_ID }, _count: true }),
    prisma.osTask.findMany({ where: { orgId: ORG_ID, status: "FAILED" }, orderBy: { id: "desc" }, take: 8, include: { agent: { select: { name: true } } } }),
    prisma.osAlert.findMany({ where: { orgId: ORG_ID, resolvedAt: null }, orderBy: { id: "desc" }, take: 20 }),
    prisma.osWorkflowRun.findMany({ where: { status: { in: ["RUNNING", "WAITING", "FAILED"] } }, orderBy: { id: "desc" }, take: 8, include: { workflow: { select: { name: true } } } }),
  ]);
  const n = (s: string) => counts.find((c) => c.status === s)?._count ?? 0;
  const dead = await prisma.osTask.count({ where: { orgId: ORG_ID, deadLetter: true } });
  return (
    <div className="space-y-8">
      <PageHeader title="Operations" subtitle="Queue health, failures and alerts. This is where you see what is failing." actions={<><ApiButton label="Process queue now" variant="primary" url="/api/os/run" body={{ job: "process-queue" }} result="queue" /><Link href="/admin/tasks" className="rounded-lg border border-[var(--border)] bg-white px-3 py-1.5 text-xs">All tasks</Link></>} />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <Stat label="Queued" value={String(n("QUEUED"))} /><Stat label="Running" value={String(n("RUNNING"))} /><Stat label="Waiting on you" value={String(n("WAITING_APPROVAL"))} /><Stat label="Failed" value={String(n("FAILED"))} tone={n("FAILED") ? "bad" : undefined} /><Stat label="Dead-letter" value={String(dead)} />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="mb-3 text-[16px] font-semibold">Alerts</h2>
          {alerts.length === 0 ? <p className="text-[14px] text-[var(--muted)]">No open alerts.</p> : (
            <ul className="divide-y divide-[var(--border)]">{alerts.map((a) => <li key={a.id} className="flex items-start justify-between gap-3 py-2.5"><span className="min-w-0 text-[14px]"><Badge>{a.severity}</Badge> <span className="font-medium">{a.title}</span><span className="block text-[12px] text-[var(--muted)]">{a.category} · {ago(a.createdAt)}{a.body ? ` · ${a.body.slice(0, 90)}` : ""}</span></span><ApiButton label="Resolve" url={`/api/os/alerts/${a.id}`} /></li>)}</ul>
          )}
        </Card>
        <Card>
          <h2 className="mb-3 text-[16px] font-semibold">Failed tasks</h2>
          {failed.length === 0 ? <p className="text-[14px] text-[var(--muted)]">Nothing has failed.</p> : (
            <ul className="divide-y divide-[var(--border)]">{failed.map((t) => <li key={t.id} className="flex items-start justify-between gap-3 py-2.5"><span className="min-w-0 text-[14px]"><Link className="font-medium hover:underline" href={`/admin/tasks/${t.id}`}>#{t.id} {t.title}</Link><span className="block truncate text-[12px] text-[var(--danger)]">{t.error}</span><span className="text-[12px] text-[var(--muted)]">{t.agent.name} · {ago(t.completedAt)}</span></span><ApiButton label="Retry" url={`/api/os/tasks/${t.id}`} body={{ action: "retry" }} /></li>)}</ul>
          )}
        </Card>
      </div>
      <Card>
        <h2 className="mb-3 text-[16px] font-semibold">Workflow runs needing attention</h2>
        {runs.length === 0 ? <p className="text-[14px] text-[var(--muted)]">No active or failed workflow runs.</p> : <ul className="space-y-1.5 text-[14px]">{runs.map((r) => <li key={r.id}><Link className="hover:underline" href="/admin/workflows">{r.workflow.name} · run #{r.id}</Link> <span className="text-[var(--muted)]">{r.status.toLowerCase()}{r.error ? ` — ${r.error}` : ""}</span></li>)}</ul>}
      </Card>
    </div>
  );
}
