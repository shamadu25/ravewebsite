import { prisma } from "@/lib/prisma";
import { ORG_ID } from "./constants";
import { audit } from "./audit";
import { claimNextTask, recoverStaleTasks } from "./queue";
import { complete, LlmUnavailableError, parseJsonLoose, type ModelTier } from "./llm";
import { getTool, needsApproval, NotConnectedError, raiseAlert, toolFailure, type ToolContext } from "./tools/registry";
import { registerApprovalAction, requestApproval } from "./approvals";
import { retrieveForAgent } from "./brain";
import { autoFollowupsEnabled } from "./outreach";
import { HANDLERS } from "./agents/handlers";
import { ApprovalPendingError, ToolBlockedError, ToolDeniedError } from "./errors";
import type { Actor } from "./crm";

export { ToolDeniedError, ApprovalPendingError };
/** Non-retryable: retrying will not fix a missing integration or a permission denial. */
const isPermanent = (e: unknown) => e instanceof NotConnectedError || e instanceof ToolDeniedError || e instanceof ToolBlockedError || e instanceof LlmUnavailableError;

export interface AgentRecord {
  id: number; key: string; name: string; department: string; systemPrompt: string; autonomy: string; modelTier: string; temperature: number;
  tools: string[]; knowledgeSources: string[]; approvalRules: { alwaysFor?: string[] } | null; maxExecutionSec: number; maxRetries: number; budgetLimitUsd: number; handler: string | null; isDirector: boolean;
}

export interface RunContext {
  agent: AgentRecord;
  taskId: number;
  input: Record<string, unknown>;
  actor: Actor;
  isDemo: boolean;
  trace(kind: string, summary: string, data?: unknown): Promise<void>;
  tool(name: string, input?: Record<string, unknown>): Promise<Record<string, unknown>>;
  llm(opts: { system?: string; user: string; json?: boolean; tier?: ModelTier }): Promise<string>;
  brain(query: string): Promise<Array<{ section: string; title: string; content: string }>>;
}

function toRecord(a: Awaited<ReturnType<typeof prisma.osAgent.findUniqueOrThrow>>): AgentRecord {
  return { ...a, tools: a.tools as string[], knowledgeSources: a.knowledgeSources as string[], approvalRules: a.approvalRules as AgentRecord["approvalRules"], modelTier: a.modelTier };
}

async function monthlyCost(agentId: number): Promise<number> {
  const since = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1));
  const r = await prisma.osTask.aggregate({ where: { agentId, createdAt: { gte: since } }, _sum: { costUsd: true } });
  return r._sum.costUsd ?? 0;
}

function buildContext(agent: AgentRecord, taskId: number, input: Record<string, unknown>, isDemo: boolean, usage: { cost: number; inTok: number; outTok: number }): RunContext {
  let seq = 0;
  const actor: Actor = { actor: `agent:${agent.key}`, actorType: "AI_AGENT" };
  const trace: RunContext["trace"] = async (kind, summary, data) => {
    await prisma.osTrace.create({ data: { taskId, seq: ++seq, kind, summary: summary.slice(0, 2000), data: (data ?? undefined) as never } });
  };

  const tool: RunContext["tool"] = async (name, toolInput = {}) => {
    const def = getTool(name);
    const started = Date.now();
    // 1. Authorization: an agent can only ever call tools it was explicitly granted.
    if (!def || !agent.tools.includes(name)) {
      await audit({ actor: actor.actor, actorType: "AI_AGENT", action: "tool.denied", resource: "tool", resourceId: name, result: "DENIED", input: toolInput });
      await trace("tool_denied", `Denied: ${name}`);
      throw new ToolDeniedError(name, agent.key);
    }
    // 2. Availability: missing integrations fail loudly.
    const status = def.status();
    if (!def.run || !status.enabled) {
      await trace("tool_unavailable", `${name} NOT CONNECTED: ${status.reason ?? "no implementation"}`);
      throw new NotConnectedError(`${name} is not connected. ${status.reason ?? ""}`.trim());
    }
    // 3. Risk gate.
    if (needsApproval(def, agent.autonomy, agent.approvalRules)) {
      let context = JSON.stringify(toolInput, null, 2).slice(0, 3000);
      let title = `${agent.name} wants to run ${name}`;
      let bypass = false;
      if (name === "outreach.send") {
        const row = await prisma.osOutreach.findUnique({ where: { id: Number(toolInput.outreachId) }, include: { opportunity: { select: { companyName: true } } } });
        if (row) {
          title = `${row.purpose === "PROPOSAL" ? "Send proposal" : `Send email (touch ${row.touch})`} to ${row.opportunity.companyName}`;
          context = `To: ${row.toAddress ?? "—"}\nSubject: ${row.subject ?? "—"}\n\n${row.body}`;
          // Opt-in graduated autonomy: follow-ups 2–4 may go out without a click once the first touch has been approved.
          bypass = row.purpose === "OUTREACH" && row.touch > 1 && (await autoFollowupsEnabled());
        }
      }
      if (!bypass) {
        const approval = await requestApproval({
          kind: name.startsWith("outreach") ? "OUTREACH" : "OTHER",
          title,
          objective: def.description,
          context,
          recommendation: "Approve to let the agent proceed.",
          risks: `Tool risk level: ${def.riskLevel}. Agent autonomy: ${agent.autonomy}.`,
          requiredRole: def.riskLevel === "CRITICAL" ? "CEO" : "MANAGER",
          action: { type: "tool.run", agentKey: agent.key, tool: name, input: toolInput, taskId },
          taskId, requestedBy: actor.actor, isDemo,
        });
        await trace("approval_requested", `${name} requires approval #${approval.id}`, { approvalId: approval.id });
        throw new ApprovalPendingError(approval.id);
      }
      await trace("auto_approved", `${name} auto-approved (follow-up, opt-in setting)`);
    }
    // 4. Execute.
    const toolCtx: ToolContext = { agent: { ...agent, knowledgeSources: agent.knowledgeSources }, taskId, actor };
    try {
      const out = await def.run(toolCtx, { ...toolInput, isDemo });
      const failure = toolFailure(out);
      if (failure) throw failure;
      await trace("tool_call", `${name} ok`, { input: toolInput, output: out });
      await audit({ ...actor, action: "tool.call", resource: "tool", resourceId: name, input: toolInput, output: out });
      void started;
      return out;
    } catch (e) {
      await trace("tool_error", `${name} failed: ${e instanceof Error ? e.message : String(e)}`, { input: toolInput });
      await audit({ ...actor, action: "tool.call", resource: "tool", resourceId: name, input: toolInput, result: "FAILURE", output: { error: e instanceof Error ? e.message : String(e) } });
      throw e;
    }
  };

  const llm: RunContext["llm"] = async ({ system, user, json, tier }) => {
    const r = await complete({ tier: tier ?? (agent.modelTier as ModelTier), system: system ?? agent.systemPrompt, user, json, temperature: agent.temperature });
    usage.cost += r.costUsd; usage.inTok += r.inputTokens; usage.outTok += r.outputTokens;
    await trace("llm", `${r.provider}:${r.model} ${r.inputTokens}→${r.outputTokens} tok, $${r.costUsd.toFixed(5)}`, { latencyMs: r.latencyMs });
    return r.text;
  };

  return {
    agent, taskId, input, actor, isDemo, trace, tool, llm,
    brain: (q) => retrieveForAgent({ department: agent.department, sections: agent.knowledgeSources, query: q }),
  };
}

/** Generic LLM tool loop for agents without a deterministic handler. Bounded; every call goes through ctx.tool. */
async function genericLoop(ctx: RunContext): Promise<Record<string, unknown>> {
  const toolList = ctx.agent.tools.map((n) => getTool(n)).filter(Boolean).map((t) => `- ${t!.name}: ${t!.description} input=${JSON.stringify(t!.inputSchema)}`).join("\n");
  const knowledge = await ctx.brain(JSON.stringify(ctx.input));
  const history: string[] = [];
  for (let step = 0; step < 6; step++) {
    const text = await ctx.llm({
      json: true,
      user: `TASK INPUT:\n${JSON.stringify(ctx.input)}\n\nCOMPANY KNOWLEDGE (authorised excerpts):\n${JSON.stringify(knowledge)}\n\nTOOLS YOU MAY USE:\n${toolList || "(none)"}\n\nPREVIOUS STEPS:\n${history.join("\n") || "(none)"}\n\nReturn JSON: {"summary": "one-sentence decision summary", "tool_call": {"tool": string, "input": object} | null, "final": {"result": string, "confidence": 0-1} | null}. Use only listed tools. If unsure (confidence < 0.5) set final with low confidence.`,
    });
    const plan = parseJsonLoose<{ summary?: string; tool_call?: { tool: string; input?: Record<string, unknown> } | null; final?: { result: string; confidence?: number } | null }>(text);
    if (!plan) throw new Error("Model returned unparseable output.");
    await ctx.trace("decision", plan.summary ?? "(no summary)");
    if (plan.final) {
      if ((plan.final.confidence ?? 1) < 0.5) {
        const a = await requestApproval({ kind: "ESCALATION", title: `${ctx.agent.name}: low confidence`, objective: String(ctx.input.title ?? "Task"), recommendation: plan.final.result, confidence: plan.final.confidence, requestedBy: ctx.actor.actor, taskId: ctx.taskId, requiredRole: "MANAGER", isDemo: ctx.isDemo });
        throw new ApprovalPendingError(a.id);
      }
      return { result: plan.final.result, confidence: plan.final.confidence ?? null };
    }
    if (!plan.tool_call) return { result: plan.summary ?? "done" };
    const out = await ctx.tool(plan.tool_call.tool, plan.tool_call.input ?? {});
    history.push(`${plan.tool_call.tool} → ${JSON.stringify(out).slice(0, 600)}`);
  }
  throw new Error("Step limit reached without a final answer.");
}

const backoffMs = (n: number) => Math.min(30 * 60_000, 30_000 * 2 ** n);

export async function executeTask(taskId: number): Promise<{ status: string }> {
  const task = await prisma.osTask.findUniqueOrThrow({ where: { id: taskId }, include: { agent: true } });
  if (task.orgId !== ORG_ID) throw new Error("Cross-tenant access denied.");
  const agent = toRecord(task.agent);
  const usage = { cost: 0, inTok: 0, outTok: 0 };
  const started = Date.now();

  // Budget control: pause + alert + require approval to continue (spec §36).
  const spent = await monthlyCost(agent.id);
  if (spent >= agent.budgetLimitUsd) {
    const approval = await requestApproval({
      kind: "OTHER", title: `${agent.name} exceeded its monthly budget`, objective: `Spent $${spent.toFixed(2)} of $${agent.budgetLimitUsd.toFixed(2)}.`,
      recommendation: "Raise the budget by 50% and resume, or keep the agent paused.", requiredRole: "CEO",
      action: { type: "agent.budget_override", agentKey: agent.key }, taskId, requestedBy: "system",
    });
    await prisma.osAgent.update({ where: { id: agent.id }, data: { status: "REQUIRES_APPROVAL" } });
    await prisma.osTask.update({ where: { id: taskId }, data: { status: "WAITING_APPROVAL", approvalRequired: true } });
    await raiseAlert({ severity: "HIGH", category: "Financial Risk", title: `${agent.name} hit its budget`, dedupeKey: `budget:${agent.key}` });
    void approval;
    return { status: "WAITING_APPROVAL" };
  }

  const ctx = buildContext(agent, taskId, (task.input as Record<string, unknown>) ?? {}, task.isDemo, usage);
  await audit({ ...ctx.actor, action: "task.start", resource: "task", resourceId: taskId });

  try {
    const handler = agent.handler ? HANDLERS[agent.handler] : undefined;
    if (agent.handler && !handler) throw new NotConnectedError(`Handler "${agent.handler}" is not implemented.`);
    const run = handler ? handler(ctx) : genericLoop(ctx);
    let timer: ReturnType<typeof setTimeout> | undefined;
    const output = await Promise.race([
      run,
      new Promise<never>((_, rej) => {
        timer = setTimeout(() => rej(new Error(`Timed out after ${agent.maxExecutionSec}s`)), agent.maxExecutionSec * 1000);
      }),
    ]).finally(() => clearTimeout(timer));
    await ctx.trace("result", "Task completed", output);
    await prisma.osTask.update({
      where: { id: taskId },
      data: { status: "COMPLETED", output: output as never, completedAt: new Date(), lockedAt: null, error: null, costUsd: { increment: usage.cost }, inputTokens: { increment: usage.inTok }, outputTokens: { increment: usage.outTok } },
    });
    await audit({ ...ctx.actor, action: "task.complete", resource: "task", resourceId: taskId, output: { ms: Date.now() - started } });
    return { status: "COMPLETED" };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const cost = { costUsd: { increment: usage.cost }, inputTokens: { increment: usage.inTok }, outputTokens: { increment: usage.outTok } };

    if (e instanceof ApprovalPendingError) {
      await prisma.osTask.update({ where: { id: taskId }, data: { status: "WAITING_APPROVAL", approvalRequired: true, lockedAt: null, ...cost } });
      return { status: "WAITING_APPROVAL" };
    }

    await ctx.trace("error", msg);
    const retries = task.retryCount + 1;
    if (!isPermanent(e) && retries <= agent.maxRetries) {
      await prisma.osTask.update({ where: { id: taskId }, data: { status: "QUEUED", retryCount: retries, error: msg, lockedAt: null, runAfter: new Date(Date.now() + backoffMs(retries)), ...cost } });
      await audit({ ...ctx.actor, action: "task.retry", resource: "task", resourceId: taskId, result: "FAILURE", output: { error: msg, retries } });
      return { status: "QUEUED" };
    }

    // Retries exhausted (or permanent failure) → dead-letter + escalate. Never silent.
    await prisma.osTask.update({ where: { id: taskId }, data: { status: "FAILED", deadLetter: true, retryCount: retries, error: msg, completedAt: new Date(), lockedAt: null, ...cost } });
    await audit({ ...ctx.actor, action: "task.fail", resource: "task", resourceId: taskId, result: "FAILURE", output: { error: msg, permanent: isPermanent(e) } });
    await raiseAlert({ severity: isPermanent(e) ? "MEDIUM" : "HIGH", category: "Technical Risk", title: `${agent.name}: "${task.title}" failed`, body: msg, dedupeKey: `task-fail:${taskId}` });
    return { status: "FAILED" };
  }
}

/** Worker entry. Called by the cron route and opportunistically after enqueue; bounded by a wall-clock budget. */
export async function processQueue(opts: { maxTasks?: number; budgetMs?: number } = {}) {
  const deadline = Date.now() + (opts.budgetMs ?? 45_000);
  const recovered = await recoverStaleTasks();
  const results: Array<{ taskId: number; status: string }> = [];
  while (results.length < (opts.maxTasks ?? 20) && Date.now() < deadline) {
    const id = await claimNextTask();
    if (id == null) break;
    results.push({ taskId: id, ...(await executeTask(id)) });
  }
  return { recovered, processed: results };
}

// ── Approval executors ─────────────────────────────────────────────────────────

registerApprovalAction("outreach.send", async (action, { approvalId, decidedBy }) => {
  const { sendOutreach } = await import("./outreach");
  const r = await sendOutreach(Number(action.outreachId), { actor: decidedBy, actorType: "HUMAN" }, approvalId);
  const ok = r.status === "SENT";
  const approval = await prisma.osApproval.findUnique({ where: { id: approvalId }, select: { taskId: true } });
  if (approval?.taskId) {
    await prisma.osTask.update({ where: { id: approval.taskId }, data: ok ? { status: "COMPLETED", completedAt: new Date(), approvedBy: decidedBy, output: { sent: true } } : { status: "FAILED", error: r.reason ?? "send failed", approvedBy: decidedBy, completedAt: new Date() } });
  }
  return { ok, ...r };
});

registerApprovalAction("tool.run", async (action, { approvalId, decidedBy }) => {
  const agent = await prisma.osAgent.findUniqueOrThrow({ where: { key: String(action.agentKey) } });
  const tools = agent.tools as string[];
  if (!tools.includes(String(action.tool))) throw new ToolDeniedError(String(action.tool), agent.key); // grants may have changed since the request
  const def = getTool(String(action.tool));
  if (!def?.run || !def.status().enabled) throw new NotConnectedError(`${action.tool} is not connected.`);
  const out = await def.run(
    { agent: { id: agent.id, key: agent.key, name: agent.name, department: agent.department, autonomy: agent.autonomy, knowledgeSources: agent.knowledgeSources as string[] }, taskId: Number(action.taskId), actor: { actor: decidedBy, actorType: "HUMAN" } },
    (action.input as Record<string, unknown>) ?? {}
  );
  const failure = toolFailure(out);
  if (action.taskId) {
    await prisma.osTask.update({
      where: { id: Number(action.taskId) },
      data: failure
        ? { status: "FAILED", error: failure.message, completedAt: new Date(), approvedBy: decidedBy, output: { approvedToolResult: out } as never }
        : { status: "COMPLETED", completedAt: new Date(), approvedBy: decidedBy, output: { approvedToolResult: out } as never },
    });
  }
  void approvalId;
  return failure ? { ok: false, error: failure.message, output: out } : { ok: true, output: out };
});

registerApprovalAction("agent.budget_override", async (action, { decidedBy }) => {
  const agent = await prisma.osAgent.findUniqueOrThrow({ where: { key: String(action.agentKey) } });
  await prisma.osAgent.update({ where: { id: agent.id }, data: { budgetLimitUsd: agent.budgetLimitUsd * 1.5, status: "ACTIVE" } });
  await prisma.osTask.updateMany({ where: { agentId: agent.id, status: "WAITING_APPROVAL" }, data: { status: "QUEUED", approvedBy: decidedBy } });
  return { ok: true, newBudgetUsd: agent.budgetLimitUsd * 1.5 };
});
