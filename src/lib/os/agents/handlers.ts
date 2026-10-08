import { prisma } from "@/lib/prisma";
import { ORG_ID } from "../constants";
import type { RunContext } from "../runtime";
import { ApprovalPendingError } from "../errors";
import { requestApproval } from "../approvals";
import { computeHealth } from "../health";
import { loadTemplates, recommendEmployees } from "../recommend";
import { raiseAlert } from "../alerts";
import { emit } from "../events";
import { generateBrief, runOperatingLoop } from "../commander";

type Handler = (ctx: RunContext) => Promise<Record<string, unknown>>;

const today = () => new Date().toISOString().slice(0, 10);
const num = (v: unknown) => (typeof v === "number" ? v : Number(v));

// ── Prospecting: discover → create → research → score → recommend ────────────────
const prospecting: Handler = async (ctx) => {
  const discover = ctx.input.discover as { query?: string } | undefined;
  if (discover?.query) {
    const found = (await ctx.tool("places.search", { query: discover.query, limit: 10 })) as { places: Array<{ name?: string; website?: string | null; phone?: string | null; address?: string | null; type?: string | null }> };
    let created = 0;
    for (const p of found.places) {
      if (!p.name) continue;
      const r = await ctx.tool("crm.create_opportunity", { companyName: p.name, website: p.website ?? undefined, contactPhone: p.phone ?? undefined, industry: (ctx.input.industry as string) ?? p.type ?? undefined, source: "discovery", isDemo: ctx.isDemo });
      if (r.created) created++;
      await ctx.tool("tasks.delegate", { agentKey: "prospecting-agent", title: `Research ${p.name}`, input: { opportunityId: r.opportunityId }, idempotencyKey: `research:${r.opportunityId}` });
    }
    return { discovered: found.places.length, newProspects: created };
  }

  let opportunityId = ctx.input.opportunityId ? num(ctx.input.opportunityId) : undefined;
  if (!opportunityId) {
    const c = await ctx.tool("crm.create_opportunity", { ...ctx.input, isDemo: ctx.isDemo });
    opportunityId = num(c.opportunityId);
  }
  const r = await ctx.tool("crm.research_opportunity", { opportunityId });
  await ctx.trace("decision", `Scored ${r.score}/100 (${r.grade}); recommended ${JSON.stringify(r.recommended)}`);
  if (num(r.score) >= 55) {
    await ctx.tool("tasks.delegate", { agentKey: "outreach-agent", title: `Outreach for opportunity ${opportunityId}`, input: { opportunityId }, idempotencyKey: `outreach:${opportunityId}` });
  }
  return { opportunityId, ...r, outreachQueued: num(r.score) >= 55 };
};

// ── Outreach: draft → (approval per autonomy) → send via adapter ─────────────────
const outreach: Handler = async (ctx) => {
  const opportunityId = num(ctx.input.opportunityId);
  const draft = (await ctx.tool("outreach.draft", { opportunityId, channel: ctx.input.channel ?? "EMAIL" })) as { outreachId: number; hasAddress: boolean; generatedBy: string };
  if (!draft.hasAddress) {
    await ctx.tool("crm.log_activity", { opportunityId, type: "NOTE", summary: "Outreach drafted but prospect has no contact address; needs enrichment." });
    return { drafted: true, sent: false, reason: "No contact address on file", outreachId: draft.outreachId };
  }
  const sent = await ctx.tool("outreach.send", { outreachId: draft.outreachId }); // may pause for approval
  return { drafted: true, outreachId: draft.outreachId, generatedBy: draft.generatedBy, ...sent };
};

// ── Sales: qualification with human escalation on low confidence ─────────────────
const salesQualify: Handler = async (ctx) => {
  const opportunityId = num(ctx.input.opportunityId);
  const dims = (ctx.input.signals ?? {}) as Record<string, number>;
  const q = await ctx.tool("crm.qualify", { opportunityId, ...dims });
  if (num(q.confidence) < 0.5) {
    const a = await requestApproval({
      kind: "QUALIFICATION", title: "Unable to determine whether the prospect is qualified",
      objective: `Qualify opportunity #${opportunityId}`, context: `Only ${Math.round(num(q.confidence) * 6)} of 6 qualification dimensions are known.`,
      recommendation: `Provisional rating: ${q.level}. Review the conversation and confirm.`, confidence: num(q.confidence), requiredRole: "MANAGER", requestedBy: ctx.actor.actor, taskId: ctx.taskId, isDemo: ctx.isDemo,
    });
    throw new ApprovalPendingError(a.id);
  }
  if (q.level === "HOT" || q.level === "WARM") await ctx.tool("crm.set_stage", { opportunityId, stage: "QUALIFIED", reason: `qualification ${q.level}` });
  return { ...q };
};

// ── Revenue Director: real daily plan from live data, delegated automatically ────
const revenueDailyPlan: Handler = async (ctx) => {
  const now = new Date();
  const d = today();
  const [unresearched, readyForOutreach, overdue, proposals, redCustomers] = await Promise.all([
    prisma.osOpportunity.findMany({ where: { orgId: ORG_ID, stage: "NEW", score: null }, take: 20, select: { id: true, companyName: true } }),
    prisma.osOpportunity.findMany({ where: { orgId: ORG_ID, stage: "RESEARCHED", score: { gte: 55 }, outreach: { none: {} } }, take: 20, select: { id: true, companyName: true } }),
    prisma.osOpportunity.findMany({ where: { orgId: ORG_ID, stage: { in: ["CONTACTED", "ENGAGED"] }, nextFollowUpAt: { lte: now } }, take: 20, select: { id: true, companyName: true } }),
    prisma.osOpportunity.findMany({ where: { orgId: ORG_ID, stage: { in: ["PROPOSAL", "NEGOTIATION", "VERBAL_COMMITMENT"] } }, select: { id: true, companyName: true, dealValueCents: true } }),
    prisma.osCustomer.count({ where: { orgId: ORG_ID, health: "RED", status: { not: "CHURNED" } } }),
  ]);

  for (const o of unresearched) await ctx.tool("tasks.delegate", { agentKey: "prospecting-agent", title: `Research ${o.companyName}`, input: { opportunityId: o.id }, idempotencyKey: `research:${o.id}` });
  for (const o of readyForOutreach) await ctx.tool("tasks.delegate", { agentKey: "outreach-agent", title: `Outreach: ${o.companyName}`, input: { opportunityId: o.id }, idempotencyKey: `outreach:${o.id}` });
  for (const o of overdue) await ctx.tool("tasks.delegate", { agentKey: "outreach-agent", title: `Follow up: ${o.companyName}`, input: { opportunityId: o.id, followUp: true }, idempotencyKey: `followup:${o.id}:${d}` });
  if (redCustomers) await ctx.tool("tasks.delegate", { agentKey: "churn-prevention-agent", title: `Recovery plans for ${redCustomers} at-risk customer(s)`, input: {}, idempotencyKey: `churn:${d}` });

  const priorities: string[] = [];
  if (overdue.length) priorities.push(`Follow up with ${overdue.length} prospect(s) whose follow-up is due (delegated to Outreach Agent).`);
  if (readyForOutreach.length) priorities.push(`Contact ${readyForOutreach.length} researched prospect(s) scoring 55+ (delegated to Outreach Agent).`);
  if (unresearched.length) priorities.push(`Research ${unresearched.length} new unscored prospect(s) (delegated to Prospecting Agent).`);
  if (proposals.length) priorities.push(`Close ${proposals.length} deal(s) awaiting decision worth $${(proposals.reduce((n, p) => n + p.dealValueCents, 0) / 100).toLocaleString()} — HUMAN action: ${proposals.slice(0, 3).map((p) => p.companyName).join(", ")}.`);
  if (redCustomers) priorities.push(`Recover ${redCustomers} at-risk customer(s) (delegated to Churn Prevention Agent).`);
  if (!priorities.length) priorities.push("No revenue actions pending. The pipeline is empty or fully up to date — add prospects or run discovery.");

  await prisma.osBrief.upsert({ where: { orgId_kind_forDate: { orgId: ORG_ID, kind: "REVENUE_PLAN", forDate: d } }, create: { orgId: ORG_ID, kind: "REVENUE_PLAN", forDate: d, content: { priorities } }, update: { content: { priorities } } });
  return { priorities };
};

// ── Customer health scan + churn recovery ────────────────────────────────────────
const healthScan: Handler = async () => {
  const customers = await prisma.osCustomer.findMany({ where: { orgId: ORG_ID, status: { not: "CHURNED" } } });
  const counts = { GREEN: 0, YELLOW: 0, RED: 0 };
  for (const c of customers) {
    const h = computeHealth({ status: c.status, lastActiveAt: c.lastActiveAt, usage30d: c.usage30d, usagePrev30d: c.usagePrev30d });
    counts[h.health]++;
    if (h.health !== c.health) await prisma.osCustomer.update({ where: { id: c.id }, data: { health: h.health, healthReasons: { reasons: h.reasons, missing: h.missingSignals } as never } });
    if (h.health === "RED" && c.health !== "RED") await emit("customer.at_risk", { id: c.id, customerId: c.id, reasons: h.reasons });
    if (h.health === "RED") await raiseAlert({ severity: "HIGH", category: "Customer Risk", title: `${c.name} is at risk`, body: h.reasons.join("; "), dedupeKey: `at-risk:${c.id}` });
  }
  return { scanned: customers.length, ...counts };
};

const churnRecovery: Handler = async (ctx) => {
  const reds = await prisma.osCustomer.findMany({ where: { orgId: ORG_ID, health: "RED", status: { not: "CHURNED" } } });
  const created: number[] = [];
  for (const c of reds) {
    const reasons = ((c.healthReasons as { reasons?: string[] } | null)?.reasons ?? []).join("; ") || "no specific signal recorded";
    const open = await prisma.osApproval.findFirst({ where: { orgId: ORG_ID, status: "PENDING", title: { contains: `Recovery: ${c.name}` } } });
    if (open) continue;
    const a = await requestApproval({
      kind: "ESCALATION", title: `Recovery: ${c.name}`, objective: `Win back at-risk customer ${c.name} ($${(c.mrrCents / 100).toLocaleString()}/mo).`,
      context: `Diagnosis (from tracked signals): ${reasons}`, recommendation: "Personal check-in call from a human within 48h; offer a free usage review.",
      expectedImpact: `Protects $${((c.mrrCents * 12) / 100).toLocaleString()} ARR`, requiredRole: "MANAGER", requestedBy: ctx.actor.actor, taskId: ctx.taskId, isDemo: c.isDemo,
    });
    created.push(a.id);
  }
  return { atRisk: reds.length, recoveryApprovals: created };
};

// ── Expansion ────────────────────────────────────────────────────────────────────
const expansionScan: Handler = async (ctx) => {
  const templates = await loadTemplates();
  const customers = await prisma.osCustomer.findMany({ where: { orgId: ORG_ID, status: "ACTIVE" }, include: { opportunity: true } });
  let created = 0, skipped = 0;
  for (const c of customers) {
    const industry = c.opportunity?.industry;
    if (!industry) { skipped++; continue; } // INSUFFICIENT DATA: no industry on file
    const rec = recommendEmployees(industry, templates);
    const owned = (c.plan ?? "").toLowerCase();
    const next = rec.employees.find((e) => !owned.includes(e.toLowerCase()) && e !== (c.opportunity?.recommendedEmployees as string[] | null)?.[0]);
    if (!next) continue;
    const r = await ctx.tool("crm.create_opportunity", { companyName: `${c.name} — Expansion: ${next}`, industry, source: "expansion", isDemo: c.isDemo });
    if (r.created) {
      created++;
      await prisma.osOpportunity.update({ where: { id: num(r.opportunityId) }, data: { stage: "QUALIFIED", probability: 0.25, revenueEngine: c.revenueEngine, businessUnit: c.businessUnit, dealValueCents: (rec.suggestedMonthlyPriceUsd ?? 0) * 12 * 100, suggestedOffer: `${next}`, nextAction: "Offer to existing customer", customFields: { expansionOfCustomerId: c.id } as never } });
    }
  }
  return { customersEvaluated: customers.length, expansionOpportunities: created, skippedForMissingIndustry: skipped };
};

// ── Onboarding: checklist reflects real state only ───────────────────────────────
const onboarding: Handler = async (ctx) => {
  const customerId = num(ctx.input.customerId);
  const c = await prisma.osCustomer.findUniqueOrThrow({ where: { id: customerId }, include: { opportunity: true, revenue: true } });
  const prev = ((c.onboarding as { steps?: Array<{ key: string; status: string }> } | null)?.steps ?? []);
  const prevStatus = (k: string) => prev.find((s) => s.key === k)?.status;
  const done = (b: boolean, k: string) => (b ? "DONE" : prevStatus(k) ?? "PENDING");
  const steps = [
    { key: "payment", label: "Payment confirmed", status: done(c.revenue.length > 0, "payment") },
    { key: "customer", label: "Customer created", status: "DONE" },
    { key: "tenant", label: "Tenant created", status: prevStatus("tenant") === "DONE" ? "DONE" : "BLOCKED", note: "Tenant provisioning API (KOVABOT) is not connected — create manually or connect the integration." },
    { key: "employee", label: "AI Employee selected", status: done(!!(c.opportunity?.recommendedEmployees as string[] | null)?.length, "employee") },
    { key: "brain", label: "Business Brain initialised", status: prevStatus("brain") ?? "PENDING", note: "Needs tenant." },
    { key: "knowledge", label: "Knowledge collected", status: prevStatus("knowledge") ?? "PENDING", note: "Awaiting customer documents/FAQs." },
    { key: "integrations", label: "Integrations connected", status: prevStatus("integrations") ?? "PENDING" },
    { key: "configured", label: "Employee configured", status: prevStatus("configured") ?? "PENDING" },
    { key: "testing", label: "Testing", status: prevStatus("testing") ?? "PENDING" },
    { key: "activation", label: "Activation", status: prevStatus("activation") ?? "PENDING" },
  ];
  await prisma.osCustomer.update({ where: { id: customerId }, data: { onboarding: { steps, updatedAt: new Date().toISOString() } as never } });

  const open = steps.filter((s) => s.status !== "DONE");
  const ageDays = (Date.now() - c.createdAt.getTime()) / 86400_000;
  if (open.length) {
    if (ageDays >= 5) await raiseAlert({ severity: "MEDIUM", category: "Customer Risk", title: `Onboarding stalled: ${c.name}`, body: `${open.length} step(s) outstanding: ${open.map((s) => s.label).join(", ")}`, dedupeKey: `onboarding-stalled:${c.id}` });
    const n = Math.floor(ageDays / 2) + 1;
    await ctx.tool("tasks.delegate", { agentKey: "onboarding-agent", title: `Onboarding check-in: ${c.name}`, input: { customerId }, idempotencyKey: `onboard:${customerId}:chase:${n}` });
  }
  return { steps, openSteps: open.length };
};

const dailyBrief: Handler = async () => ({ ...(await generateBrief()) });
const commanderOperate: Handler = async () => ({ ...(await runOperatingLoop()) });

export const HANDLERS: Record<string, Handler> = {
  "prospecting.research": prospecting,
  "outreach.draft_send": outreach,
  "sales.qualify": salesQualify,
  "revenue.daily_plan": revenueDailyPlan,
  "customer.health_scan": healthScan,
  "customer.churn_recovery": churnRecovery,
  "expansion.scan": expansionScan,
  "onboarding.run": onboarding,
  "reporting.daily_brief": dailyBrief,
  "commander.operate": commanderOperate,
};
