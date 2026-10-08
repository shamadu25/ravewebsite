import Link from "next/link";
import { Bot, ChevronRight } from "lucide-react";
import { workforce } from "@/lib/os/dashboard-data";
import ApiButton from "@/components/os/ApiButton";
import Sparkline from "./Sparkline";

const STATUS: Record<string, { dot: string; label: string }> = {
  ACTIVE: { dot: "bg-[var(--success)]", label: "Active" }, PAUSED: { dot: "bg-[var(--warning)]", label: "Paused" },
  DRAFT: { dot: "bg-slate-400", label: "Draft" }, ERROR: { dot: "bg-[var(--danger)]", label: "Error" }, REQUIRES_APPROVAL: { dot: "bg-[var(--warning)]", label: "Needs approval" },
};

export function AIEmployeeRow({ e }: { e: { key: string; name: string; description: string; status: string; tasksToday: number; spark: number[] } }) {
  const s = STATUS[e.status] ?? STATUS.DRAFT;
  return (
    <li>
      <Link href={`/admin/agents/${e.key}`} className="group flex items-center gap-3 rounded-[12px] px-2 py-2.5 transition-colors hover:bg-[var(--background)]">
        <span aria-hidden className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-[var(--primary-soft)] text-[var(--primary)]"><Bot className="h-[18px] w-[18px]" /></span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[14px] font-medium">{e.name}</span>
          <span className="block truncate text-[12px] text-[var(--muted)]">{e.description}</span>
          <span className="mt-0.5 flex items-center gap-1.5 text-[12px] text-[var(--muted)]"><span aria-hidden className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />{s.label}</span>
        </span>
        <Sparkline points={e.spark} label={`${e.name} activity, last 7 days`} className="hidden sm:block" />
        <span className="w-14 shrink-0 text-right"><span className="block text-[16px] font-semibold tabular-nums">{e.tasksToday}</span><span className="block text-[11px] text-[var(--muted)]">tasks today</span></span>
        <ChevronRight className="h-4 w-4 shrink-0 text-slate-300 group-hover:text-[var(--primary)]" aria-hidden />
      </Link>
    </li>
  );
}

export default async function AIWorkforce() {
  const w = await workforce();
  return (
    <section className="os-card p-6" aria-labelledby="ai-emp">
      <div className="mb-3 flex items-center justify-between">
        <h2 id="ai-emp" className="text-[18px] font-semibold tracking-tight">AI Employees</h2>
        <Link href="/admin/agents" className="text-[13px] font-medium text-[var(--primary)] hover:underline">View all →</Link>
      </div>
      {w.total === 0 ? (
        <div className="py-8 text-center">
          <p className="text-[15px] font-medium">Your AI workforce is ready.</p>
          <p className="mx-auto mt-1 max-w-xs text-[13px] text-[var(--muted)]">Set up the registry to create the AI Employees that will run RaveSoft.</p>
          <div className="mt-4 flex justify-center"><ApiButton label="Set up AI Employees" variant="primary" size="md" url="/api/os/seed" body={{}} result="seed" /></div>
        </div>
      ) : w.active === 0 ? (
        <div className="py-8 text-center">
          <p className="text-[15px] font-medium">Activate your first AI Employee</p>
          <p className="mx-auto mt-1 max-w-xs text-[13px] text-[var(--muted)]">{w.total} employees are defined but none is active.</p>
          <Link href="/admin/agents" className="mt-4 inline-block rounded-[10px] bg-[var(--primary)] px-4 py-2 text-[13px] font-medium text-white">Create AI Employee</Link>
        </div>
      ) : (
        <ul className="-mx-2 min-w-0 divide-y divide-[var(--border)]/60">{w.top.map((e) => <AIEmployeeRow key={e.key} e={e} />)}</ul>
      )}
    </section>
  );
}
