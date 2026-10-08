/**
 * RaveSoft AI Commander — OBSERVE → THINK → DECIDE → ACT → MEASURE → LEARN.
 * Deterministic orchestration over real data. The LLM is only used (optionally) to phrase answers to the CEO;
 * priorities, briefs and alerts never depend on a model being available.
 */
import { prisma } from "@/lib/prisma";
import { ORG_ID, STAGE_PROBABILITY } from "./constants";
import { audit } from "./audit";
import { getGoalState } from "./metrics";
import { priorityScore, DEFAULT_PRIORITY_WEIGHTS, type PriorityWeights } from "./priority";
import { enqueueTask } from "./queue";
import { createOpportunity } from "./crm";
import { raiseAlert } from "./tools/registry";
import { complete, LlmUnavailableError } from "./llm";
import { registerApprovalAction, requestApproval } from "./approvals";
import { isOutboundPaused, setOutboundPaused } from "./outreach";
import type { Role } from "./rbac";
import { refreshUsageFromEvents } from "./products";
import { tickWorkflows } from "./workflows";
import { proposeLearnings } from "./learning";
import { setLoopLock } from "./loop-lock";

const WEIGHTS_KEY = `os:${ORG_ID}:priority_weights`;
const day = () => new Date().toISOString().slice(0, 10);
const usd = (n: number) => `$${Math.round(n).toLocaleString()}`;
const pct = (n: number | null) => (n == null ? "INSUFFICIENT DATA" : `${(n * 100).toFixed(1)}%`);

export async function getPriorityWeights(): Promise<PriorityWeights> {
  const row = await prisma.systemSetting.findUnique({ where: { key: WEIGHTS_KEY } });
  return { ...DEFAULT_PRIORITY_WEIGHTS, ...((row?.value as Partial<PriorityWeights> | null) ?? {}) };
}

// ── OBSERVE ──────────────────────────────────────────────────────────────────────

/** Pull website-AI leads (Ama) into the revenue pipeline exactly once per lead. */
export async function syncWebsiteLeads(limit = 50): Promise<number> {
  const linked = await prisma.osOpportunity.findMany({ where: { orgId: ORG_ID, leadId: { not: null } }, select: { leadId: true } });
  const linkedIds = linked.map((l) => l.leadId as number);
  const leads = await prisma.lead.findMany({
    where: { id: { notIn: linkedIds.length ? linkedIds : [0] } },
    include: { contact: true, company: true },
    take: limit,
    orderBy: { id: "asc" },
  });
  let n = 0;
  for (const l of leads) {
    const contactName = [l.contact.firstName, l.contact.lastName].filter(Boolean).join(" ");
    const name = l.company?.name ?? (contactName || `Website lead #${l.id}`);
    const { opportunity, created } = await createOpportunity(
      {
        companyName: name,
        industry: l.company?.industry,
        website: l.company?.website,
        country: l.company?.country ?? l.contact.country,
        contactName: contactName || null,
        contactEmail: l.contact.email,
        contactPhone: l.contact.phone ?? l.contact.whatsapp,
        source: "website_ai_agent",
        leadId: l.id,
        notes: l.serviceInterest ? `Interested in: ${l.serviceInterest}` : null,
      },
      { actor: "commander", actorType: "SYSTEM" }
    );
    if (created) {
      n++;
      await enqueueTask({
        agentKey: "prospecting-agent", title: `Research ${name}`, input: { opportunityId: opportunity.id }, priority: "HIGH",
        createdBy: "commander", idempotencyKey: `research:${opportunity.id}`, opportunityId: opportunity.id,
      });
    }
  }
  return n;
}

export interface PriorityItem {
  title: string;
  why: string;
  revenueImpactUsd: number;
  score: number;
  agentKey: string | null;
  humanOnly: boolean;
}

export async function rankPriorities(): Promise<PriorityItem[]> {
  const now = new Date();
  const [{ state, pipeline }, weights] = await Promise.all([getGoalState(), getPriorityWeights()]);
  const [opps, redCustomers] = await Promise.all([
    prisma.osOpportunity.findMany({
      where: { orgId: ORG_ID, stage: { notIn: ["WON", "LOST", "NURTURE"] } },
      select: { stage: true, dealValueCents: true, nextFollowUpAt: true, score: true },
    }),
    prisma.osCustomer.findMany({ where: { orgId: ORG_ID, health: "RED", status: { not: "CHURNED" } }, select: { mrrCents: true } }),
  ]);
  const items: PriorityItem[] = [];
  const add = (title: string, why: string, impactUsd: number, probability: number, urgency: number, strategic: number, effort: number, agentKey: string | null, humanOnly = false) => {
    if (impactUsd <= 0) return;
    items.push({
      title, why, revenueImpactUsd: impactUsd, agentKey, humanOnly,
      score: priorityScore({ revenueImpactUsd: impactUsd, probability, urgency, strategicValue: strategic, effort }, weights),
    });
  };

  const late = opps.filter((o) => ["PROPOSAL", "NEGOTIATION", "VERBAL_COMMITMENT"].includes(o.stage));
  add(`Close ${late.length} deal(s) awaiting decision`, "Late-stage deals carry the highest probability of near-term revenue.", late.reduce((n, o) => n + o.dealValueCents, 0) / 100, 0.6, 0.9, 0.9, 0.3, null, true);
  const overdue = opps.filter((o) => o.nextFollowUpAt && o.nextFollowUpAt <= now);
  add(`Follow up with ${overdue.length} overdue prospect(s)`, "Follow-ups are past due; response rates decay quickly.", overdue.reduce((n, o) => n + o.dealValueCents, 0) / 100, STAGE_PROBABILITY.ENGAGED, 0.8, 0.6, 0.2, "outreach-agent");
  const ready = opps.filter((o) => o.stage === "RESEARCHED" && (o.score ?? 0) >= 55);
  add(`Contact ${ready.length} researched prospect(s) scoring 55+`, "Researched, high-fit prospects with no outreach yet.", ready.reduce((n, o) => n + o.dealValueCents, 0) / 100, STAGE_PROBABILITY.CONTACTED, 0.6, 0.7, 0.3, "outreach-agent");
  add(`Recover ${redCustomers.length} at-risk customer(s)`, "Retention is cheaper than acquisition.", redCustomers.reduce((n, c) => n + c.mrrCents * 12, 0) / 100, 0.5, 0.9, 0.8, 0.4, "churn-prevention-agent");
  const gap = (state.requiredPipelineUsd ?? state.remainingArrUsd) - pipeline.weightedValueUsd;
  add("Build pipeline to close the revenue gap", `Weighted pipeline ${usd(pipeline.weightedValueUsd)} vs ${usd(state.remainingArrUsd)} ARR still needed.`, Math.max(0, gap), 0.2, 0.5, 1, 0.8, "prospecting-agent");

  return items.sort((a, b) => b.score - a.score);
}

// ── THINK → DECIDE → ACT ─────────────────────────────────────────────────────────

export async function runOperatingLoop() {
  await setLoopLock(true);
  try {
    return await runOperatingLoopInner();
  } finally {
    await setLoopLock(false);
  }
}

async function runOperatingLoopInner() {
  const d = day();
  const ingested = await syncWebsiteLeads();
  await refreshUsageFromEvents();
  const { state } = await getGoalState();
  const priorities = await rankPriorities();

  const scheduled: string[] = [];
  const jobs: Array<[string, string, string, "HIGH" | "MEDIUM"]> = [
    ["revenue-director", `Daily revenue plan ${d}`, `plan:${d}`, "HIGH"],
    ["customer-health-agent", `Customer health scan ${d}`, `health:${d}`, "MEDIUM"],
    ["expansion-agent", `Expansion scan ${d}`, `expansion:${d}`, "MEDIUM"],
    ["reporting-agent", `Daily executive brief ${d}`, `brief:${d}`, "MEDIUM"],
  ];
  for (const [agentKey, title, key, priority] of jobs) {
    const r = await enqueueTask({ agentKey, title, priority, createdBy: "commander", idempotencyKey: key });
    if (r.created) scheduled.push(title);
  }

  const failed = await prisma.osTask.count({ where: { orgId: ORG_ID, status: "FAILED", completedAt: { gte: new Date(Date.now() - 86400_000) } } });
  if (failed >= 5) await raiseAlert({ severity: "HIGH", category: "Technical Risk", title: `${failed} agent tasks failed in the last 24h`, dedupeKey: `failed-tasks:${d}` });
  if (state.projectedAchievementDate === null && state.currentArrUsd < state.targetArrUsd) {
    await raiseAlert({ severity: "MEDIUM", category: "Revenue Risk", title: "No measurable path to the revenue target yet", body: state.insufficientData.join("; "), dedupeKey: `no-path:${d}` });
  }

  const workflows = await tickWorkflows();
  const learnings = await proposeLearnings();
  await audit({ actor: "commander", actorType: "SYSTEM", action: "commander.loop", resource: "commander", output: { ingested, scheduled, workflows, learnings, topPriority: priorities[0]?.title ?? null } });
  return { ingested, scheduled, workflows, learnings, topPriorities: priorities.slice(0, 5) };
}

/** Heartbeat: cheaply decide whether an agent has work before spending a run (spec §83). */
export async function runHeartbeats(): Promise<Array<{ agent: string; action: string }>> {
  const now = new Date();
  const out: Array<{ agent: string; action: string }> = [];
  const agents = await prisma.osAgent.findMany({ where: { orgId: ORG_ID, status: "ACTIVE", heartbeatMinutes: { not: null } } });
  for (const a of agents) {
    const every = (a.heartbeatMinutes as number) * 60_000;
    if (a.lastHeartbeatAt && now.getTime() - a.lastHeartbeatAt.getTime() < every) continue;
    await prisma.osAgent.update({ where: { id: a.id }, data: { lastHeartbeatAt: now } });
    if (a.key === "revenue-director") {
      const [fresh, overdue] = await Promise.all([
        prisma.osOpportunity.count({ where: { orgId: ORG_ID, stage: { in: ["NEW", "RESEARCHED"] }, createdAt: { gte: a.lastHeartbeatAt ?? new Date(0) } } }),
        prisma.osOpportunity.count({ where: { orgId: ORG_ID, stage: { in: ["CONTACTED", "ENGAGED"] }, nextFollowUpAt: { lte: now } } }),
      ]);
      if (fresh + overdue === 0) { out.push({ agent: a.key, action: "no-op (nothing new)" }); continue; }
      await enqueueTask({ agentKey: a.key, title: "Heartbeat revenue review", createdBy: "heartbeat", idempotencyKey: `plan:${day()}:hb:${Math.floor(now.getTime() / every)}` });
      out.push({ agent: a.key, action: `queued (new=${fresh}, overdue=${overdue})` });
    } else {
      out.push({ agent: a.key, action: "no heartbeat check defined" });
    }
  }
  return out;
}

// ── Executive brief ──────────────────────────────────────────────────────────────

export async function generateBrief() {
  const since = new Date(Date.now() - 86400_000);
  const [{ goal, state, revenue, pipeline }, priorities, pending, alerts, tasks, customers, topOpps, aiCost] = await Promise.all([
    getGoalState(),
    rankPriorities(),
    prisma.osApproval.findMany({ where: { orgId: ORG_ID, status: "PENDING" }, orderBy: { createdAt: "desc" }, take: 10 }),
    prisma.osAlert.findMany({ where: { orgId: ORG_ID, resolvedAt: null }, orderBy: { createdAt: "desc" }, take: 10 }),
    prisma.osTask.findMany({ where: { orgId: ORG_ID, createdAt: { gte: since } }, include: { agent: { select: { name: true } } } }),
    prisma.osCustomer.groupBy({ by: ["health"], where: { orgId: ORG_ID, status: { not: "CHURNED" } }, _count: true }),
    prisma.osOpportunity.findMany({ where: { orgId: ORG_ID, stage: { notIn: ["WON", "LOST"] }, score: { not: null } }, orderBy: { score: "desc" }, take: 3 }),
    prisma.osTask.aggregate({ where: { orgId: ORG_ID, createdAt: { gte: new Date(Date.now() - 30 * 86400_000) } }, _sum: { costUsd: true } }),
  ]);
  const done = tasks.filter((t) => t.status === "COMPLETED");
  const failed = tasks.filter((t) => t.status === "FAILED");
  const health = Object.fromEntries(customers.map((c) => [c.health, c._count])) as Record<string, number>;
  const byAgent = done.reduce<Record<string, number>>((m, t) => ((m[t.agent.name] = (m[t.agent.name] ?? 0) + 1), m), {});

  const sections: Record<string, string[]> = {
    "1. REVENUE": [
      `ARR ${usd(state.currentArrUsd)} of ${usd(state.targetArrUsd)} target (${state.progressPct.toFixed(1)}%). MRR ${usd(state.currentMrrUsd)}. Gap ${usd(state.remainingArrUsd)}.`,
      `Monthly growth: ${pct(state.monthlyGrowthRate)}. Required: ${pct(state.requiredMonthlyGrowthRate)}. Projected target date: ${state.projectedAchievementDate ?? "INSUFFICIENT DATA"}.`,
      `Revenue this month ${usd(revenue.revenueThisMonthUsd)} vs last month ${usd(revenue.revenueLastMonthUsd)}.${revenue.hasDemoData ? " (Includes demo records.)" : ""}`,
    ],
    "2. SALES": [`Open pipeline ${usd(pipeline.openValueUsd)} across ${pipeline.openCount} deals; weighted ${usd(pipeline.weightedValueUsd)}.`, `Win rate (30d): ${pct(pipeline.winRate30d)}.`],
    "3. MARKETING": ["INSUFFICIENT DATA — no campaign or analytics integration is connected."],
    "4. CUSTOMERS": [`Health: ${health.GREEN ?? 0} green / ${health.YELLOW ?? 0} yellow / ${health.RED ?? 0} red.`],
    "5. PRODUCTS": ["INSUFFICIENT DATA — CliqPOS / KOVABOT product feeds are not connected."],
    "6. ENGINEERING": [`${failed.length} failed agent task(s) in 24h.`],
    "7. FINANCE": [`AI spend (30d): $${(aiCost._sum.costUsd ?? 0).toFixed(2)}.`, "Cash position: INSUFFICIENT DATA (no finance integration)."],
    "8. OPERATIONS": [`${tasks.length} tasks created in 24h; ${done.length} completed; ${tasks.filter((t) => t.status === "QUEUED").length} queued.`],
    "9. RISKS": alerts.length ? alerts.map((a) => `[${a.severity}] ${a.title}`) : ["No open alerts."],
    "10. OPPORTUNITIES": topOpps.length ? topOpps.map((o) => `${o.companyName} — score ${o.score}, ${o.stage}, ${(o.recommendedEmployees as string[] | null)?.[0] ?? "no recommendation"}`) : ["No scored prospects yet."],
    "11. AI ACTIONS TAKEN": done.length ? Object.entries(byAgent).map(([n, c]) => `${n}: ${c} task(s)`) : ["No agent tasks completed in the last 24h."],
    "12. HUMAN DECISIONS REQUIRED": pending.length ? pending.map((p) => `#${p.id} ${p.title}`) : ["None."],
    "13. RECOMMENDED PRIORITIES": priorities.length ? priorities.slice(0, 5).map((p, i) => `${i + 1}. ${p.title} — ${p.why}`) : ["INSUFFICIENT DATA — add prospects or revenue to generate priorities."],
  };
  const content = { generatedAt: new Date().toISOString(), target: goal.annualRevenueTargetUsd, sections };
  const d = day();
  await prisma.osBrief.upsert({
    where: { orgId_kind_forDate: { orgId: ORG_ID, kind: "DAILY", forDate: d } },
    create: { orgId: ORG_ID, kind: "DAILY", forDate: d, content: content as never },
    update: { content: content as never },
  });
  return content;
}

// ── Strategic engine (spec §68): answers only from data, else INSUFFICIENT DATA ──

export async function strategicAnswers() {
  const [{ state, pipeline }, won, lost, priorities] = await Promise.all([
    getGoalState(),
    prisma.osOpportunity.findMany({ where: { orgId: ORG_ID, stage: "WON" }, select: { source: true, industry: true } }),
    prisma.osOpportunity.count({ where: { orgId: ORG_ID, stage: "LOST" } }),
    rankPriorities(),
  ]);
  const best = (key: "source" | "industry") => {
    const m = new Map<string, number>();
    for (const w of won) {
      const v = w[key];
      if (v) m.set(v, (m.get(v) ?? 0) + 1);
    }
    const top = [...m.entries()].sort((a, b) => b[1] - a[1])[0];
    return won.length >= 3 && top ? `${top[0]} (${top[1]} of ${won.length} wins)` : `INSUFFICIENT DATA — need at least 3 won deals (have ${won.length}).`;
  };
  return [
    { q: "What is currently limiting RaveSoft growth?", a: state.currentMrrUsd === 0 ? "No recurring revenue is recorded yet. The binding constraint is converting a first prospect to a paying customer." : `Weighted pipeline ${usd(pipeline.weightedValueUsd)} vs ${usd(state.remainingArrUsd)} ARR needed.` },
    { q: "What is the highest-value action today?", a: priorities[0] ? `${priorities[0].title} — ${priorities[0].why}` : "INSUFFICIENT DATA" },
    { q: "Which customer segment converts best?", a: best("industry") },
    { q: "Which channel produces the best customers?", a: best("source") },
    { q: "Where are we wasting money?", a: "INSUFFICIENT DATA — no spend or campaign data is connected." },
    { q: "Which product has the highest growth potential?", a: "INSUFFICIENT DATA — no per-product funnel data is connected." },
    { q: "Deals lost to date", a: String(lost) },
  ];
}

// ── CEO chat + commands (spec §84-85) ────────────────────────────────────────────

export interface AskResult {
  answer: string;
  grounded: "llm" | "deterministic";
  pendingConfirmation?: { approvalId: number; description: string };
}

export async function askCommander(question: string, user: { name: string; role: Role }): Promise<AskResult> {
  const q = question.trim();
  const lower = q.toLowerCase();

  const confirm = async (description: string, action: { type: string; [k: string]: unknown }, impact?: string): Promise<AskResult> => {
    const a = await requestApproval({
      kind: "COMMAND", title: description, objective: `CEO command: "${q}"`, recommendation: "Confirm to execute.",
      expectedImpact: impact, requiredRole: "CEO", action, requestedBy: `user:${user.name}`,
    });
    return {
      answer: `You are about to: ${description}\n\nNothing has changed yet. Confirm or cancel below.`,
      grounded: "deterministic",
      pendingConfirmation: { approvalId: a.id, description },
    };
  };

  if (/\bpause\b.*\boutbound\b/.test(lower)) return confirm("Pause ALL outbound messaging", { type: "command.set_outbound_paused", paused: true }, "No outreach will be sent until resumed.");
  if (/\bresume\b.*\boutbound\b/.test(lower)) return confirm("Resume outbound messaging", { type: "command.set_outbound_paused", paused: false });

  const agentCmd = /^\s*(pause|resume|activate)\s+(?:agent\s+)?([a-z0-9 -]+)$/.exec(lower);
  if (agentCmd) {
    const needle = agentCmd[2].trim();
    const agent = (await prisma.osAgent.findMany({ where: { orgId: ORG_ID } })).find((a) => a.key === needle || a.name.toLowerCase() === needle);
    if (!agent) return { answer: `No agent matches "${needle}".`, grounded: "deterministic" };
    const pausing = agentCmd[1] === "pause";
    return confirm(`${pausing ? "Pause" : "Activate"} agent ${agent.name}`, { type: "command.set_agent_status", agentKey: agent.key, status: pausing ? "PAUSED" : "ACTIVE" });
  }
  if (/\b(increase|raise|change)\b.*\b(budget|spend)\b/.test(lower)) {
    return { answer: "Ad spend changes cannot be executed: no ads integration is connected (NOT CONNECTED).", grounded: "deterministic" };
  }
  if (/\b(run|start)\b.*\b(loop|daily plan|operating)\b/.test(lower)) {
    const r = await runOperatingLoop();
    return { answer: `Operating loop ran. Ingested ${r.ingested} website lead(s); scheduled: ${r.scheduled.join(", ") || "nothing new (already scheduled today)"}.`, grounded: "deterministic" };
  }

  const [{ state, pipeline, revenue }, priorities, strategic, pending, atRisk, topOpps] = await Promise.all([
    getGoalState(),
    rankPriorities(),
    strategicAnswers(),
    prisma.osApproval.count({ where: { orgId: ORG_ID, status: "PENDING" } }),
    prisma.osCustomer.findMany({ where: { orgId: ORG_ID, health: "RED", status: { not: "CHURNED" } }, select: { name: true, mrrCents: true, healthReasons: true } }),
    prisma.osOpportunity.findMany({
      where: { orgId: ORG_ID, stage: { notIn: ["WON", "LOST"] }, score: { not: null } }, orderBy: { score: "desc" }, take: 5,
      select: { companyName: true, score: true, stage: true, dealValueCents: true, recommendedEmployees: true },
    }),
  ]);
  const snapshot = { goal: state, revenue, pipeline, priorities: priorities.slice(0, 5), strategic, pendingApprovals: pending, atRiskCustomers: atRisk, topProspects: topOpps };

  try {
    const r = await complete({
      tier: "strong", temperature: 0.2,
      system: "You are the RaveSoft AI Commander advising the CEO. Answer ONLY from the DATA provided. If the data cannot support an answer, say 'INSUFFICIENT DATA' and state what is missing. Never invent numbers. Be concise and decision-oriented; cite the figures you used.",
      user: `DATA:\n${JSON.stringify(snapshot)}\n\nQUESTION: ${q}`,
    });
    await audit({ actor: user.name, actorType: "HUMAN", action: "commander.ask", resource: "commander", input: { question: q }, output: { model: r.model, costUsd: r.costUsd } });
    return { answer: r.text, grounded: "llm" };
  } catch (e) {
    if (!(e instanceof LlmUnavailableError)) throw e;
  }

  const lines: string[] = [];
  if (/(500|gap|limit|prevent|target|revenue|growth|arr|mrr)/.test(lower)) {
    lines.push(`ARR ${usd(state.currentArrUsd)} / ${usd(state.targetArrUsd)} (${state.progressPct.toFixed(1)}%). Gap ${usd(state.remainingArrUsd)} → ${usd(state.requiredAdditionalMrrUsd)} additional MRR.`);
    if (state.insufficientData.length) lines.push(`INSUFFICIENT DATA for: ${state.insufficientData.join("; ")}.`);
    lines.push(strategic[0].a);
  }
  if (/(risk|churn)/.test(lower)) lines.push(atRisk.length ? `At-risk customers: ${atRisk.map((c) => c.name).join(", ")}.` : "No customers are currently flagged RED.");
  if (/(opportunit|prospect|pipeline|best|biggest)/.test(lower)) lines.push(topOpps.length ? `Top prospects: ${topOpps.map((o) => `${o.companyName} (${o.score})`).join(", ")}.` : "No scored prospects yet.");
  if (/(approv|decision)/.test(lower)) lines.push(`${pending} approval(s) awaiting you.`);
  if (/(today|next|do|priorit)/.test(lower) || !lines.length) lines.push(priorities[0] ? `Highest-value action: ${priorities[0].title} — ${priorities[0].why}` : "INSUFFICIENT DATA to rank actions.");
  lines.push("(No LLM provider is configured, so this is a data readout rather than analysis.)");
  return { answer: lines.join("\n"), grounded: "deterministic" };
}

registerApprovalAction("command.set_outbound_paused", async (a) => {
  await setOutboundPaused(a.paused === true);
  return { ok: true, outboundPaused: await isOutboundPaused() };
});
registerApprovalAction("command.set_agent_status", async (a) => {
  await prisma.osAgent.update({ where: { key: String(a.agentKey) }, data: { status: String(a.status) } });
  return { ok: true };
});
