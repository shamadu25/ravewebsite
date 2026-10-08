import Link from "next/link";
import { Bot } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { ORG_ID } from "@/lib/os/constants";
import { getAgentPerformance } from "@/lib/os/performance";
import { startOfToday } from "@/lib/os/time";
import ApiButton from "@/components/os/ApiButton";
import ApiForm from "@/components/os/ApiForm";
import { Stat, PageHeader, usd } from "@/components/os/ui";

export const dynamic = "force-dynamic";
const ORDER = ["COMMAND", "REVENUE", "MARKETING", "CUSTOMER_SUCCESS", "OPERATIONS", "PRODUCT", "ENGINEERING", "FINANCE"];
const LABEL: Record<string, string> = { COMMAND: "Command", REVENUE: "Revenue", MARKETING: "Marketing", CUSTOMER_SUCCESS: "Customer Success", OPERATIONS: "Operations", PRODUCT: "Product", ENGINEERING: "Engineering", FINANCE: "Finance" };
const DOT: Record<string, string> = { ACTIVE: "bg-[var(--success)]", PAUSED: "bg-[var(--warning)]", DRAFT: "bg-slate-400", ERROR: "bg-[var(--danger)]", REQUIRES_APPROVAL: "bg-[var(--warning)]" };

export default async function AgentsPage() {
  const [agents, perf, today, escalations] = await Promise.all([
    prisma.osAgent.findMany({ where: { orgId: ORG_ID }, orderBy: [{ isDirector: "desc" }, { name: "asc" }] }),
    getAgentPerformance(),
    prisma.osTask.groupBy({ by: ["agentId"], where: { orgId: ORG_ID, createdAt: { gte: startOfToday() } }, _count: true }),
    prisma.osApproval.count({ where: { orgId: ORG_ID, requestedBy: { startsWith: "agent:" } } }),
  ]);
  const active = agents.filter((a) => a.status === "ACTIVE").length;
  const done = perf.reduce((n, p) => n + p.completed, 0), failed = perf.reduce((n, p) => n + p.failed, 0);
  const rate = done + failed ? Math.round((done / (done + failed)) * 100) : null;
  const tasksToday = today.reduce((n, t) => n + t._count, 0);
  const influenced = perf.reduce((n, p) => n + p.revenueInfluencedUsd, 0);
  const groups = ORDER.filter((d) => agents.some((a) => a.department === d));

  return (
    <div className="space-y-10">
      <PageHeader title="AI Workforce" subtitle="Your digital employees working across RaveSoft." />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <Stat label="Active Employees" value={`${active}`} hint={`of ${agents.length} defined`} />
        <Stat label="Tasks Today" value={String(tasksToday)} />
        <Stat label="Success Rate" value={rate == null ? "No data" : `${rate}%`} />
        <Stat label="Revenue Influenced" value={usd(influenced)} />
        <Stat label="Human Escalations" value={String(escalations)} />
      </div>
      {agents.length === 0 && (
        <div className="os-card p-10 text-center">
          <p className="text-[16px] font-medium">Your AI workforce is ready.</p>
          <p className="mt-1 text-[14px] text-[var(--muted)]">Set up the registry to create RaveSoft&apos;s AI Employees.</p>
          <div className="mt-4 flex justify-center"><ApiButton label="Set up AI Employees" variant="primary" size="md" url="/api/os/seed" body={{}} result="seed" /></div>
        </div>
      )}
      {groups.map((d) => (
        <section key={d} aria-labelledby={`g-${d}`}>
          <h2 id={`g-${d}`} className="mb-3 text-[13px] font-semibold uppercase tracking-wide text-[var(--muted)]">{LABEL[d]}</h2>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {agents.filter((a) => a.department === d).map((a) => {
              const p = perf.find((x) => x.key === a.key);
              const t = today.find((x) => x.agentId === a.id)?._count ?? 0;
              return (
                <Link key={a.key} href={`/admin/agents/${a.key}`} className="os-card os-card-hover group block p-5">
                  <div className="flex items-start gap-3">
                    <span aria-hidden className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-[var(--primary-soft)] text-[var(--primary)]"><Bot className="h-5 w-5" /></span>
                    <div className="min-w-0"><p className="truncate text-[15px] font-semibold">{a.name}</p><p className="line-clamp-2 text-[13px] text-[var(--muted)]">{a.description ?? a.role}</p></div>
                  </div>
                  <p className="mt-3 flex items-center gap-1.5 text-[12px] text-[var(--muted)]"><span aria-hidden className={`h-1.5 w-1.5 rounded-full ${DOT[a.status] ?? "bg-slate-400"}`} />{a.status === "REQUIRES_APPROVAL" ? "Needs approval" : a.status.charAt(0) + a.status.slice(1).toLowerCase()}</p>
                  <dl className="mt-3 grid grid-cols-3 gap-2 border-t border-[var(--border)] pt-3 text-[12px]">
                    <div><dt className="text-[var(--muted)]">Tasks today</dt><dd className="mt-0.5 text-[15px] font-semibold tabular-nums">{t}</dd></div>
                    <div><dt className="text-[var(--muted)]">Success</dt><dd className="mt-0.5 text-[15px] font-semibold tabular-nums">{p?.successRate == null ? "—" : `${Math.round(p.successRate * 100)}%`}</dd></div>
                    <div><dt className="text-[var(--muted)]">Influenced</dt><dd className="mt-0.5 text-[15px] font-semibold tabular-nums">{usd(p?.revenueInfluencedUsd ?? 0)}</dd></div>
                  </dl>
                  <p className="mt-3 text-[13px] font-medium text-[var(--primary)] group-hover:underline">View Employee →</p>
                </Link>
              );
            })}
          </div>
        </section>
      ))}
      <details className="os-card p-6" id="create">
        <summary className="cursor-pointer text-[15px] font-semibold">Create AI Employee</summary>
        <p className="mb-4 mt-1 text-[13px] text-[var(--muted)]">New employees start as drafts. Test, then activate.</p>
        <ApiForm url="/api/os/agents" submitLabel="Create draft" fields={[
          { name: "key", label: "Key (a-z, 0-9, -)", required: true, placeholder: "ai-dental-receptionist" }, { name: "name", label: "Name", required: true },
          { name: "department", label: "Department", type: "select", options: ["REVENUE", "MARKETING", "CUSTOMER_SUCCESS", "PRODUCT", "ENGINEERING", "FINANCE", "OPERATIONS"] }, { name: "role", label: "Role", required: true },
          { name: "objective", label: "Objective", type: "textarea", required: true }, { name: "autonomy", label: "Autonomy", type: "select", options: ["ASSISTED", "SEMI_AUTONOMOUS", "AUTONOMOUS"] },
        ]} />
        <p className="mt-3 text-[12px] text-[var(--muted)]">Industry templates: <Link className="text-[var(--primary)]" href="/admin/factory">AI employee factory</Link> · <Link className="text-[var(--primary)]" href="/admin/performance">Performance &amp; cost</Link></p>
      </details>
    </div>
  );
}
