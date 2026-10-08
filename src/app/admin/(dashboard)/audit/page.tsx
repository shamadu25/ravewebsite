import { prisma } from "@/lib/prisma";
import { ORG_ID } from "@/lib/os/constants";
import { verifyAuditChain } from "@/lib/os/audit";
import DownloadLink from "@/components/os/DownloadLink";
import { Badge, Card, PageHeader, ago } from "@/components/os/ui";

export const dynamic = "force-dynamic";

export default async function AuditPage() {
  const [rows, chain] = await Promise.all([prisma.osAuditLog.findMany({ where: { orgId: ORG_ID }, orderBy: { id: "desc" }, take: 150 }), verifyAuditChain()]);
  return (
    <div className="space-y-4">
      <PageHeader title="Audit log" subtitle="Append-only and hash-chained: each entry commits to the previous one, so edits or deletions are detectable." actions={<><DownloadLink href="/api/os/reports/audit">Export CSV</DownloadLink><DownloadLink href="/api/os/reports/revenue">Revenue CSV</DownloadLink><DownloadLink href="/api/os/reports/sales">Sales CSV</DownloadLink><DownloadLink href="/api/os/reports/customers">Customers CSV</DownloadLink></>} />
      <Card className={chain.intact ? "border-emerald-200" : "border-red-300"}>
        <p className="text-sm">{chain.intact ? <>Chain intact — <b>{chain.checked}</b> entries verified.</> : <span className="text-red-700">Chain BROKEN at entry #{chain.brokenAtId}. Records were altered or removed.</span>}</p>
      </Card>
      <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-gray-200 text-left text-xs text-gray-500"><th className="px-4 py-2 font-medium">When</th><th className="px-4 py-2 font-medium">Actor</th><th className="px-4 py-2 font-medium">Action</th><th className="px-4 py-2 font-medium">Resource</th><th className="px-4 py-2 font-medium">Result</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-gray-100 last:border-0">
                <td className="whitespace-nowrap px-4 py-2 text-xs text-gray-500">{ago(r.createdAt)}</td>
                <td className="px-4 py-2"><span className="text-gray-900">{r.actor}</span> <span className="text-[10px] text-gray-400">{r.actorType}</span></td>
                <td className="px-4 py-2 font-mono text-xs">{r.action}</td>
                <td className="px-4 py-2 text-xs text-gray-600">{r.resource}{r.resourceId ? ` #${r.resourceId}` : ""}</td>
                <td className="px-4 py-2"><Badge>{r.result === "SUCCESS" ? "COMPLETED" : r.result === "DENIED" ? "BLOCKED" : "FAILED"}</Badge></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
