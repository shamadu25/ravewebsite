import { prisma } from "@/lib/prisma";
import type { Actor } from "../crm";
import * as crm from "../crm";
import * as outreach from "../outreach";
import { retrieveForAgent, upsertBrainEntry } from "../brain";
import { getGoalState } from "../metrics";
import { analyseWebsite } from "../website";
import { requestApproval } from "../approvals";
import { enqueueTask } from "../queue";
import { channelStatuses } from "../channels";
import { ORG_ID } from "../constants";
import { qualify } from "../scoring";
import { raiseAlert } from "../alerts";
import { ToolBlockedError } from "../errors";

export type RiskLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export interface ToolContext {
  agent: { id: number; key: string; name: string; department: string; autonomy: string; knowledgeSources: string[] };
  taskId: number;
  actor: Actor;
}

export interface ToolDefinition {
  name: string;
  description: string;
  provider: string;
  permissions: string[];
  inputSchema: Record<string, string>;
  riskLevel: RiskLevel;
  /** Hard gate: needs a human even for AUTONOMOUS agents (money, deployments, contracts). */
  alwaysRequiresApproval?: boolean;
  status(): { enabled: boolean; reason?: string };
  run?(ctx: ToolContext, input: Record<string, unknown>): Promise<Record<string, unknown>>;
}

export class NotConnectedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NotConnectedError";
  }
}

const always = () => ({ enabled: true });
const needsEnv = (...vars: string[]) => () => {
  const missing = vars.filter((v) => !process.env[v]);
  return missing.length ? { enabled: false, reason: `Missing ${missing.join(", ")}` } : { enabled: true };
};
const num = (v: unknown): number => {
  const n = Number(v);
  if (!Number.isFinite(n)) throw new Error("Expected a number.");
  return n;
};
const str = (v: unknown, field: string): string => {
  if (typeof v !== "string" || !v.trim()) throw new Error(`"${field}" is required.`);
  return v.trim();
};

const TOOLS: ToolDefinition[] = [
  {
    name: "brain.search", description: "Search the Company Brain (scoped to the agent's knowledge sources).", provider: "internal", permissions: ["brain.read"],
    inputSchema: { query: "string" }, riskLevel: "LOW", status: always,
    async run(ctx, input) {
      const hits = await retrieveForAgent({ department: ctx.agent.department, sections: ctx.agent.knowledgeSources, query: str(input.query, "query") });
      return { results: hits };
    },
  },
  {
    name: "brain.write", description: "Add a note to the Company Brain.", provider: "internal", permissions: ["brain.write"],
    inputSchema: { section: "string", title: "string", content: "string" }, riskLevel: "MEDIUM", status: always,
    async run(ctx, input) {
      const row = await upsertBrainEntry({ section: str(input.section, "section"), title: str(input.title, "title"), content: str(input.content, "content"), actor: `agent:${ctx.agent.key}`, actorType: "AI_AGENT", allowedDepartments: [ctx.agent.department] });
      return { id: row.id };
    },
  },
  {
    name: "metrics.revenue", description: "Read goal progress, MRR/ARR and pipeline totals from the revenue ledger.", provider: "internal", permissions: ["finance.read"],
    inputSchema: {}, riskLevel: "LOW", status: always,
    async run() {
      const { state, revenue, pipeline } = await getGoalState();
      return { state, revenue, pipeline };
    },
  },
  {
    name: "crm.create_opportunity", description: "Create a CRM opportunity (idempotent per company+website).", provider: "internal", permissions: ["opportunity.write"],
    inputSchema: { companyName: "string", industry: "string?", website: "string?", contactEmail: "string?", contactPhone: "string?" }, riskLevel: "LOW", status: always,
    async run(ctx, input) {
      const r = await crm.createOpportunity(
        { companyName: str(input.companyName, "companyName"), industry: (input.industry as string) ?? null, website: (input.website as string) ?? null, contactEmail: (input.contactEmail as string) ?? null, contactPhone: (input.contactPhone as string) ?? null, country: (input.country as string) ?? null, source: (input.source as string) ?? `agent:${ctx.agent.key}`, isDemo: input.isDemo === true },
        ctx.actor
      );
      return { opportunityId: r.opportunity.id, created: r.created };
    },
  },
  {
    name: "crm.research_opportunity", description: "Analyse the prospect's website, score it and recommend an AI employee.", provider: "internal", permissions: ["opportunity.write"],
    inputSchema: { opportunityId: "number" }, riskLevel: "LOW", status: always,
    async run(ctx, input) {
      const r = await crm.researchOpportunity(num(input.opportunityId), ctx.actor);
      return { score: r.score.score, grade: r.score.grade, confidence: r.score.confidence, recommended: r.recommendation.employees, websiteReachable: r.site?.reachable ?? null, websiteError: r.site?.error ?? null };
    },
  },
  {
    name: "crm.set_stage", description: "Move an opportunity to a pipeline stage.", provider: "internal", permissions: ["opportunity.write"],
    inputSchema: { opportunityId: "number", stage: "string" }, riskLevel: "LOW", status: always,
    async run(ctx, input) {
      await crm.setStage(num(input.opportunityId), str(input.stage, "stage") as never, ctx.actor, input.reason as string | undefined);
      return { ok: true };
    },
  },
  {
    name: "crm.qualify", description: "Score need/budget/authority/urgency/fit/intent (0-5 each) and store the HOT/WARM/COLD/UNQUALIFIED result.", provider: "internal", permissions: ["opportunity.write"],
    inputSchema: { opportunityId: "number", need: "0-5?", budget: "0-5?", authority: "0-5?", urgency: "0-5?", fit: "0-5?", intent: "0-5?" }, riskLevel: "LOW", status: always,
    async run(ctx, input) {
      const q = qualify({ need: input.need as number, budget: input.budget as number, authority: input.authority as number, urgency: input.urgency as number, fit: input.fit as number, intent: input.intent as number });
      const id = num(input.opportunityId);
      await prisma.osOpportunity.update({ where: { id }, data: { qualification: { ...q, input } as never } });
      await crm.logActivity(id, ctx.actor, "QUALIFIED", `${q.level} (${q.total}/100, confidence ${Math.round(q.confidence * 100)}%)`);
      return { ...q };
    },
  },
  {
    name: "crm.log_activity", description: "Record an activity on an opportunity.", provider: "internal", permissions: ["opportunity.write"],
    inputSchema: { opportunityId: "number", type: "string", summary: "string" }, riskLevel: "LOW", status: always,
    async run(ctx, input) {
      await crm.logActivity(num(input.opportunityId), ctx.actor, str(input.type, "type"), str(input.summary, "summary"));
      return { ok: true };
    },
  },
  {
    name: "web.read_website", description: "Fetch and analyse a public website (SSRF-guarded).", provider: "internal", permissions: ["web.read"],
    inputSchema: { url: "string" }, riskLevel: "LOW", status: always,
    async run(_c, input) {
      const a = await analyseWebsite(str(input.url, "url"));
      return { reachable: a.reachable, title: a.title, description: a.description, signals: a.signals, emails: a.emails, phones: a.phones, error: a.error ?? null };
    },
  },
  {
    name: "places.search", description: "Discover local businesses (Google Places).", provider: "google-places", permissions: ["web.read"],
    inputSchema: { query: "string", limit: "number?" }, riskLevel: "LOW", status: needsEnv("GOOGLE_PLACES_API_KEY"),
    async run(_c, input) {
      const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Goog-Api-Key": process.env.GOOGLE_PLACES_API_KEY ?? "", "X-Goog-FieldMask": "places.displayName,places.websiteUri,places.nationalPhoneNumber,places.formattedAddress,places.userRatingCount,places.primaryTypeDisplayName" },
        body: JSON.stringify({ textQuery: str(input.query, "query"), pageSize: Math.min(20, Number(input.limit ?? 10)) }),
        signal: AbortSignal.timeout(15_000),
      });
      if (!res.ok) throw new Error(`Places API ${res.status}`);
      type Place = { displayName?: { text?: string }; websiteUri?: string; nationalPhoneNumber?: string; formattedAddress?: string; userRatingCount?: number; primaryTypeDisplayName?: { text?: string } };
      const d = (await res.json()) as { places?: Place[] };
      return {
        places: (d.places ?? []).map((p) => ({ name: p.displayName?.text, website: p.websiteUri ?? null, phone: p.nationalPhoneNumber ?? null, address: p.formattedAddress ?? null, reviews: p.userRatingCount ?? null, type: p.primaryTypeDisplayName?.text ?? null })),
      };
    },
  },
  {
    name: "outreach.draft", description: "Draft a personalised outreach message for a prospect (does not send).", provider: "internal", permissions: ["outreach.draft"],
    inputSchema: { opportunityId: "number", channel: "string?", touch: "number?" }, riskLevel: "LOW", status: always,
    async run(ctx, input) {
      const row = await outreach.draftOutreach(num(input.opportunityId), ctx.actor, (input.channel as never) ?? "EMAIL", { touch: input.touch ? num(input.touch) : undefined });
      return { outreachId: row.id, generatedBy: row.generatedBy, hasAddress: !!row.toAddress };
    },
  },
  {
    name: "outreach.send", description: "Send a drafted outreach message through its channel adapter.", provider: "channel-adapters", permissions: ["outreach.send"],
    inputSchema: { outreachId: "number" }, riskLevel: "HIGH", status: () => ({ enabled: channelStatuses().some((c) => c.connected), reason: "No outbound channel is connected." }),
    async run(ctx, input) {
      const r = await outreach.sendOutreach(num(input.outreachId), ctx.actor);
      return { ...r };
    },
  },
  {
    name: "approvals.request", description: "Ask a human to decide something.", provider: "internal", permissions: ["approval.request"],
    inputSchema: { title: "string", objective: "string", recommendation: "string" }, riskLevel: "LOW", status: always,
    async run(ctx, input) {
      const a = await requestApproval({ kind: "ESCALATION", title: str(input.title, "title"), objective: str(input.objective, "objective"), recommendation: str(input.recommendation, "recommendation"), context: input.context as string | undefined, confidence: input.confidence as number | undefined, requestedBy: `agent:${ctx.agent.key}`, taskId: ctx.taskId });
      return { approvalId: a.id };
    },
  },
  {
    name: "proposal.draft", description: "Draft a proposal email for a qualified prospect (does not send).", provider: "internal", permissions: ["outreach.draft"],
    inputSchema: { opportunityId: "number" }, riskLevel: "MEDIUM", status: always,
    async run(ctx, input) {
      const row = await outreach.draftOutreach(num(input.opportunityId), ctx.actor, "EMAIL", { purpose: "PROPOSAL" });
      return { outreachId: row.id, generatedBy: row.generatedBy, hasAddress: !!row.toAddress };
    },
  },
  {
    name: "content.create", description: "Save a marketing content draft (always DRAFT; a human approves publishing).", provider: "internal", permissions: ["campaign.create"],
    inputSchema: { type: "string", title: "string", body: "string" }, riskLevel: "LOW", status: always,
    async run(ctx, input) {
      const row = await prisma.osContent.create({ data: { orgId: ORG_ID, type: str(input.type, "type").toUpperCase(), title: str(input.title, "title").slice(0, 200), body: str(input.body, "body").slice(0, 20000), generatedBy: `agent:${ctx.agent.key}` } });
      return { contentId: row.id };
    },
  },
  {
    name: "campaign.plan", description: "Propose a campaign (status PLANNED, zero spend; a human activates it).", provider: "internal", permissions: ["campaign.create"],
    inputSchema: { name: "string", channel: "string", goal: "string", audience: "string", offer: "string", businessUnit: "string?" }, riskLevel: "LOW", status: always,
    async run(ctx, input) {
      const channel = str(input.channel, "channel").toUpperCase();
      const row = await prisma.osCampaign.create({ data: { orgId: ORG_ID, name: str(input.name, "name").slice(0, 160), channel: ["EMAIL", "WHATSAPP", "SMS", "LINKEDIN", "WEB_CHAT", "VOICE"].includes(channel) ? channel : "EMAIL", goal: str(input.goal, "goal").slice(0, 300), audience: str(input.audience, "audience").slice(0, 300), offer: str(input.offer, "offer").slice(0, 300), businessUnit: ["RAVESOFT", "CLIQPOS", "KOVABOT", "HMS", "RESTOVAX"].includes(String(input.businessUnit)) ? String(input.businessUnit) : "KOVABOT" } });
      void ctx;
      return { campaignId: row.id };
    },
  },
  {
    name: "brief.write", description: "Store a generated report/brief for the CEO.", provider: "internal", permissions: ["report.write"],
    inputSchema: { kind: "string", content: "object" }, riskLevel: "LOW", status: always,
    async run(_c, input) {
      const forDate = typeof input.forDate === "string" ? input.forDate : new Date().toISOString().slice(0, 10);
      const kind = str(input.kind, "kind").toUpperCase().slice(0, 30);
      await prisma.osBrief.upsert({ where: { orgId_kind_forDate: { orgId: ORG_ID, kind, forDate } }, create: { orgId: ORG_ID, kind, forDate, content: input.content as never }, update: { content: input.content as never } });
      return { kind, forDate };
    },
  },
  {
    name: "tasks.delegate", description: "Create a task for another agent.", provider: "internal", permissions: ["task.create"],
    inputSchema: { agentKey: "string", title: "string", input: "object?" }, riskLevel: "MEDIUM", status: always,
    async run(ctx, input) {
      const r = await enqueueTask({ agentKey: str(input.agentKey, "agentKey"), title: str(input.title, "title"), input: (input.input as Record<string, unknown>) ?? {}, createdBy: `agent:${ctx.agent.key}`, parentTaskId: ctx.taskId, idempotencyKey: input.idempotencyKey as string | undefined });
      return { taskId: r.task.id, created: r.created };
    },
  },
  {
    name: "alerts.raise", description: "Raise an operational alert for humans.", provider: "internal", permissions: ["alert.create"],
    inputSchema: { severity: "string", category: "string", title: "string" }, riskLevel: "LOW", status: always,
    async run(ctx, input) {
      const a = await raiseAlert({ severity: str(input.severity, "severity"), category: str(input.category, "category"), title: str(input.title, "title"), body: input.body as string | undefined, dedupeKey: input.dedupeKey as string | undefined });
      void ctx;
      return { alertId: a?.id ?? null };
    },
  },
  {
    name: "slack.notify", description: "Post a message to the team Slack channel.", provider: "slack", permissions: ["slack.notify"],
    inputSchema: { text: "string" }, riskLevel: "LOW", status: needsEnv("SLACK_WEBHOOK_URL"),
    async run(_c, input) {
      const res = await fetch(process.env.SLACK_WEBHOOK_URL as string, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: str(input.text, "text").slice(0, 3000) }), signal: AbortSignal.timeout(10_000) });
      if (!res.ok) throw new Error(`Slack ${res.status}`);
      return { posted: true };
    },
  },
  {
    name: "github.read", description: "List open issues and pull requests for the configured repo.", provider: "github", permissions: ["github.read"],
    inputSchema: {}, riskLevel: "LOW", status: needsEnv("GITHUB_TOKEN", "GITHUB_REPO"),
    async run() {
      const res = await fetch(`https://api.github.com/repos/${process.env.GITHUB_REPO}/issues?state=open&per_page=30`, { headers: { Authorization: `Bearer ${process.env.GITHUB_TOKEN}`, Accept: "application/vnd.github+json" }, signal: AbortSignal.timeout(15_000) });
      if (!res.ok) throw new Error(`GitHub ${res.status}`);
      const items = (await res.json()) as Array<{ number: number; title: string; pull_request?: unknown; html_url: string }>;
      return { open: items.map((i) => ({ number: i.number, title: i.title, isPullRequest: !!i.pull_request, url: i.html_url })) };
    },
  },
  // ── Registered but not implemented: visible in the Integration Center as NOT CONNECTED, never faked. ──
  ...(
    [
      ["calendar.schedule", "Calendar", "GOOGLE_CALENDAR_CREDENTIALS", "MEDIUM"],
      ["ads.manage", "Ads", "META_ADS_ACCESS_TOKEN", "CRITICAL"],
      ["analytics.read", "Google Analytics", "GA_PROPERTY_ID", "LOW"],
      ["search_console.read", "Search Console", "GSC_CREDENTIALS", "LOW"],
      ["payments.read", "Payments provider", "PAYMENTS_WEBHOOK_SECRET", "MEDIUM"],
    ] as const
  ).map(
    ([name, provider, env, risk]): ToolDefinition => ({
      name, description: `${provider} integration.`, provider, permissions: [name], inputSchema: {}, riskLevel: risk, alwaysRequiresApproval: risk === "CRITICAL",
      status: () => ({ enabled: false, reason: `${provider} adapter is not implemented yet (needs ${env}).` }),
    })
  ),
];

/** Tools report policy/delivery failures as data ({status:"BLOCKED"|"FAILED"}); callers must never treat those as success. */
export function toolFailure(out: Record<string, unknown>): Error | null {
  const reason = typeof out.reason === "string" ? out.reason : "The action did not complete.";
  if (out.status === "BLOCKED") return new ToolBlockedError(reason);
  if (out.status === "FAILED") return out.notConnected === true ? new NotConnectedError(reason) : new Error(reason);
  return null;
}

const BY_NAME = new Map(TOOLS.map((t) => [t.name, t]));
export const getTool = (name: string) => BY_NAME.get(name);
export const listTools = () => TOOLS.map((t) => ({ name: t.name, description: t.description, provider: t.provider, riskLevel: t.riskLevel, permissions: t.permissions, alwaysRequiresApproval: !!t.alwaysRequiresApproval, implemented: !!t.run, ...t.status() }));

/** Whether a tool call must pause for human approval for this agent's autonomy level. */
export function needsApproval(tool: ToolDefinition, autonomy: string, agentApprovalRules: { alwaysFor?: string[] } | null): boolean {
  if (tool.alwaysRequiresApproval) return true;
  if (agentApprovalRules?.alwaysFor?.includes(tool.name)) return true;
  if (autonomy === "ASSISTED") return tool.riskLevel !== "LOW";
  if (autonomy === "SEMI_AUTONOMOUS") return tool.riskLevel === "HIGH" || tool.riskLevel === "CRITICAL";
  return false;
}

export { raiseAlert };
