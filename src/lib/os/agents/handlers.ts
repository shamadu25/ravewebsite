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
import { MAX_TOUCHES, emailDailyCap, emailsSentToday } from "../outreach";
import { getFunnels } from "../products";
import { getGoalState } from "../metrics";
import { forecast } from "../forecast";
import { monthlyCents } from "../mrr";
import { getTool } from "../tools/registry";
import { parseJsonLoose } from "../llm";
import { isoWeek } from "../week";

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

// ── Outreach: draft → (approval per autonomy) → send via adapter; 4-touch follow-up cadence ───
const outreach: Handler = async (ctx) => {
  const opportunityId = num(ctx.input.opportunityId);
  const opp = await prisma.osOpportunity.findUniqueOrThrow({ where: { id: opportunityId } });
  const msgs = await prisma.osOutreach.findMany({ where: { opportunityId, purpose: "OUTREACH" } });
  const sent = msgs.filter((m) => m.status === "SENT").length;

  if (msgs.some((m) => ["DRAFT", "PENDING_APPROVAL"].includes(m.status))) return { skipped: true, reason: "A message is already waiting for approval or sending." };
  if (msgs.some((m) => m.respondedAt)) return { skipped: true, reason: "The prospect has replied — hand over to the Sales Agent." };
  if (ctx.input.followUp) {
    if (!["CONTACTED", "ENGAGED"].includes(opp.stage)) return { skipped: true, reason: `Stage is ${opp.stage}; no follow-up needed.` };
    if (sent >= MAX_TOUCHES) {
      await ctx.tool("crm.set_stage", { opportunityId, stage: "NURTURE", reason: `no reply after ${MAX_TOUCHES} touches` });
      return { sequenceComplete: true, touches: sent };
    }
  } else if (sent > 0) return { skipped: true, reason: "Already contacted; follow-ups are handled by the cadence." };

  // Warm-up guard: stop before drafting once today's cap is reached; tomorrow's plan picks the prospect up again.
  if ((ctx.input.channel ?? "EMAIL") === "EMAIL" && (await emailsSentToday()) >= emailDailyCap()) return { skipped: true, reason: `Daily email cap (${emailDailyCap()}) reached; will continue tomorrow.` };
  const draft = (await ctx.tool("outreach.draft", { opportunityId, channel: ctx.input.channel ?? "EMAIL" })) as { outreachId: number; hasAddress: boolean; generatedBy: string };
  if (!draft.hasAddress) {
    await ctx.tool("crm.log_activity", { opportunityId, type: "NOTE", summary: "Outreach drafted but prospect has no contact address; needs enrichment." });
    return { drafted: true, sent: false, reason: "No contact address on file", outreachId: draft.outreachId };
  }
  const result = await ctx.tool("outreach.send", { outreachId: draft.outreachId }); // may pause for approval
  return { drafted: true, outreachId: draft.outreachId, generatedBy: draft.generatedBy, touch: sent + 1, ...result };
};

// ── Closing: proposal for qualified prospects ───────────────────────────────────────────────
const closingProposal: Handler = async (ctx) => {
  const opportunityId = num(ctx.input.opportunityId);
  const existing = await prisma.osOutreach.count({ where: { opportunityId, purpose: "PROPOSAL", status: { in: ["DRAFT", "PENDING_APPROVAL", "SENT"] } } });
  if (existing) return { skipped: true, reason: "A proposal already exists for this deal." };
  // If Paystack is connected and a plan matches, put a secure pay-now link in the proposal; otherwise the proposal asks for a reply.
  let payLink: string | undefined;
  if (getTool("payment.link")?.status().enabled && ctx.agent.tools.includes("payment.link")) {
    try { payLink = (await ctx.tool("payment.link", { opportunityId })).url as string; } catch (e) { await ctx.trace("note", `No pay link: ${e instanceof Error ? e.message : "unavailable"}`); }
  }
  const draft = (await ctx.tool("proposal.draft", { opportunityId, payLink })) as { outreachId: number; hasAddress: boolean; generatedBy: string };
  if (!draft.hasAddress) {
    await ctx.tool("crm.log_activity", { opportunityId, type: "NOTE", summary: "Proposal drafted but the prospect has no email address on file." });
    return { drafted: true, sent: false, reason: "No contact address on file", outreachId: draft.outreachId };
  }
  const result = await ctx.tool("outreach.send", { outreachId: draft.outreachId });
  return { drafted: true, outreachId: draft.outreachId, generatedBy: draft.generatedBy, ...result };
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
  const [unresearched, readyForOutreach, overdue, proposals, redCustomers, needProposal, openCount] = await Promise.all([
    prisma.osOpportunity.findMany({ where: { orgId: ORG_ID, stage: "NEW", score: null }, take: 20, select: { id: true, companyName: true } }),
    prisma.osOpportunity.findMany({ where: { orgId: ORG_ID, stage: "RESEARCHED", score: { gte: 55 }, outreach: { none: {} } }, take: 20, select: { id: true, companyName: true } }),
    prisma.osOpportunity.findMany({ where: { orgId: ORG_ID, stage: { in: ["CONTACTED", "ENGAGED"] }, nextFollowUpAt: { lte: now } }, take: 20, select: { id: true, companyName: true } }),
    prisma.osOpportunity.findMany({ where: { orgId: ORG_ID, stage: { in: ["PROPOSAL", "NEGOTIATION", "VERBAL_COMMITMENT"] } }, select: { id: true, companyName: true, dealValueCents: true } }),
    prisma.osCustomer.count({ where: { orgId: ORG_ID, health: "RED", status: { not: "CHURNED" } } }),
    prisma.osOpportunity.findMany({ where: { orgId: ORG_ID, stage: { in: ["QUALIFIED", "DEMO"] }, outreach: { none: { purpose: "PROPOSAL" } } }, take: 20, select: { id: true, companyName: true } }),
    prisma.osOpportunity.count({ where: { orgId: ORG_ID, stage: { notIn: ["WON", "LOST", "NURTURE"] } } }),
  ]);

  for (const o of unresearched) await ctx.tool("tasks.delegate", { agentKey: "prospecting-agent", title: `Research ${o.companyName}`, input: { opportunityId: o.id }, idempotencyKey: `research:${o.id}` });
  for (const o of readyForOutreach) await ctx.tool("tasks.delegate", { agentKey: "outreach-agent", title: `Outreach: ${o.companyName}`, input: { opportunityId: o.id }, idempotencyKey: `outreach:${o.id}` });
  for (const o of overdue) await ctx.tool("tasks.delegate", { agentKey: "outreach-agent", title: `Follow up: ${o.companyName}`, input: { opportunityId: o.id, followUp: true }, idempotencyKey: `followup:${o.id}:${d}` });
  for (const o of needProposal) await ctx.tool("tasks.delegate", { agentKey: "closing-agent", title: `Proposal: ${o.companyName}`, input: { opportunityId: o.id }, idempotencyKey: `proposal:${o.id}` });

  // Automatic discovery keeps the top of the funnel full. Needs Google Places; otherwise say so plainly.
  let discoveryNote: string | null = null;
  if (openCount < 150) {
    if (getTool("places.search")?.status().enabled) {
      const queries = await discoveryQueries();
      const day = Math.floor(Date.now() / 86400_000);
      for (let k = 0; k < 2 && queries.length; k++) {
        const q = queries[(day * 2 + k) % queries.length];
        await ctx.tool("tasks.delegate", { agentKey: "prospecting-agent", title: `Discover: ${q}`, input: { discover: { query: q } }, idempotencyKey: `discover:${d}:${q}` });
      }
      discoveryNote = "Prospect discovery queued (2 searches today).";
    } else discoveryNote = "Pipeline is thin and automatic discovery is OFF — connect Google Places (GOOGLE_PLACES_API_KEY) or import a prospect list.";
  }
  if (redCustomers) await ctx.tool("tasks.delegate", { agentKey: "churn-prevention-agent", title: `Recovery plans for ${redCustomers} at-risk customer(s)`, input: {}, idempotencyKey: `churn:${d}` });

  const priorities: string[] = [];
  if (overdue.length) priorities.push(`Follow up with ${overdue.length} prospect(s) whose follow-up is due (delegated to Outreach Agent).`);
  if (readyForOutreach.length) priorities.push(`Contact ${readyForOutreach.length} researched prospect(s) scoring 55+ (delegated to Outreach Agent).`);
  if (unresearched.length) priorities.push(`Research ${unresearched.length} new unscored prospect(s) (delegated to Prospecting Agent).`);
  if (needProposal.length) priorities.push(`Send proposals to ${needProposal.length} qualified prospect(s) (delegated to Closing Agent; each needs your approval).`);
  if (discoveryNote) priorities.push(discoveryNote);
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

// ── Marketing / content / product / finance (weekly + daily cadences) ────────────────────────


const CITIES = ["Accra", "Kumasi", "Lagos", "Abuja", "Nairobi"];
/** Search phrases for automatic discovery. Override with the SystemSetting `os:ravesoft:discovery_queries` (string array). */
async function discoveryQueries(): Promise<string[]> {
  const row = await prisma.systemSetting.findUnique({ where: { key: `os:${ORG_ID}:discovery_queries` } });
  if (Array.isArray(row?.value) && row.value.length) return row.value as string[];
  const kinds = ["dental clinic", "hotel", "real estate agency", "restaurant", "pharmacy", "beauty salon", "supermarket", "private school", "law firm", "car dealership"];
  return CITIES.flatMap((c) => kinds.map((k) => `${k} in ${c}`));
}

async function brainContext(ctx: RunContext, queries: string[]) {
  const seen = new Map<string, { section: string; title: string; content: string }>();
  for (const q of queries) for (const e of await ctx.brain(q)) seen.set(e.title, e);
  return [...seen.values()].slice(0, 14);
}

const contentWeekly: Handler = async (ctx) => {
  const week = isoWeek();
  const already = await prisma.osContent.count({ where: { orgId: ORG_ID, generatedBy: `agent:${ctx.agent.key}`, title: { startsWith: `[${week}]` } } });
  if (already) return { skipped: true, reason: `Content for ${week} already drafted.` };
  const knowledge = await brainContext(ctx, ["brand voice tone", "products features CliqPOS", "case study proof result", "customers industries", "claims policy"]);
  if (!knowledge.length) throw new Error("INSUFFICIENT DATA: the Company Brain is empty. Run 'Set up AI Employees' to load it.");
  const text = await ctx.llm({ json: true, tier: "standard", system: `${ctx.agent.systemPrompt}\nWrite ONLY from the KNOWLEDGE provided. Never invent statistics, customers, quotes or prices. Return JSON {"posts":[{"title":string,"body":string}] (exactly 3 LinkedIn posts, each under 180 words, each ending with a clear call to action), "article":{"title":string,"excerpt":string (max 160 chars),"metaDescription":string (max 160 chars, includes the main keyword),"body":string}}. The article body is Markdown, 600-900 words, with an introduction, 3-5 "## " sections, practical advice for business owners in Ghana/Nigeria/Africa, one natural mention of the relevant RaveSoft product from the knowledge, and a closing call to action to book a consultation. Choose a topic a business owner would actually search for (e.g. choosing a POS, stock control, automating customer enquiries) and use only facts in the knowledge.`, user: `KNOWLEDGE:\n${JSON.stringify(knowledge)}\n\nWeek: ${week}. Audience: owners and managers of businesses in Ghana, Nigeria and across Africa. Focus on the products and proof above.` });
  const out = parseJsonLoose<{ posts?: Array<{ title: string; body: string }>; article?: { title: string; excerpt?: string; metaDescription?: string; body: string } }>(text);
  if (!out?.posts?.length) throw new Error("The model returned no usable posts.");
  let saved = 0;
  for (const p of out.posts.slice(0, 3)) { if (p.title && p.body) { await ctx.tool("content.create", { type: "LINKEDIN_POST", title: `[${week}] ${p.title}`, body: p.body }); saved++; } }
  if (out.article?.title && out.article.body && out.article.body.length > 400) { await ctx.tool("content.create", { type: "ARTICLE", title: `[${week}] ${out.article.title}`, body: out.article.body, excerpt: out.article.excerpt, metaDescription: out.article.metaDescription }); saved++; }
  return { week, drafted: saved, note: "Drafts are in Marketing → Content awaiting your review." };
};

const marketingWeekly: Handler = async (ctx) => {
  const week = isoWeek();
  const [funnels, opps, gs] = await Promise.all([
    getFunnels(),
    prisma.osOpportunity.groupBy({ by: ["industry", "stage"], where: { orgId: ORG_ID }, _count: true }),
    getGoalState(),
  ]);
  const knowledge = await brainContext(ctx, ["products", "target segment ICP", "revenue engines goal", "claims policy"]);
  const snapshot = { goal: { targetArrUsd: gs.state.targetArrUsd, currentArrUsd: gs.state.currentArrUsd, gapUsd: gs.state.remainingArrUsd }, pipelineByIndustryAndStage: opps, productFunnels: funnels, knowledge };
  const text = await ctx.llm({ json: true, tier: "standard", system: `${ctx.agent.systemPrompt}\nPropose at most 3 campaigns for the coming week that are most likely to produce PAYING customers toward the ARR goal. Use ONLY the data given; if the data is thin, say so in "summary" and propose campaigns that generate data (e.g. outreach to the segments in the knowledge). Do not invent numbers. Return JSON {"summary":string,"campaigns":[{"name":string,"channel":"EMAIL"|"WHATSAPP"|"LINKEDIN"|"SMS","businessUnit":"CLIQPOS"|"KOVABOT"|"HMS"|"RESTOVAX","goal":string,"audience":string,"offer":string,"why":string}]}.`, user: JSON.stringify(snapshot) });
  const plan = parseJsonLoose<{ summary?: string; campaigns?: Array<Record<string, string>> }>(text);
  if (!plan?.campaigns) throw new Error("The model returned no usable plan.");
  const ids: unknown[] = [];
  for (const c of plan.campaigns.slice(0, 3)) {
    const r = await ctx.tool("campaign.plan", { name: `[${week}] ${c.name}`, channel: c.channel, goal: c.goal, audience: c.audience, offer: c.offer, businessUnit: c.businessUnit });
    ids.push(r.campaignId);
  }
  await ctx.tool("brief.write", { kind: "MARKETING_PLAN", forDate: new Date().toISOString().slice(0, 10), content: { week, summary: plan.summary ?? "", campaigns: plan.campaigns } });
  return { week, campaignsPlanned: ids.length, campaignIds: ids, summary: plan.summary ?? null };
};

const productFunnelReview: Handler = async (ctx) => {
  const funnels = await getFunnels();
  if (!funnels.length) return { skipped: true, reason: "INSUFFICIENT DATA — no product events received yet (connect the product feed)." };
  const findings: string[] = [];
  for (const f of funnels) {
    findings.push(`${f.businessUnit}: ${f.registered} registered → ${f.activated} activated (${f.regToActPct ?? "n/a"}%) → ${f.paid} paid (${f.actToPaidPct ?? "n/a"}% of activated). Biggest drop: ${f.biggestDrop}.`);
    if (f.registered >= 20 && f.regToActPct != null && f.regToActPct < 30) await ctx.tool("alerts.raise", { severity: "MEDIUM", category: "Revenue Risk", title: `${f.businessUnit}: only ${f.regToActPct}% of registrations activate`, body: "Most sign-ups never reach their first sale. Improve onboarding and follow up inactive accounts.", dedupeKey: `funnel:${f.businessUnit}:${new Date().toISOString().slice(0, 10)}` });
    if (f.activated >= 20 && f.actToPaidPct != null && f.actToPaidPct < 15) await ctx.tool("alerts.raise", { severity: "MEDIUM", category: "Revenue Risk", title: `${f.businessUnit}: only ${f.actToPaidPct}% of activated accounts pay`, body: "Activated users are not converting. Review pricing, trial length and upgrade prompts.", dedupeKey: `funnelpay:${f.businessUnit}:${new Date().toISOString().slice(0, 10)}` });
  }
  await ctx.tool("brief.write", { kind: "FUNNEL_REVIEW", content: { findings, funnels } });
  return { findings };
};

const financeWeekly: Handler = async (ctx) => {
  const now = new Date(), w1 = new Date(now.getTime() - 7 * 86400_000), w2 = new Date(now.getTime() - 14 * 86400_000);
  const [{ goal, state, revenue }, entries, opps, aiCost, newCust, churned] = await Promise.all([
    getGoalState(),
    prisma.osRevenueEntry.findMany({ where: { orgId: ORG_ID, occurredAt: { gte: w2 } }, select: { kind: true, amountCents: true, periodMonths: true, occurredAt: true } }),
    prisma.osOpportunity.findMany({ where: { orgId: ORG_ID }, select: { dealValueCents: true, probability: true, stage: true } }),
    prisma.osTask.aggregate({ where: { orgId: ORG_ID, createdAt: { gte: w1 } }, _sum: { costUsd: true } }),
    prisma.osCustomer.count({ where: { orgId: ORG_ID, createdAt: { gte: w1 } } }),
    prisma.osCustomer.count({ where: { orgId: ORG_ID, status: "CHURNED", updatedAt: { gte: w1 } } }),
  ]);
  const add = (from: Date, to: Date) => entries.filter((e) => e.kind === "RECURRING" && e.occurredAt >= from && e.occurredAt < to).reduce((n, e) => n + monthlyCents(e), 0) / 100;
  const f = forecast({ currentMrrUsd: state.currentMrrUsd, opps, monthsRemaining: state.monthsRemaining, targetArrUsd: goal.annualRevenueTargetUsd, monthlyChurn: null });
  const content = {
    week: isoWeek(),
    newMrrThisWeekUsd: add(w1, now), newMrrLastWeekUsd: add(w2, w1), newCustomers: newCust, churnedCustomers: churned,
    mrrUsd: state.currentMrrUsd, arrUsd: state.currentArrUsd, targetArrUsd: state.targetArrUsd, gapUsd: state.remainingArrUsd,
    requiredNewMrrPerMonthUsd: state.requiredMonthlyNewMrrUsd, revenueThisMonthUsd: revenue.revenueThisMonthUsd,
    forecast: { conservativeArrUsd: f.conservativeArrUsd, baseArrUsd: f.baseArrUsd, aggressiveArrUsd: f.aggressiveArrUsd, probabilityOfTarget: f.probabilityOfTarget, note: f.assumptions[0] },
    aiSpendThisWeekUsd: aiCost._sum.costUsd ?? 0,
    cash: "INSUFFICIENT DATA (no finance integration)",
  };
  await ctx.tool("brief.write", { kind: "WEEKLY", content });
  if (state.requiredMonthlyNewMrrUsd && content.newMrrThisWeekUsd * 4.3 < state.requiredMonthlyNewMrrUsd) {
    await ctx.tool("alerts.raise", { severity: "MEDIUM", category: "Revenue Risk", title: "New MRR is below the pace needed for the target", body: `This week added $${content.newMrrThisWeekUsd.toFixed(0)} MRR (≈$${(content.newMrrThisWeekUsd * 4.3).toFixed(0)}/month); the target needs ≈$${Math.round(state.requiredMonthlyNewMrrUsd).toLocaleString()}/month.`, dedupeKey: `pace:${isoWeek()}` });
  }
  return content;
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
  "closing.proposal": closingProposal,
  "content.weekly": contentWeekly,
  "marketing.weekly_plan": marketingWeekly,
  "product.funnel_review": productFunnelReview,
  "finance.weekly_review": financeWeekly,
  "reporting.daily_brief": dailyBrief,
  "commander.operate": commanderOperate,
};
