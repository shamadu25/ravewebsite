import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { ORG_ID } from "@/lib/os/constants";
import { getGoalState } from "@/lib/os/metrics";
import { rankPriorities } from "@/lib/os/commander";
import { isOutboundPaused } from "@/lib/os/outreach";
import { llmStatus } from "@/lib/os/llm";
import { channelStatuses } from "@/lib/os/channels";
import ApiButton from "@/components/os/ApiButton";
import AutoRefresh from "@/components/os/AutoRefresh";
import LiveRefresh from "@/components/os/LiveRefresh";
import { Badge, Card, PageHeader, Stat, ago, usd } from "@/components/os/ui";

export const dynamic = "force-dynamic";

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

async function websiteFunnel() {
  const today = startOfToday();
  const [visitorsToday, conversationsToday, totalLeads, handoffs] = await Promise.all([
    prisma.visitor.count({ where: { lastSeenAt: { gte: today } } }),
    prisma.conversation.count({ where: { createdAt: { gte: today } } }),
    prisma.lead.count(),
    prisma.conversation.count({ where: { status: "human_handoff" } }),
  ]);
  return { visitorsToday, conversationsToday, totalLeads, handoffs };
}

export default async function CommandCenter() {
  const today = startOfToday();
  const [{ goal, state, revenue, pipeline }, agentCount, taskStats, pending, alerts, priorities, funnel, outboundPaused, customerCount] = await Promise.all([
    getGoalState(),
    prisma.osAgent.groupBy({ by: ["status"], where: { orgId: ORG_ID }, _count: true }),
    prisma.osTask.groupBy({ by: ["status"], where: { orgId: ORG_ID, createdAt: { gte: today } }, _count: true }),
    prisma.osApproval.findMany({ where: { orgId: ORG_ID, status: "PENDING" }, orderBy: { createdAt: "desc" }, take: 5 }),
    prisma.osAlert.findMany({ where: { orgId: ORG_ID, resolvedAt: null }, orderBy: { createdAt: "desc" }, take: 6 }),
    rankPriorities(),
    websiteFunnel(),
    isOutboundPaused(),
    prisma.osCustomer.count({ where: { orgId: ORG_ID, status: { not: "CHURNED" } } }),
  ]);

  const totalAgents = agentCount.reduce((n, a) => n + a._count, 0);
  const activeAgents = agentCount.find((a) => a.status === "ACTIVE")?._count ?? 0;
  const t = (s: string) => taskStats.find((x) => x.status === s)?._count ?? 0;
  const tasksToday = taskStats.reduce((n, x) => n + x._count, 0);
  const llm = llmStatus();
  const channels = channelStatuses();

  if (totalAgents === 0) {
    return (
      <div>
        <PageHeader title="Command Center" subtitle="The AI Operating System has not been initialised yet." />
        <Card>
          <p className="text-sm text-gray-700">This creates the agent registry, vertical templates and Company Brain scaffolding. It never overwrites existing configuration. Demo records are clearly marked and cannot send messages.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <ApiButton label="Initialise operating system" variant="primary" size="md" url="/api/os/seed" body={{}} result="seed" />
            <ApiButton label="Initialise with demo data" size="md" url="/api/os/seed" body={{ demo: true }} />
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AutoRefresh seconds={60} />
      <LiveRefresh />
      <PageHeader
        title="Command Center"
        subtitle={`Target: ${usd(goal.annualRevenueTargetUsd)} ${goal.targetType}. Every figure below comes from recorded data.${revenue.hasDemoData ? " Demo records are included." : ""}`}
        actions={
          <>
            <ApiButton label="Run operating loop" variant="primary" url="/api/os/run" body={{ job: "tick" }} result="loop" />
            <ApiButton label="Process queue" url="/api/os/run" body={{ job: "process-queue" }} result="queue" />
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
        <Stat label="ARR" value={usd(state.currentArrUsd)} />
        <Stat label="MRR" value={usd(state.currentMrrUsd)} />
        <Stat label="Revenue this month" value={usd(revenue.revenueThisMonthUsd)} hint={`Last month ${usd(revenue.revenueLastMonthUsd)}`} />
        <Stat label="Customers" value={String(customerCount)} />
        <Stat label="Pipeline (weighted)" value={usd(pipeline.weightedValueUsd)} hint={`${usd(pipeline.openValueUsd)} open · ${pipeline.openCount} deals`} />
        <Stat label="Monthly growth" value={state.monthlyGrowthRate == null ? "No data" : `${(state.monthlyGrowthRate * 100).toFixed(1)}%`} hint={state.monthlyGrowthRate == null ? "Needs 30d of history" : undefined} />
      </div>

      <Card>
        <div className="flex items-baseline justify-between">
          <h2 className="text-sm font-semibold text-gray-900">Revenue gap</h2>
          <p className="text-xs text-gray-500">{state.progressPct.toFixed(1)}% of target</p>
        </div>
        <div className="mt-3 h-3 overflow-hidden rounded-full bg-gray-100"><div className="h-full rounded-full bg-gray-900" style={{ width: `${Math.max(0.5, state.progressPct)}%` }} /></div>
        <div className="mt-3 grid gap-2 text-sm text-gray-700 sm:grid-cols-4">
          <p>Gap <b>{usd(state.remainingArrUsd)}</b></p>
          <p>Need <b>{usd(state.requiredAdditionalMrrUsd)}</b> more MRR</p>
          <p>Customers needed <b>{state.requiredCustomers ?? "No data"}</b></p>
          <p>Projected <b>{state.projectedAchievementDate ?? "No data"}</b></p>
        </div>
        {state.insufficientData.length > 0 && <p className="mt-2 text-xs text-amber-700">INSUFFICIENT DATA: {state.insufficientData.join(" · ")}</p>}
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="mb-3 text-sm font-semibold text-gray-900">AI workforce</h2>
          <div className="grid grid-cols-3 gap-3 text-sm">
            <div><p className="text-xs text-gray-500">Active agents</p><p className="text-xl font-semibold">{activeAgents}<span className="text-sm text-gray-400"> / {totalAgents}</span></p></div>
            <div><p className="text-xs text-gray-500">Tasks today</p><p className="text-xl font-semibold">{tasksToday}</p></div>
            <div><p className="text-xs text-gray-500">Completed</p><p className="text-xl font-semibold text-emerald-700">{t("COMPLETED")}</p></div>
            <div><p className="text-xs text-gray-500">Failed</p><p className="text-xl font-semibold text-red-700">{t("FAILED")}</p></div>
            <div><p className="text-xs text-gray-500">Waiting on you</p><p className="text-xl font-semibold text-amber-700">{t("WAITING_APPROVAL")}</p></div>
            <div><p className="text-xs text-gray-500">Queued</p><p className="text-xl font-semibold">{t("QUEUED")}</p></div>
          </div>
          <p className="mt-3 text-xs text-gray-500">{llm.configured ? `LLM: ${llm.providers.filter((p) => p.available).map((p) => p.name).join(", ")}` : "LLM: NOT CONNECTED — deterministic agents run; generic agents cannot."} · Outbound: {outboundPaused ? "PAUSED" : "enabled"}</p>
        </Card>

        <Card>
          <h2 className="mb-3 text-sm font-semibold text-gray-900">CEO decisions required</h2>
          {pending.length === 0 ? <p className="text-sm text-gray-500">Nothing needs you right now.</p> : (
            <ul className="divide-y divide-gray-100">
              {pending.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                  <span className="min-w-0 truncate text-gray-800">{p.title}</span>
                  <Link href="/admin/approvals" className="shrink-0 text-xs font-medium text-blue-700">Review</Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <h2 className="mb-3 text-sm font-semibold text-gray-900">Revenue pipeline</h2>
          <div className="space-y-1.5 text-sm">
            {Object.entries(pipeline.byStage).filter(([, v]) => v.count > 0).map(([stage, v]) => (
              <div key={stage} className="flex items-center justify-between"><span className="text-gray-600">{stage.replace(/_/g, " ")}</span><span className="text-gray-900">{v.count} · {usd(v.valueUsd)}</span></div>
            ))}
            {pipeline.openCount === 0 && Object.values(pipeline.byStage).every((v) => v.count === 0) && <p className="text-gray-500">No opportunities yet. <Link className="text-blue-700" href="/admin/revenue">Add a prospect</Link>.</p>}
          </div>
        </Card>

        <Card>
          <h2 className="mb-3 text-sm font-semibold text-gray-900">Alerts</h2>
          {alerts.length === 0 ? <p className="text-sm text-gray-500">No open alerts.</p> : (
            <ul className="space-y-2">
              {alerts.map((a) => (
                <li key={a.id} className="flex items-start justify-between gap-2 text-sm">
                  <span><Badge>{a.severity}</Badge> <span className="text-gray-800">{a.title}</span><span className="block text-xs text-gray-500">{a.category} · {ago(a.createdAt)}</span></span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card>
        <h2 className="mb-3 text-sm font-semibold text-gray-900">What should RaveSoft do next?</h2>
        {priorities.length === 0 ? <p className="text-sm text-gray-500">INSUFFICIENT DATA — add prospects or revenue and the Commander will rank actions.</p> : (
          <ol className="space-y-2 text-sm">
            {priorities.slice(0, 5).map((p, i) => (
              <li key={p.title} className="flex gap-3"><span className="text-gray-400">{i + 1}.</span><span><b className="text-gray-900">{p.title}</b> <span className="text-gray-500">— {p.why}</span> <span className="text-xs text-gray-400">({p.humanOnly ? "needs a human" : p.agentKey ? `→ ${p.agentKey}` : ""} · score {p.score})</span></span></li>
            ))}
          </ol>
        )}
      </Card>

      <Card>
        <h2 className="mb-3 text-sm font-semibold text-gray-900">Channels</h2>
        <div className="flex flex-wrap gap-2 text-xs">
          {channels.map((c) => <span key={c.channel} className={`rounded-full px-2.5 py-1 ${c.connected ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-600"}`}>{c.channel}: {c.connected ? "connected" : "NOT CONNECTED"}</span>)}
        </div>
      </Card>

      <Card>
        <h2 className="mb-3 text-sm font-semibold text-gray-900">Website AI funnel (Ama)</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Visitors today" value={String(funnel.visitorsToday)} />
          <Stat label="Conversations today" value={String(funnel.conversationsToday)} />
          <Stat label="Leads captured" value={String(funnel.totalLeads)} />
          <Stat label="Pending handoffs" value={String(funnel.handoffs)} />
        </div>
      </Card>
    </div>
  );
}
