import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { priorities } from "@/lib/os/dashboard-data";
import { prisma } from "@/lib/prisma";
import { ORG_ID } from "@/lib/os/constants";

const usd = (n: number) => `$${Math.round(n).toLocaleString()}`;
const hrefFor = (agentKey: string | null, title: string) => (/at-risk/i.test(title) ? "/admin/customers" : agentKey === "prospecting-agent" ? "/admin/revenue" : "/admin/revenue");

export default async function PriorityList() {
  const [items, pending] = await Promise.all([priorities(), prisma.osApproval.count({ where: { orgId: ORG_ID, status: "PENDING" } })]);
  const rows: Array<{ title: string; sub: string; chip: string; href: string; strong?: boolean }> = [];
  if (pending > 0) rows.push({ title: `Review ${pending} pending approval${pending > 1 ? "s" : ""}`, sub: "AI Employees are waiting on your decision", chip: "Requires approval", href: "/admin/approvals", strong: true });
  for (const p of items) rows.push({ title: p.title, sub: p.why, chip: p.humanOnly ? "Needs you" : /^Build pipeline/.test(p.title) ? `${usd(p.revenueImpactUsd)} gap` : `${usd(p.revenueImpactUsd)} potential`, href: hrefFor(p.agentKey, p.title) });
  const top = rows.slice(0, 5);
  return (
    <section className="os-card p-6" aria-labelledby="prio">
      <h2 id="prio" className="mb-3 text-[18px] font-semibold tracking-tight">Today&apos;s Priorities</h2>
      {top.length === 0 ? (
        <div className="py-6 text-center"><p className="text-[14px] font-medium">Nothing to prioritise yet</p><p className="mt-1 text-[13px] text-[var(--muted)]">Add prospects or record revenue and the Commander will rank what to do next.</p><Link href="/admin/revenue" className="mt-3 inline-block text-[13px] font-medium text-[var(--primary)]">Add a prospect →</Link></div>
      ) : (
        <ol className="-mx-2">
          {top.map((r, i) => (
            <li key={r.title}>
              <Link href={r.href} className="group flex items-center gap-3 rounded-[12px] px-2 py-3 hover:bg-[var(--background)]">
                <span aria-hidden className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--primary-soft)] text-[13px] font-semibold text-[var(--primary)]">{i + 1}</span>
                <span className="min-w-0 flex-1"><span className="line-clamp-2 text-[14px] font-medium">{r.title}</span><span className="line-clamp-2 text-[12px] text-[var(--muted)]">{r.sub}</span></span>
                <span className={`hidden shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-medium 2xl:inline ${r.strong ? "bg-amber-50 text-amber-800" : "bg-[var(--background)] text-[var(--muted)]"}`}>{r.chip}</span>
                <ChevronRight className="h-4 w-4 shrink-0 text-slate-300 group-hover:text-[var(--primary)]" aria-hidden />
              </Link>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
