import { prisma } from "@/lib/prisma";
import { ORG_ID } from "@/lib/os/constants";
import { llmStatus } from "@/lib/os/llm";
import { isOutboundPaused } from "@/lib/os/outreach";
import { loopRunningSince } from "@/lib/os/loop-lock";
import { workforce } from "@/lib/os/dashboard-data";
import { ago } from "@/components/os/ui";
import AIStatus, { type CommanderInfo } from "./AIStatus";
import RunLoopButton from "./RunLoopButton";

export default async function CommandHero() {
  const [commander, lastLoop, counts, paused, runningSince, w] = await Promise.all([
    prisma.osAgent.findUnique({ where: { key: "ai-commander" } }),
    prisma.osAuditLog.findFirst({ where: { orgId: ORG_ID, action: "commander.loop" }, orderBy: { id: "desc" }, select: { createdAt: true } }),
    prisma.osTask.groupBy({ by: ["status"], where: { orgId: ORG_ID, status: { in: ["QUEUED", "RUNNING", "WAITING_APPROVAL"] } }, _count: true }),
    isOutboundPaused(),
    loopRunningSince(),
    workforce(),
  ]);
  const n = (s: string) => counts.find((c) => c.status === s)?._count ?? 0;
  const llm = llmStatus();
  const info: CommanderInfo = {
    state: !commander ? "NOT_SET_UP" : commander.status === "ACTIVE" ? "ACTIVE" : commander.status === "ERROR" ? "ERROR" : "PAUSED",
    lastLoop: lastLoop?.createdAt.toISOString() ?? null, queued: n("QUEUED"), running: n("RUNNING"), waitingApproval: n("WAITING_APPROVAL"),
    llm: llm.configured ? llm.providers.filter((p) => p.available).map((p) => p.name).join(", ") : "Not connected", outboundPaused: paused, activeAgents: w.active,
  };
  return (
    <section className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between" aria-labelledby="hero">
      <div className="max-w-2xl">
        <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-[var(--primary)]">AI Command Centre</p>
        <h1 id="hero" className="mt-2 text-[36px] font-semibold leading-[1.08] tracking-tight sm:text-[44px] lg:text-[52px]">Your AI Employees Are <span className="text-[var(--primary-bright)]">Working</span></h1>
        <p className="mt-3 text-[15px] leading-relaxed text-[var(--muted)]">Coordinated AI Employees driving revenue, growth and operations across all RaveSoft products.</p>
        {w.active > 0 && <p className="mt-2 text-[13px] font-medium text-[var(--success)]">{w.active} AI Employee{w.active > 1 ? "s are" : " is"} working · {w.tasksToday} task{w.tasksToday === 1 ? "" : "s"} today</p>}
      </div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start lg:flex-col lg:items-end">
        <AIStatus info={info} lastLoopLabel={lastLoop ? ago(lastLoop.createdAt) : "Never"} />
        <RunLoopButton runningSince={runningSince?.toISOString() ?? null} />
      </div>
    </section>
  );
}
