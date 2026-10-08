import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { ORG_ID } from "@/lib/os/constants";
import AutoRefresh from "@/components/os/AutoRefresh";
import { Badge, PageHeader, ago } from "@/components/os/ui";

export const dynamic = "force-dynamic";
const FILTERS = ["ALL", "QUEUED", "RUNNING", "WAITING_APPROVAL", "COMPLETED", "FAILED"];

export default async function TasksPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status } = await searchParams;
  const tasks = await prisma.osTask.findMany({
    where: { orgId: ORG_ID, ...(status && status !== "ALL" ? { status } : {}) }, orderBy: { id: "desc" }, take: 100, include: { agent: { select: { name: true, key: true } } },
  });
  return (
    <div>
      <AutoRefresh seconds={15} />
      <PageHeader title="Tasks" subtitle="Every agent action is a task with a trace of its decisions and tool calls." />
      <div className="mb-4 flex flex-wrap gap-2">
        {FILTERS.map((f) => <Link key={f} href={f === "ALL" ? "/admin/tasks" : `/admin/tasks?status=${f}`} className={`rounded-full border px-3 py-1 text-xs ${(status ?? "ALL") === f ? "border-[var(--primary)] bg-[var(--primary)] text-white" : "border-gray-300 bg-white text-gray-700"}`}>{f.replace(/_/g, " ")}</Link>)}
      </div>
      <div className="overflow-x-auto os-card">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-gray-200 text-left text-xs text-gray-500"><th className="px-4 py-2 font-medium">Task</th><th className="px-4 py-2 font-medium">Agent</th><th className="px-4 py-2 font-medium">Priority</th><th className="px-4 py-2 font-medium">Status</th><th className="px-4 py-2 font-medium">Cost</th><th className="px-4 py-2 font-medium">Created</th></tr></thead>
          <tbody>
            {tasks.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">No tasks.</td></tr>}
            {tasks.map((t) => (
              <tr key={t.id} className="border-b border-gray-100 last:border-0">
                <td className="px-4 py-2"><Link className="text-gray-900 hover:underline" href={`/admin/tasks/${t.id}`}>#{t.id} {t.title}</Link>{t.isDemo && <span className="ml-1 text-[10px] text-gray-400">DEMO</span>}{t.error && <span className="block max-w-md truncate text-xs text-red-700">{t.error}</span>}</td>
                <td className="px-4 py-2 text-gray-600">{t.agent.name}</td>
                <td className="px-4 py-2"><Badge>{t.priority}</Badge></td>
                <td className="px-4 py-2"><Badge>{t.status}</Badge>{t.deadLetter && <span className="ml-1 text-[10px] text-red-700">DEAD-LETTER</span>}</td>
                <td className="px-4 py-2">${t.costUsd.toFixed(4)}</td>
                <td className="px-4 py-2 text-gray-500">{ago(t.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
