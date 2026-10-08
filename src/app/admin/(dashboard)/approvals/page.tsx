import { prisma } from "@/lib/prisma";
import { ORG_ID } from "@/lib/os/constants";
import ApprovalActions from "@/components/os/ApprovalActions";
import AutoRefresh from "@/components/os/AutoRefresh";
import { Badge, Card, PageHeader, ago } from "@/components/os/ui";

export const dynamic = "force-dynamic";

export default async function ApprovalsPage() {
  const [pending, recent] = await Promise.all([
    prisma.osApproval.findMany({ where: { orgId: ORG_ID, status: { in: ["PENDING", "INFO_REQUESTED"] } }, orderBy: { createdAt: "desc" } }),
    prisma.osApproval.findMany({ where: { orgId: ORG_ID, status: { notIn: ["PENDING", "INFO_REQUESTED"] } }, orderBy: { decidedAt: "desc" }, take: 15 }),
  ]);
  return (
    <div className="space-y-6">
      <AutoRefresh seconds={15} />
      <PageHeader title="Approvals" subtitle="Consequential actions wait here. Approving executes the action immediately; the result is shown honestly and recorded in the audit log." />
      {pending.length === 0 && <Card><p className="text-sm text-gray-500">Nothing is waiting for a decision.</p></Card>}
      {pending.map((a) => (
        <Card key={a.id}>
          <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-base font-semibold text-gray-900">{a.title}</h2><span className="flex items-center gap-2"><Badge>{a.kind}</Badge><Badge>{a.status}</Badge></span></div>
          <p className="mt-1 text-xs text-gray-500">Requested by {a.requestedBy} · {ago(a.createdAt)} · requires {a.requiredRole}{a.isDemo ? " · DEMO" : ""}</p>
          <dl className="mt-3 space-y-2 text-sm">
            <div><dt className="text-xs font-semibold uppercase text-gray-500">Objective</dt><dd className="text-gray-800">{a.objective}</dd></div>
            {a.context && <div><dt className="text-xs font-semibold uppercase text-gray-500">Context</dt><dd className="whitespace-pre-wrap text-gray-700">{a.context}</dd></div>}
            <div><dt className="text-xs font-semibold uppercase text-gray-500">Recommendation</dt><dd className="text-gray-800">{a.recommendation}</dd></div>
            {a.expectedImpact && <div><dt className="text-xs font-semibold uppercase text-gray-500">Expected impact</dt><dd className="text-gray-800">{a.expectedImpact}</dd></div>}
            {a.confidence != null && <div><dt className="text-xs font-semibold uppercase text-gray-500">Confidence</dt><dd className="text-gray-800">{Math.round(a.confidence * 100)}%</dd></div>}
            {a.risks && <div><dt className="text-xs font-semibold uppercase text-gray-500">Risks</dt><dd className="text-gray-800">{a.risks}</dd></div>}
          </dl>
          <ApprovalActions id={a.id} />
        </Card>
      ))}
      {recent.length > 0 && (
        <Card>
          <h2 className="mb-3 text-sm font-semibold text-gray-900">Recent decisions</h2>
          <ul className="space-y-2 text-sm">
            {recent.map((a) => {
              const ex = a.executionResult as { ok?: boolean; error?: string; reason?: string } | null;
              return <li key={a.id}><Badge>{a.status}</Badge> #{a.id} {a.title} <span className="text-xs text-gray-400">by {a.decidedBy} · {ago(a.decidedAt)}</span>{ex?.ok === false && <span className="block text-xs text-red-700">Execution failed: {ex.error ?? ex.reason}</span>}</li>;
            })}
          </ul>
        </Card>
      )}
    </div>
  );
}
