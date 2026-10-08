import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ORG_ID } from "@/lib/os/constants";
import { listTools } from "@/lib/os/tools/registry";
import { getAgentPerformance } from "@/lib/os/performance";
import { retrieveForAgent } from "@/lib/os/brain";
import ApiButton from "@/components/os/ApiButton";
import ApiForm from "@/components/os/ApiForm";
import { Badge, Card, PageHeader, Stat, ago, usd } from "@/components/os/ui";
import type { WorkflowDef } from "@/lib/os/workflows";

export const dynamic = "force-dynamic";
const TABS = ["overview", "tasks", "performance", "instructions", "knowledge", "tools", "workflows", "activity", "settings"] as const;

export default async function AgentPage({ params, searchParams }: { params: Promise<{ key: string }>; searchParams: Promise<{ tab?: string }> }) {
  const { key } = await params;
  const tab = (TABS as readonly string[]).includes((await searchParams).tab ?? "") ? ((await searchParams).tab as (typeof TABS)[number]) : "overview";
  const agent = await prisma.osAgent.findFirst({ where: { key, orgId: ORG_ID }, include: { versions: { orderBy: { version: "desc" } } } });
  if (!agent) notFound();
  const perfAll = await getAgentPerformance();
  const perf = perfAll.find((p) => p.key === key);
  const url = `/api/os/agents/${agent.key}`;
  const last = await prisma.osTask.findFirst({ where: { agentId: agent.id }, orderBy: { id: "desc" } });
  const month = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1));
  const spent = await prisma.osTask.aggregate({ where: { agentId: agent.id, createdAt: { gte: month } }, _sum: { costUsd: true } });
  const granted = new Set(agent.tools as string[]);

  return (
    <div className="space-y-8">
      <PageHeader
        title={agent.name}
        subtitle={`${agent.department.replace(/_/g, " ").toLowerCase()} · ${agent.role} · v${agent.version}`}
        actions={<>
          <Badge>{agent.status}</Badge>
          {agent.status === "ACTIVE" ? <ApiButton label="Pause" url={url} body={{ action: "set_status", status: "PAUSED" }} /> : <ApiButton label="Activate" variant="primary" url={url} body={{ action: "set_status", status: "ACTIVE" }} />}
          <ApiButton label="Run now" url={`${url}/run`} body={{ input: {} }} result="taskQueued" />
        </>}
      />
      <nav aria-label="Employee sections" className="-mt-2 flex gap-1 overflow-x-auto border-b border-[var(--border)]">
        {TABS.map((t) => (
          <Link key={t} href={`/admin/agents/${key}?tab=${t}`} aria-current={tab === t ? "page" : undefined} className={`whitespace-nowrap border-b-2 px-3 py-2.5 text-[14px] capitalize ${tab === t ? "border-[var(--primary)] font-medium text-[var(--primary)]" : "border-transparent text-[var(--muted)] hover:text-[var(--foreground)]"}`}>{t}</Link>
        ))}
      </nav>

      {tab === "overview" && (
        <div className="space-y-6">
          <Card><h2 className="text-[13px] font-semibold uppercase tracking-wide text-[var(--muted)]">Mission</h2><p className="mt-2 text-[15px]">{agent.description ?? agent.role}</p>
            <h2 className="mt-5 text-[13px] font-semibold uppercase tracking-wide text-[var(--muted)]">Current objective</h2><p className="mt-2 text-[15px]">{last ? `Last task: ${last.title} (${last.status.toLowerCase().replace(/_/g, " ")})` : "No tasks yet."}</p></Card>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
            <Stat label="Tasks" value={String(perf?.tasks ?? 0)} />
            <Stat label="Success rate" value={perf?.successRate == null ? "—" : `${Math.round(perf.successRate * 100)}%`} />
            <Stat label="Revenue impact" value={usd(perf?.revenueInfluencedUsd ?? 0)} />
            <Stat label="Cost this month" value={`$${(spent._sum.costUsd ?? 0).toFixed(2)}`} hint={`budget $${agent.budgetLimitUsd.toFixed(0)}`} />
            <Stat label="Last activity" value={last ? ago(last.createdAt) : "—"} />
          </div>
        </div>
      )}

      {tab === "tasks" && <TasksTab agentId={agent.id} />}

      {tab === "performance" && (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Stat label="Completed" value={String(perf?.completed ?? 0)} /><Stat label="Failed" value={String(perf?.failed ?? 0)} /><Stat label="Avg time" value={perf?.avgSeconds == null ? "—" : `${perf.avgSeconds.toFixed(1)}s`} /><Stat label="Escalations" value={String(perf?.escalations ?? 0)} />
          <Stat label="Deals won (worked on)" value={String(perf?.opportunitiesWon ?? 0)} /><Stat label="Revenue influenced" value={usd(perf?.revenueInfluencedUsd ?? 0)} /><Stat label="Total cost" value={`$${(perf?.costUsd ?? 0).toFixed(3)}`} /><Stat label="Cost per $ revenue" value={perf?.costPerRevenueDollar == null ? "—" : perf.costPerRevenueDollar.toFixed(4)} />
        </div>
      )}

      {tab === "instructions" && (
        <Card><h2 className="mb-2 text-[15px] font-semibold">System instructions</h2><pre className="whitespace-pre-wrap text-[13px] leading-relaxed text-slate-700">{agent.systemPrompt}</pre><p className="mt-3 text-[12px] text-[var(--muted)]">Edit these under Settings — every change creates a new version and agents can never rewrite their own instructions.</p></Card>
      )}

      {tab === "knowledge" && <KnowledgeTab department={agent.department} sections={agent.knowledgeSources as string[]} />}

      {tab === "tools" && (
        <Card>
          <p className="mb-3 text-[13px] text-[var(--muted)]">An agent can only call tools it has been granted. Autonomy level: <b>{agent.autonomy.replace(/_/g, " ").toLowerCase()}</b>.</p>
          <ul className="divide-y divide-[var(--border)] text-[14px]">
            {listTools().filter((t) => granted.has(t.name)).map((t) => <li key={t.name} className="flex items-center justify-between py-2.5"><span><span className="font-mono text-[13px]">{t.name}</span><span className="block text-[12px] text-[var(--muted)]">{t.description}</span></span><span className="text-[12px] text-[var(--muted)]">{t.riskLevel.toLowerCase()} risk{!t.implemented ? " · not implemented" : t.enabled ? "" : " · not connected"}</span></li>)}
            {granted.size === 0 && <li className="py-3 text-[var(--muted)]">No tools granted.</li>}
          </ul>
        </Card>
      )}

      {tab === "workflows" && <WorkflowsTab agentKey={agent.key} />}
      {tab === "activity" && <ActivityTab agentKey={agent.key} />}

      {tab === "settings" && (
        <div className="space-y-6">
          <Card>
            <h2 className="mb-4 text-[15px] font-semibold">Configuration <span className="font-normal text-[var(--muted)]">(saves as version {agent.version + 1})</span></h2>
            <ApiForm url={url} method="PATCH" submitLabel="Save as new version" fields={[
              { name: "autonomy", label: "Autonomy", type: "select", options: ["ASSISTED", "SEMI_AUTONOMOUS", "AUTONOMOUS"], defaultValue: agent.autonomy },
              { name: "modelTier", label: "Model tier", type: "select", options: ["fast", "standard", "strong"], defaultValue: agent.modelTier },
              { name: "budgetLimitUsd", label: "Monthly budget (USD)", type: "number", defaultValue: agent.budgetLimitUsd },
              { name: "systemPrompt", label: "System prompt", type: "textarea", defaultValue: agent.systemPrompt }, { name: "note", label: "Change note" },
            ]} />
          </Card>
          <Card>
            <h2 className="mb-3 text-[15px] font-semibold">Version history</h2>
            <ul className="space-y-2 text-[14px]">{agent.versions.map((v) => <li key={v.id} className="flex items-center justify-between gap-3"><span><b>v{v.version}</b> <span className="text-[var(--muted)]">{v.note} — {v.changedBy}, {ago(v.createdAt)}</span></span>{v.version !== agent.version && <ApiButton label="Roll back to this" url={url} body={{ action: "rollback", version: v.version }} confirm={`Restore v${v.version} as a new version?`} />}</li>)}</ul>
          </Card>
          <Card><h2 className="mb-3 text-[15px] font-semibold">Duplicate</h2><ApiForm url={url} extra={{ action: "duplicate" }} submitLabel="Duplicate as draft" fields={[{ name: "newKey", label: "New key", required: true, placeholder: `${agent.key}-2` }]} /></Card>
        </div>
      )}
    </div>
  );
}

async function TasksTab({ agentId }: { agentId: number }) {
  const tasks = await prisma.osTask.findMany({ where: { agentId }, orderBy: { id: "desc" }, take: 25 });
  return <Card><ul className="divide-y divide-[var(--border)] text-[14px]">{tasks.map((t) => <li key={t.id} className="flex items-center justify-between gap-3 py-2.5"><Link className="min-w-0 truncate hover:underline" href={`/admin/tasks/${t.id}`}>#{t.id} {t.title}</Link><span className="flex shrink-0 items-center gap-3"><span className="text-[12px] text-[var(--muted)]">{ago(t.createdAt)}</span><Badge>{t.status}</Badge></span></li>)}{tasks.length === 0 && <li className="py-6 text-center text-[var(--muted)]">No tasks yet.</li>}</ul></Card>;
}

async function KnowledgeTab({ department, sections }: { department: string; sections: string[] }) {
  const entries = await retrieveForAgent({ department, sections, query: sections.join(" ") + " products pricing mission policy brand revenue" , limit: 20 });
  return <Card><p className="mb-3 text-[13px] text-[var(--muted)]">This employee can read these sections only: <b>{sections.join(", ") || "none"}</b>.</p><ul className="space-y-2 text-[14px]">{entries.map((e) => <li key={e.id}><b>{e.title}</b> <span className="text-[12px] text-[var(--muted)]">· {e.section}</span></li>)}{entries.length === 0 && <li className="text-[var(--muted)]">No matching knowledge yet. <Link className="text-[var(--primary)]" href="/admin/brain">Add knowledge →</Link></li>}</ul></Card>;
}

async function WorkflowsTab({ agentKey }: { agentKey: string }) {
  const wfs = await prisma.osWorkflow.findMany({ where: { orgId: ORG_ID } });
  const mine = wfs.filter((w) => (w.definition as WorkflowDef).nodes.some((n) => n.type === "AGENT" && n.agentKey === agentKey));
  return <Card><ul className="space-y-2 text-[14px]">{mine.map((w) => <li key={w.id}><Link className="font-medium hover:underline" href="/admin/workflows">{w.name}</Link> <span className="text-[12px] text-[var(--muted)]">· trigger {w.trigger}</span></li>)}{mine.length === 0 && <li className="text-[var(--muted)]">No workflow uses this employee yet.</li>}</ul></Card>;
}

async function ActivityTab({ agentKey }: { agentKey: string }) {
  const rows = await prisma.osAuditLog.findMany({ where: { orgId: ORG_ID, actor: `agent:${agentKey}` }, orderBy: { id: "desc" }, take: 30 });
  return <Card><ul className="divide-y divide-[var(--border)] text-[14px]">{rows.map((r) => <li key={r.id} className="flex justify-between py-2"><span className="font-mono text-[12px]">{r.action}</span><span className="text-[12px] text-[var(--muted)]">{r.resource}{r.resourceId ? ` #${r.resourceId}` : ""} · {ago(r.createdAt)}</span></li>)}{rows.length === 0 && <li className="py-6 text-center text-[var(--muted)]">No recorded activity.</li>}</ul></Card>;
}
