/** Dashboard + analytics queries and the go-live readiness checklist. Money is never summed across currencies. */
import { prisma } from "@/lib/prisma";
import { llmStatus } from "@/lib/os/llm";
import { getSolutions, getPricingRules } from "./repo";
import { getFxConfig } from "./settings";
import { smtpConfigured } from "./email/send";

const OPEN_PIPELINE = ["QUALIFIED", "PROPOSAL_GENERATED", "AWAITING_APPROVAL", "PROPOSAL_SENT", "NEGOTIATION"];

export async function dashboardStats() {
  const [totalAssessments, leadsByStatus, byIndustry, proposalsByStatus, valueRows, accepted, sent] = await Promise.all([
    prisma.aiAssessment.count(),
    prisma.aiLead.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.aiLead.groupBy({ by: ["industrySlug"], _count: { _all: true } }),
    prisma.aiProposal.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.aiLead.groupBy({ by: ["currency"], where: { status: { in: OPEN_PIPELINE }, dealValue: { not: null } }, _sum: { dealValue: true, monthlyRecurring: true }, _avg: { dealValue: true }, _count: { _all: true } }),
    prisma.aiProposal.count({ where: { status: "ACCEPTED" } }),
    prisma.aiProposal.count({ where: { sentAt: { not: null } } }),
  ]);
  const st = Object.fromEntries(leadsByStatus.map((r) => [r.status, r._count._all]));
  const ps = Object.fromEntries(proposalsByStatus.map((r) => [r.status, r._count._all]));
  const qualified = await prisma.aiLead.count({ where: { priority: { in: ["HIGH", "MEDIUM"] } } });
  return {
    totalAssessments,
    newLeads: st.NEW_LEAD ?? 0,
    qualifiedLeads: qualified,
    leadsByStatus: st,
    leadsByIndustry: byIndustry.map((r) => ({ industry: r.industrySlug ?? "unknown", count: r._count._all })).sort((a, b) => b.count - a.count),
    proposals: { total: Object.values(ps).reduce((a, b) => a + b, 0), awaitingApproval: ps.AWAITING_APPROVAL ?? 0, manualReview: ps.MANUAL_REVIEW ?? 0, sent: sent, accepted: ps.ACCEPTED ?? 0, declined: ps.DECLINED ?? 0, byStatus: ps },
    pipeline: valueRows.map((r) => ({ currency: r.currency, deals: r._count._all, value: Number(r._sum.dealValue ?? 0), monthlyRecurring: Number(r._sum.monthlyRecurring ?? 0), averageValue: Number(r._avg.dealValue ?? 0) })),
    conversionRate: sent > 0 ? Math.round((accepted / sent) * 1000) / 10 : null,
  };
}

export async function funnelStats(since = new Date(Date.now() - 30 * 86_400_000)) {
  const rows = await prisma.aiEvent.groupBy({ by: ["name", "industrySlug"], where: { createdAt: { gte: since } }, _count: { _all: true } });
  const steps = await prisma.aiEvent.groupBy({ by: ["step"], where: { name: "assessment_step", createdAt: { gte: since } }, _count: { _all: true } });
  const total = (name: string) => rows.filter((r) => r.name === name).reduce((a, r) => a + r._count._all, 0);
  const submissions = await prisma.aiAssessment.count({ where: { submittedAt: { gte: since } } });
  const starts = total("assessment_start");
  const industries = new Map<string, { views: number; starts: number; submissions: number }>();
  const row = (s: string) => industries.get(s) ?? industries.set(s, { views: 0, starts: 0, submissions: 0 }).get(s)!;
  for (const r of rows) {
    const s = r.industrySlug ?? "general";
    if (r.name === "industry_page_view" || r.name === "page_view") row(s).views += r._count._all;
    if (r.name === "assessment_start") row(s).starts += r._count._all;
  }
  for (const r of await prisma.aiAssessment.groupBy({ by: ["industrySlug"], where: { submittedAt: { gte: since } }, _count: { _all: true } })) row(r.industrySlug).submissions += r._count._all;
  return {
    since, pageViews: total("page_view") + total("industry_page_view"), industryPageViews: total("industry_page_view"), assessmentStarts: starts, submissions,
    completionRate: starts > 0 ? Math.round((Math.min(submissions, starts) / starts) * 1000) / 10 : null,
    abandonment: starts > 0 ? Math.max(0, starts - submissions) : 0,
    stepViews: steps.map((s) => ({ step: s.step ?? 0, count: s._count._all })).sort((a, b) => a.step - b.step),
    byIndustry: [...industries.entries()].map(([industry, v]) => ({ industry, ...v })).sort((a, b) => b.submissions - a.submissions || b.views - a.views),
  };
}

export async function performanceBreakdown() {
  const leads = await prisma.aiLead.findMany({ select: { industrySlug: true, country: true, status: true, dealValue: true, monthlyRecurring: true, currency: true, priority: true } });
  const group = (key: "industrySlug" | "country") => {
    const m = new Map<string, { leads: number; qualified: number; accepted: number; value: Record<string, number>; mrr: Record<string, number> }>();
    for (const l of leads) {
      const k = l[key] ?? "unknown";
      const e = m.get(k) ?? { leads: 0, qualified: 0, accepted: 0, value: {}, mrr: {} };
      e.leads++;
      if (l.priority === "HIGH" || l.priority === "MEDIUM") e.qualified++;
      if (["ACCEPTED", "IMPLEMENTATION", "ACTIVE_CUSTOMER", "COMPLETED"].includes(l.status)) e.accepted++;
      if (l.dealValue != null) e.value[l.currency] = (e.value[l.currency] ?? 0) + Number(l.dealValue);
      if (l.monthlyRecurring != null) e.mrr[l.currency] = (e.mrr[l.currency] ?? 0) + Number(l.monthlyRecurring);
      m.set(k, e);
    }
    return [...m.entries()].map(([name, v]) => ({ name, ...v })).sort((a, b) => b.leads - a.leads);
  };
  return { industry: group("industrySlug"), country: group("country") };
}

export interface ReadinessItem { key: string; label: string; ok: boolean; detail: string; fix: string }

/** What still has to be configured before a proposal can be priced, approved and emailed. Shown at the top of the admin. */
export async function readiness(): Promise<ReadinessItem[]> {
  const [solutions, rules, fx] = await Promise.all([getSolutions({ includeInactive: true }), getPricingRules(), getFxConfig()]);
  const active = solutions.filter((s) => s.active);
  const unpriced = active.filter((s) => s.basePrice == null);
  const noMaint = active.filter((s) => s.monthlyMaintenance == null);
  const integrations = [...new Set(active.flatMap((s) => s.integrations))];
  const feeKeys = new Set(rules.filter((r) => r.kind === "INTEGRATION_FEE" && r.active).map((r) => r.key));
  const missingFees = integrations.filter((i) => !feeKeys.has(i));
  const has = (kind: string, key = "default") => rules.some((r) => r.kind === kind && r.key === key && r.active);
  const mult = ["LOW", "MEDIUM", "HIGH"].filter((c) => !rules.some((r) => r.kind === "COMPLEXITY_MULTIPLIER" && r.key === c && r.active));
  const llm = llmStatus();
  return [
    { key: "prices", label: "Solution prices approved", ok: unpriced.length === 0, detail: `${active.length - unpriced.length} of ${active.length} active solutions have an approved price.`, fix: "Admin → Solutions: enter base price, hours and delivery weeks." },
    { key: "maintenance", label: "Monthly maintenance set", ok: noMaint.length === 0, detail: `${active.length - noMaint.length} of ${active.length} have maintenance set (0 is allowed).`, fix: "Admin → Solutions." },
    { key: "multipliers", label: "Complexity multipliers", ok: mult.length === 0, detail: mult.length ? `Missing: ${mult.join(", ")}.` : "LOW, MEDIUM and HIGH configured.", fix: "Admin → Pricing: COMPLEXITY_MULTIPLIER rules." },
    { key: "integration-fees", label: "Integration fees", ok: missingFees.length === 0, detail: missingFees.length ? `${missingFees.length} integrations have no fee: ${missingFees.slice(0, 6).join(", ")}${missingFees.length > 6 ? "…" : ""}.` : "All integrations priced.", fix: "Admin → Pricing: INTEGRATION_FEE rules (0 is allowed)." },
    { key: "payment", label: "Payment schedule", ok: has("PAYMENT_SCHEDULE"), detail: has("PAYMENT_SCHEDULE") ? "Configured." : "No payment schedule — proposals stay in manual review.", fix: "Admin → Pricing: PAYMENT_SCHEDULE (key: default)." },
    { key: "fx", label: "Exchange rates (optional)", ok: Object.keys(fx.rates).length > 0, detail: Object.keys(fx.rates).length ? `Configured: ${Object.keys(fx.rates).join(", ")}.` : "Only USD quotes are possible until rates are entered.", fix: "Admin → Settings → Currency (rate, source, date)." },
    { key: "smtp", label: "Email (SMTP)", ok: smtpConfigured(), detail: smtpConfigured() ? "SMTP credentials present." : "SMTP_HOST / SMTP_USER / SMTP_PASS missing — no email can be sent.", fix: "Set SMTP_* environment variables in Vercel." },
    { key: "ai", label: "AI provider", ok: llm.configured, detail: llm.configured ? `Available: ${llm.providers.filter((p) => p.available).map((p) => p.name).join(", ")}.` : "No AI key — rules-based analysis is used and every lead is flagged for manual review.", fix: "Set OPENAI_API_KEY / ANTHROPIC_API_KEY / GEMINI_API_KEY." },
    { key: "cron", label: "Scheduler secret", ok: Boolean(process.env.CRON_SECRET), detail: process.env.CRON_SECRET ? "CRON_SECRET set." : "CRON_SECRET missing — follow-ups and retries will not run on a schedule.", fix: "Set CRON_SECRET and the GitHub Actions secrets." },
    { key: "link-secret", label: "Link signing secret", ok: Boolean(process.env.AI_AUTOMATION_LINK_SECRET || process.env.ADMIN_SESSION_SECRET), detail: "Used to sign private proposal and opt-out links.", fix: "Set AI_AUTOMATION_LINK_SECRET (or keep ADMIN_SESSION_SECRET)." },
  ];
}
