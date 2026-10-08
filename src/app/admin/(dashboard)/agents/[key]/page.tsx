import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ORG_ID } from "@/lib/os/constants";
import { listTools } from "@/lib/os/tools/registry";
import ApiButton from "@/components/os/ApiButton";
import ApiForm from "@/components/os/ApiForm";
import { Badge, Card, PageHeader, ago } from "@/components/os/ui";

export const dynamic = "force-dynamic";

export default async function AgentPage({ params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  const agent = await prisma.osAgent.findFirst({ where: { key, orgId: ORG_ID }, include: { versions: { orderBy: { version: "desc" } } } });
  if (!agent) notFound();
  const tasks = await prisma.osTask.findMany({ where: { agentId: agent.id }, orderBy: { id: "desc" }, take: 15 });
  const month = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1));
  const spent = await prisma.osTask.aggregate({ where: { agentId: agent.id, createdAt: { gte: month } }, _sum: { costUsd: true } });
  const granted = new Set(agent.tools as string[]);
  const tools = listTools();
  const url = `/api/os/agents/${agent.key}`;

  return (
    <div className="space-y-6">
      <PageHeader
        title={agent.name}
        subtitle={`${agent.department.replace(/_/g, " ")} · ${agent.role} · v${agent.version} · ${agent.handler ? `handler ${agent.handler}` : "LLM tool loop"}`}
        actions={<>
          <Badge>{agent.status}</Badge>
          {agent.status === "ACTIVE" ? <ApiButton label="Pause" url={url} body={{ action: "set_status", status: "PAUSED" }} /> : <ApiButton label="Activate" variant="primary" url={url} body={{ action: "set_status", status: "ACTIVE" }} />}
          <ApiButton label="Run now" url={`${url}/run`} body={{ input: {} }} result="taskQueued" />
        </>}
      />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="mb-3 text-sm font-semibold text-gray-900">Tools &amp; permissions</h2>
          <p className="mb-3 text-xs text-gray-500">An agent can only call tools it is granted. Calls to anything else are denied and audited.</p>
          <ul className="space-y-1.5 text-sm">
            {tools.filter((t) => granted.has(t.name)).map((t) => (
              <li key={t.name} className="flex items-center justify-between gap-2"><span className="font-mono text-xs">{t.name}</span><span className="text-xs text-gray-500">{t.riskLevel}{t.enabled ? "" : " · NOT CONNECTED"}</span></li>
            ))}
            {granted.size === 0 && <li className="text-gray-500">No tools granted.</li>}
          </ul>
          <p className="mt-3 text-xs text-gray-500">Autonomy: <b>{agent.autonomy}</b> · Knowledge: {(agent.knowledgeSources as string[]).join(", ") || "none"}</p>
          <p className="mt-1 text-xs text-gray-500">Budget this month: ${(spent._sum.costUsd ?? 0).toFixed(2)} / ${agent.budgetLimitUsd.toFixed(2)}</p>
        </Card>
        <Card>
          <h2 className="mb-3 text-sm font-semibold text-gray-900">Configuration (creates version {agent.version + 1})</h2>
          <ApiForm
            url={url} method="PATCH" submitLabel="Save as new version"
            fields={[
              { name: "autonomy", label: "Autonomy", type: "select", options: ["ASSISTED", "SEMI_AUTONOMOUS", "AUTONOMOUS"], defaultValue: agent.autonomy },
              { name: "modelTier", label: "Model tier", type: "select", options: ["fast", "standard", "strong"], defaultValue: agent.modelTier },
              { name: "budgetLimitUsd", label: "Monthly budget (USD)", type: "number", defaultValue: agent.budgetLimitUsd },
              { name: "systemPrompt", label: "System prompt", type: "textarea", defaultValue: agent.systemPrompt },
              { name: "note", label: "Change note" },
            ]}
          />
        </Card>
      </div>
      <Card>
        <h2 className="mb-3 text-sm font-semibold text-gray-900">Version history</h2>
        <ul className="space-y-2 text-sm">
          {agent.versions.map((v) => (
            <li key={v.id} className="flex items-center justify-between gap-3"><span><b>v{v.version}</b> <span className="text-gray-500">{v.note} — {v.changedBy}, {ago(v.createdAt)}</span></span>{v.version !== agent.version && <ApiButton label="Roll back to this" url={url} body={{ action: "rollback", version: v.version }} confirm={`Restore v${v.version} as a new version?`} />}</li>
          ))}
        </ul>
      </Card>
      <Card>
        <h2 className="mb-3 text-sm font-semibold text-gray-900">Recent tasks</h2>
        <ul className="space-y-1.5 text-sm">
          {tasks.map((t) => <li key={t.id} className="flex items-center justify-between gap-3"><a className="truncate text-blue-700 hover:underline" href={`/admin/tasks/${t.id}`}>#{t.id} {t.title}</a><span className="flex items-center gap-2"><span className="text-xs text-gray-400">{ago(t.createdAt)}</span><Badge>{t.status}</Badge></span></li>)}
          {tasks.length === 0 && <li className="text-gray-500">No tasks yet.</li>}
        </ul>
      </Card>
    </div>
  );
}
