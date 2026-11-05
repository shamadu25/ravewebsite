import { Badge, Card, PageHeader } from "@/components/os/ui";
import { ActionButton } from "@/components/admin-ai/controls";
import { requireAdmin } from "@/lib/ai-automation/admin-auth";
import { fmtDate, human } from "@/lib/ai-automation/format";
import { can } from "@/lib/os/rbac";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AiJobs() {
  const { user, allowed } = await requireAdmin("ai.read");
  if (!allowed) return <p>No access.</p>;
  const jobs = await prisma.aiJob.findMany({ orderBy: { id: "desc" }, take: 100 });
  const write = can(user.role, "ai.write");
  return (
    <div>
      <PageHeader title="Background jobs" subtitle="Analysis, pricing, proposals, PDFs, email and provisioning run as retryable jobs (backoff 30s → 2m → 8m → 32m). Failed jobs alert the team." actions={write ? <ActionButton variant="primary" label="Run queue now" url="/api/ai-automation/admin/jobs/run" /> : undefined} />
      <Card className="overflow-x-auto !p-0"><table className="w-full min-w-[820px] text-sm"><thead className="bg-gray-50 text-left text-xs text-gray-500"><tr><th className="p-3">#</th><th>Type</th><th>Status</th><th>Attempts</th><th>Next run</th><th>Last error</th><th /></tr></thead><tbody>
        {jobs.map((j) => <tr key={j.id} className="border-t border-gray-100 align-top"><td className="p-3 text-xs text-gray-500">{j.id}</td><td>{human(j.type)}<p className="max-w-[260px] truncate font-mono text-[11px] text-gray-400" title={j.idempotencyKey}>{j.idempotencyKey}</p></td><td><Badge>{j.status}</Badge></td><td>{j.attempts}/{j.maxAttempts}</td><td className="text-xs text-gray-500">{j.status === "QUEUED" ? fmtDate(j.runAfter) : "—"}</td><td className="max-w-[320px] text-xs text-red-700">{j.lastError ?? ""}</td><td>{write && j.status === "FAILED" && <ActionButton label="Retry" url={`/api/ai-automation/admin/jobs/${j.id}`} />}</td></tr>)}
        {jobs.length === 0 && <tr><td colSpan={7} className="p-6 text-center text-gray-500">No jobs yet.</td></tr>}
      </tbody></table></Card>
    </div>
  );
}
