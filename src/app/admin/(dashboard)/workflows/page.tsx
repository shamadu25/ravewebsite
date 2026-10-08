import { prisma } from "@/lib/prisma";
import { ORG_ID } from "@/lib/os/constants";
import ApiButton from "@/components/os/ApiButton";
import ApiForm from "@/components/os/ApiForm";
import { Badge, Card, PageHeader, ago } from "@/components/os/ui";
import WorkflowEditor from "@/components/os/WorkflowEditor";
import type { WorkflowDef } from "@/lib/os/workflows";

export const dynamic = "force-dynamic";

const SAMPLE = {
  key: "new-lead-followup", name: "New lead follow-up", trigger: "opportunity.created", enabled: true,
  definition: { start: "research", nodes: [
    { id: "research", type: "AGENT", agentKey: "prospecting-agent", title: "Research new lead", wait: true, next: "gate" },
    { id: "gate", type: "CONDITION", condition: { field: "source", op: "eq", value: "website_ai_agent" }, next: "alert", else: "end" },
    { id: "alert", type: "NOTIFICATION", severity: "MEDIUM", title: "Website lead researched", next: "end" },
    { id: "end", type: "END" },
  ] },
};

export default async function WorkflowsPage() {
  const [wfs, rules, agents] = await Promise.all([
    prisma.osWorkflow.findMany({ where: { orgId: ORG_ID }, orderBy: { id: "desc" }, include: { runs: { orderBy: { id: "desc" }, take: 3 } } }),
    prisma.osRule.findMany({ where: { orgId: ORG_ID }, orderBy: { id: "desc" } }),
    prisma.osAgent.findMany({ where: { orgId: ORG_ID }, select: { key: true } }),
  ]);
  return (
    <div className="space-y-6">
      <PageHeader title="Workflows & automation" subtitle="Triggers start workflows; nodes run agents, conditions, delays, approvals, notifications, CRM updates and https calls. Failed runs are visible, never silent." />
      {wfs.map((w) => {
        const def = w.definition as WorkflowDef;
        return (
          <Card key={w.id}>
            <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="font-semibold text-gray-900">{w.name} <span className="text-xs font-normal text-gray-400">{w.key} · trigger {w.trigger}{w.everyMinutes ? ` every ${w.everyMinutes}m` : ""}</span></h2>
              <span className="flex gap-2"><Badge>{w.enabled ? "ACTIVE" : "PAUSED"}</Badge><ApiButton label="Run now" url={`/api/os/workflows/${w.key}`} body={{ action: "run" }} /><ApiButton label={w.enabled ? "Disable" : "Enable"} url={`/api/os/workflows/${w.key}`} body={{ action: "toggle" }} /></span></div>
            <div className="mt-3 flex flex-wrap items-center gap-1 text-xs">
              {def.nodes.map((n, i) => <span key={n.id} className="flex items-center gap-1"><span className="rounded-md border border-gray-300 bg-gray-50 px-2 py-1"><b>{n.type}</b> {n.id}</span>{i < def.nodes.length - 1 && <span className="text-gray-400">→</span>}</span>)}
            </div>
            <ul className="mt-3 space-y-1 text-xs text-gray-600">{w.runs.map((r) => <li key={r.id}>Run #{r.id} <Badge>{r.status === "RUNNING" || r.status === "WAITING" ? "QUEUED" : r.status === "COMPLETED" ? "COMPLETED" : "FAILED"}</Badge> {r.status} · {ago(r.createdAt)}{r.error ? ` · ${r.error}` : ""}</li>)}</ul>
          </Card>
        );
      })}
      <Card>
        <h2 className="mb-2 text-sm font-semibold text-gray-900">Workflow editor</h2>
        <WorkflowEditor sample={JSON.stringify(SAMPLE, null, 2)} agentKeys={agents.map((a) => a.key)} />
      </Card>
      <Card>
        <h2 className="mb-3 text-sm font-semibold text-gray-900">Automation rules (WHEN → IF → THEN)</h2>
        <ul className="mb-4 space-y-2 text-sm">
          {rules.map((r) => <li key={r.id} className="flex items-center justify-between gap-3"><span><b>{r.name}</b> <span className="text-xs text-gray-500">WHEN {r.event}{r.condition ? ` IF ${(r.condition as { field: string; op: string; value: unknown }).field} ${(r.condition as { op: string }).op} ${String((r.condition as { value: unknown }).value)}` : ""} THEN {(r.action as { type: string }).type} · fired {r.fired}×</span></span><ApiButton label={r.enabled ? "Disable" : "Enable"} url={`/api/os/rules/${r.id}`} /></li>)}
          {rules.length === 0 && <li className="text-gray-500">No rules yet.</li>}
        </ul>
        <ApiForm url="/api/os/rules" submitLabel="Add rule" fields={[
          { name: "name", label: "Name", required: true },
          { name: "event", label: "WHEN event", type: "select", options: ["opportunity.created", "opportunity.stage_changed", "payment.received", "customer.at_risk", "approval.required", "product.registered", "product.activated", "product.subscribed", "product.churned"] },
        ]} extra={{ action: { type: "alert", severity: "MEDIUM", title: "Rule fired" } }} />
        <p className="mt-2 text-xs text-gray-500">The form creates an alert action. For conditions and agent/workflow actions, POST the full rule to <code>/api/os/rules</code>.</p>
      </Card>
    </div>
  );
}
