import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { ORG_ID } from "@/lib/os/constants";
import ApiButton from "@/components/os/ApiButton";
import ApiForm from "@/components/os/ApiForm";
import { Badge, Card, PageHeader, ago } from "@/components/os/ui";

export const dynamic = "force-dynamic";

export default async function AgentsPage() {
  const [agents, taskAgg, since] = await Promise.all([
    prisma.osAgent.findMany({ where: { orgId: ORG_ID }, orderBy: [{ department: "asc" }, { isDirector: "desc" }, { name: "asc" }] }),
    prisma.osTask.groupBy({ by: ["agentId", "status"], where: { orgId: ORG_ID }, _count: true, _sum: { costUsd: true } }),
    Promise.resolve(new Date()),
  ]);
  void since;
  const stat = (id: number) => {
    const rows = taskAgg.filter((r) => r.agentId === id);
    const done = rows.find((r) => r.status === "COMPLETED")?._count ?? 0;
    const failed = rows.find((r) => r.status === "FAILED")?._count ?? 0;
    const cost = rows.reduce((n, r) => n + (r._sum.costUsd ?? 0), 0);
    return { done, failed, rate: done + failed ? Math.round((done / (done + failed)) * 100) : null, cost };
  };
  const depts = [...new Set(agents.map((a) => a.department))];

  return (
    <div className="space-y-6">
      <PageHeader title="AI workforce" subtitle="Only agents marked ACTIVE can run. Drafts are defined but not yet wired to the tools and integrations they need." />
      {agents.length === 0 && <Card><p className="text-sm text-gray-600">No agents yet. <Link className="text-blue-700" href="/admin">Initialise the operating system</Link>.</p></Card>}
      {depts.map((d) => (
        <section key={d}>
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">{d.replace(/_/g, " ")}</h2>
          <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-gray-200 text-left text-xs text-gray-500"><th className="px-4 py-2 font-medium">Employee</th><th className="px-4 py-2 font-medium">Status</th><th className="px-4 py-2 font-medium">Autonomy</th><th className="px-4 py-2 font-medium">Done</th><th className="px-4 py-2 font-medium">Success</th><th className="px-4 py-2 font-medium">Cost</th><th className="px-4 py-2 font-medium" /></tr></thead>
              <tbody>
                {agents.filter((a) => a.department === d).map((a) => {
                  const s = stat(a.id);
                  return (
                    <tr key={a.id} className="border-b border-gray-100 last:border-0">
                      <td className="px-4 py-2"><Link href={`/admin/agents/${a.key}`} className="font-medium text-gray-900 hover:underline">{a.isDirector ? "★ " : ""}{a.name}</Link><span className="block text-xs text-gray-500">{a.role} · v{a.version}{a.handler ? "" : " · LLM loop"} · active {ago(a.updatedAt)}</span></td>
                      <td className="px-4 py-2"><Badge>{a.status}</Badge></td>
                      <td className="px-4 py-2 text-xs text-gray-600">{a.autonomy.replace(/_/g, " ")}</td>
                      <td className="px-4 py-2">{s.done}</td>
                      <td className="px-4 py-2">{s.rate == null ? "—" : `${s.rate}%`}</td>
                      <td className="px-4 py-2">${s.cost.toFixed(2)}</td>
                      <td className="px-4 py-2 text-right">{a.status === "ACTIVE" ? <ApiButton label="Pause" url={`/api/os/agents/${a.key}`} body={{ action: "set_status", status: "PAUSED" }} /> : a.status !== "ARCHIVED" ? <ApiButton label="Activate" url={`/api/os/agents/${a.key}`} body={{ action: "set_status", status: "ACTIVE" }} /> : null}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      ))}
      <Card>
        <h2 className="mb-3 text-sm font-semibold text-gray-900">Create AI employee (starts as DRAFT)</h2>
        <ApiForm
          url="/api/os/agents" submitLabel="Create draft"
          fields={[
            { name: "key", label: "Key (a-z, 0-9, -)", required: true, placeholder: "ai-dental-receptionist" },
            { name: "name", label: "Name", required: true },
            { name: "department", label: "Department", type: "select", options: ["REVENUE", "MARKETING", "CUSTOMER_SUCCESS", "PRODUCT", "ENGINEERING", "FINANCE", "OPERATIONS"] },
            { name: "role", label: "Role", required: true },
            { name: "objective", label: "Objective", type: "textarea", required: true },
            { name: "autonomy", label: "Autonomy", type: "select", options: ["ASSISTED", "SEMI_AUTONOMOUS", "AUTONOMOUS"] },
          ]}
        />
      </Card>
    </div>
  );
}
