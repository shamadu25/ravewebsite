import Link from "next/link";
import DownloadLink from "@/components/os/DownloadLink";
import { Card, PageHeader } from "@/components/os/ui";

const EXPORTS = [
  ["Revenue report", "Every revenue ledger entry", "revenue"], ["Sales report", "Pipeline and opportunities", "sales"], ["Customer report", "Customers, health and MRR", "customers"],
  ["AI workforce report", "Per-agent performance and cost", "agents"], ["Task report", "Latest 5,000 agent tasks", "tasks"], ["Audit report", "Latest 5,000 audit events", "audit"],
] as const;

export default function ReportsPage() {
  return (
    <div className="space-y-8">
      <PageHeader title="Reports" subtitle="CSV exports are generated live from the database and recorded in the audit log. Use your browser's Print for PDF." />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {EXPORTS.map(([title, desc, key]) => (
          <Card key={key} className="flex items-center justify-between gap-3"><div><h2 className="text-[15px] font-semibold">{title}</h2><p className="text-[13px] text-[var(--muted)]">{desc}</p></div><DownloadLink href={`/api/os/reports/${key}`}>CSV</DownloadLink></Card>
        ))}
      </div>
      <Card>
        <h2 className="mb-2 text-[15px] font-semibold">Executive reports</h2>
        <ul className="space-y-1 text-[14px]"><li><Link className="text-[var(--primary)]" href="/admin/brief">Daily executive brief →</Link></li><li><Link className="text-[var(--primary)]" href="/admin/forecast">Revenue forecast →</Link></li><li><Link className="text-[var(--primary)]" href="/admin/performance">Agent performance &amp; cost →</Link></li><li><Link className="text-[var(--primary)]" href="/admin/audit">Audit log &amp; chain verification →</Link></li></ul>
      </Card>
    </div>
  );
}
