import Link from "next/link";
import { Badge, Card, PageHeader } from "@/components/os/ui";
import { requireAdmin } from "@/lib/ai-automation/admin-auth";
import { first, fmtDate } from "@/lib/ai-automation/format";
import { formatMoney } from "@/lib/ai-automation/pricing";
import { PROPOSAL_STATUSES } from "@/lib/ai-automation/types";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AiProposals({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { allowed } = await requireAdmin("ai.read");
  if (!allowed) return <p>No access.</p>;
  const status = first((await searchParams).status) ?? "";
  const [rows, counts] = await Promise.all([
    prisma.aiProposal.findMany({ where: status ? { status } : {}, orderBy: { updatedAt: "desc" }, take: 100, include: { lead: { include: { company: true } } } }),
    prisma.aiProposal.groupBy({ by: ["status"], _count: { _all: true } }),
  ]);
  const c = Object.fromEntries(counts.map((x) => [x.status, x._count._all]));
  return (
    <div>
      <PageHeader title="Proposals" subtitle="Every proposal is reviewed by a person before it is emailed." />
      <div className="mb-4 flex flex-wrap gap-2 text-xs">
        <Link href="/admin/ai-automation/proposals" className={cn("rounded-full border px-3 py-1", !status ? "border-gray-900 bg-gray-900 text-white" : "border-gray-200 bg-white")}>All</Link>
        {PROPOSAL_STATUSES.map((s) => <Link key={s} href={`/admin/ai-automation/proposals?status=${s}`} className={cn("rounded-full border px-3 py-1", status === s ? "border-gray-900 bg-gray-900 text-white" : "border-gray-200 bg-white")}>{s.replace(/_/g, " ")} · {c[s] ?? 0}</Link>)}
      </div>
      <Card className="overflow-x-auto !p-0"><table className="w-full min-w-[760px] text-sm"><thead className="bg-gray-50 text-left text-xs text-gray-500"><tr><th className="p-3">Reference</th><th>Business</th><th>Status</th><th>Initial</th><th>Monthly</th><th>Version</th><th>Updated</th></tr></thead><tbody>
        {rows.map((p) => <tr key={p.id} className="border-t border-gray-100 hover:bg-gray-50"><td className="p-3"><Link className="font-medium text-[var(--primary)] hover:underline" href={`/admin/ai-automation/proposals/${p.id}`}>{p.ref}</Link></td><td>{p.lead.company?.name ?? "—"}</td><td><Badge>{p.status}</Badge></td><td>{p.initialTotal != null ? formatMoney(Number(p.initialTotal), p.currency) : <span className="text-amber-700">Needs pricing</span>}</td><td>{p.monthlyTotal != null ? formatMoney(Number(p.monthlyTotal), p.currency) : "—"}</td><td>v{p.currentVersion}</td><td className="text-xs text-gray-500">{fmtDate(p.updatedAt)}</td></tr>)}
        {rows.length === 0 && <tr><td colSpan={7} className="p-6 text-center text-gray-500">No proposals.</td></tr>}
      </tbody></table></Card>
    </div>
  );
}
