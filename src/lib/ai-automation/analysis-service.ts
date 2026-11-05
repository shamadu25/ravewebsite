/** Job handlers for ANALYSIS and MATCH_PRICE: AI analysis → solution matching → qualification → deterministic pricing. */
import { prisma } from "@/lib/prisma";
import { getQuestionSet, getSolutions, getPricingRules, getIndustryConfig } from "./repo";
import { matchSolutions, estimateComplexity } from "./matching";
import { runAnalysis, llmProvider, type AnalysisProvider } from "./ai/provider";
import { toCandidate, type AnalysisContext } from "./ai/context";
import { inputHash } from "./intake";
import { advanceLead, logActivity } from "./crm";
import { enqueueJob } from "./jobs";
import { calculateQuote, type QuoteOptions, type QuoteSolutionInput } from "./pricing";
import { getFxConfig, getQualificationConfig } from "./settings";
import { qualifyLead } from "./qualification";
import { AUTOMATION_AREA_OPTIONS, CHALLENGE_OPTIONS, type Complexity, type Currency, type Question } from "./types";
import type { BusinessAnalysis } from "./ai/schema";

export type StoredAnswers = Record<string, string | string[] | boolean>;

export function displayAnswer(q: Question | undefined, v: unknown): string {
  if (Array.isArray(v)) return v.map((x) => q?.options?.find((o) => o.value === x)?.label ?? String(x)).join(", ");
  if (typeof v === "boolean") return v ? "Yes" : "No";
  if (typeof v === "string") return q?.options?.find((o) => o.value === v)?.label ?? v;
  return "";
}

export async function loadAssessment(assessmentId: number) {
  const a = await prisma.aiAssessment.findUnique({ where: { id: assessmentId }, include: { responses: true, lead: { include: { contact: true, company: true } } } });
  if (!a) throw new Error(`Assessment ${assessmentId} not found.`);
  const answers: StoredAnswers = Object.fromEntries(a.responses.map((r) => [r.questionKey, r.value as string | string[] | boolean]));
  return { a, answers };
}

export async function buildContext(assessmentId: number): Promise<{ ctx: AnalysisContext; answers: StoredAnswers; industryName: string; matches: ReturnType<typeof matchSolutions> }> {
  const { a, answers } = await loadAssessment(assessmentId);
  const questions = await getQuestionSet(a.industrySlug);
  const byKey = new Map(questions.map((q) => [q.key, q]));
  const industry = await getIndustryConfig(a.industrySlug);
  const areas = (answers.automationAreas as string[] | undefined) ?? [];
  const challenges = (answers.challenges as string[] | undefined) ?? [];
  const matches = matchSolutions(await getSolutions(), { industrySlug: a.industrySlug, areas, challenges });

  // Contact PII (name/email/phone) is deliberately NOT sent to the AI provider — it is not needed for the analysis.
  const PII = new Set(["fullName", "email", "phone", "consentProcessing", "consentMarketing"]);
  const responses = Object.entries(answers).filter(([k]) => !PII.has(k)).map(([k, v]) => ({ question: byKey.get(k)?.label ?? k, answer: displayAnswer(byKey.get(k), v) })).filter((r) => r.answer);
  const profile: Record<string, unknown> = {};
  for (const k of ["businessName", "country", "city", "website", "employees", "branches", "businessAge", "description", "existingSoftware", "budget", "urgency", "timeline"]) if (answers[k] !== undefined) profile[k] = displayAnswer(byKey.get(k), answers[k]);
  const ctx: AnalysisContext = {
    industry: { slug: a.industrySlug, name: industry?.name ?? a.industrySlug },
    profile, responses,
    challenges, automationAreas: areas.map((x) => AUTOMATION_AREA_OPTIONS.find((o) => o.value === x)?.label ?? x),
    candidates: matches.map(toCandidate),
    customerText: [...responses.map((r) => r.answer), ...Object.values(profile).map(String)].join(" "),
  };
  return { ctx, answers, industryName: ctx.industry.name, matches };
}

/** ANALYSIS job handler (also used by admin "regenerate"). */
export async function runAnalysisForAssessment(assessmentId: number, o: { actor?: string; providers?: AnalysisProvider[]; regenerate?: boolean } = {}) {
  const { ctx } = await buildContext(assessmentId);
  const run = await runAnalysis(ctx, o.providers ?? [llmProvider]);
  const last = await prisma.aiBusinessAnalysis.findFirst({ where: { assessmentId }, orderBy: { version: "desc" }, select: { version: true } });
  const version = (last?.version ?? 0) + 1;
  const row = await prisma.aiBusinessAnalysis.create({
    data: { assessmentId, version, status: run.status, provider: run.provider, model: run.model, promptVersion: run.promptVersion, inputHash: inputHash({ profile: ctx.profile, responses: ctx.responses }), output: run.analysis as never, note: run.note ?? null, createdBy: o.actor ?? "system" },
  });
  const a = await prisma.aiAssessment.update({ where: { id: assessmentId }, data: { status: "ANALYSED" } });
  await advanceLead(a.leadId, "AI_ANALYSIS_COMPLETED", o.actor ?? "system");
  await logActivity({ leadId: a.leadId, assessmentId, actor: o.actor ?? "system", action: o.regenerate ? "analysis.regenerated" : "analysis.completed", detail: { version, provider: run.provider, status: run.status } });
  await enqueueJob({ type: "MATCH_PRICE", key: `match:${assessmentId}:a${row.id}`, payload: { assessmentId, analysisId: row.id } });
  return row;
}

export async function latestAnalysis(assessmentId: number) {
  return prisma.aiBusinessAnalysis.findFirst({ where: { assessmentId }, orderBy: { version: "desc" } });
}

export interface ProposalQuoteInput { items: Array<{ key: string; complexity?: Complexity; quantity?: number }>; options: QuoteOptions & { priceOverrides?: Record<string, number> } }

/** Build default quote input from the analysis' recommended solutions. */
export function defaultQuoteInput(analysis: BusinessAnalysis, answers: StoredAnswers, integrationCount: number): ProposalQuoteInput {
  const complexity = estimateComplexity({ employees: answers.employees as string | undefined, branches: answers.branches as string | undefined, integrationCount, existingSoftwareMentioned: !!answers.existingSoftware });
  const seen = new Set<string>();
  const items = analysis.recommendations.filter((r) => r.solutionKey !== "none" && !seen.has(r.solutionKey) && seen.add(r.solutionKey)).map((r) => ({ key: r.solutionKey, complexity: (r.complexity ?? complexity) as Complexity, quantity: 1 }));
  return { items, options: { currency: "USD" } };
}

export async function priceQuote(input: ProposalQuoteInput) {
  const solutions = await getSolutions({ includeInactive: true });
  const byKey = new Map(solutions.map((s) => [s.key, s]));
  const unknown = input.items.filter((i) => !byKey.has(i.key)).map((i) => i.key);
  const items: QuoteSolutionInput[] = input.items.filter((i) => byKey.has(i.key)).map((i) => {
    const s = byKey.get(i.key)!;
    const override = input.options.priceOverrides?.[i.key];
    return { solution: override != null ? { ...s, basePrice: override } : s, complexity: i.complexity, quantity: i.quantity };
  });
  const result = calculateQuote({ items, rules: await getPricingRules(), fx: await getFxConfig(), options: input.options });
  if (unknown.length) { result.missing.push(...unknown.map((k) => `Solution "${k}" is not in the catalogue.`)); result.status = "MANUAL_REVIEW"; }
  // A price override is an authorised exception: always route through approval and record it.
  const overridden = Object.keys(input.options.priceOverrides ?? {});
  if (overridden.length) { result.approval = { required: true, reasons: [...result.approval.reasons, `Catalogue price overridden for: ${overridden.join(", ")}.`] }; }
  return { result, solutions: items.map((i) => ({ key: i.solution.key, basePrice: i.solution.basePrice, monthlyMaintenance: i.solution.monthlyMaintenance, estimatedHours: i.solution.estimatedHours, deliveryWeeks: i.solution.deliveryWeeks })) };
}

/** MATCH_PRICE job handler: qualification + deterministic quote snapshot. */
export async function runMatchAndPrice(assessmentId: number, o: { actor?: string } = {}) {
  const { a, answers } = await loadAssessment(assessmentId);
  const analysis = await latestAnalysis(assessmentId);
  if (!analysis) throw new Error("No analysis available to price.");
  const output = analysis.output as unknown as BusinessAnalysis;
  const solutions = await getSolutions({ includeInactive: true });
  const recKeys = output.recommendations.map((r) => r.solutionKey).filter((k) => k !== "none");
  const matched = solutions.filter((s) => recKeys.includes(s.key));
  const integrationCount = new Set(matched.flatMap((s) => s.integrations)).size;

  const input = defaultQuoteInput(output, answers, integrationCount);
  const { result, solutions: snap } = await priceQuote(input);
  const calc = await prisma.aiPricingCalculation.create({
    data: { assessmentId, status: result.status, currency: result.currency, initialTotal: result.initialTotal, monthlyTotal: result.monthlyTotal, snapshot: { input, result, catalogue: snap } as never, createdBy: o.actor ?? "system" },
  });

  const q = qualifyLead({
    employees: answers.employees as string, branches: answers.branches as string, businessAge: answers.businessAge as string, urgency: answers.urgency as string, timeline: answers.timeline as string,
    budget: answers.budget as string, customInvestment: answers.customInvestment as string, challengeCount: ((answers.challenges as string[]) ?? []).length, areaCount: ((answers.automationAreas as string[]) ?? []).filter((x) => x !== "NOT_SURE").length,
    descriptionLength: String(answers.description ?? "").length, hasWebsite: !!answers.website, existingSoftware: !!answers.existingSoftware,
    matchedSolutions: matched.length, pricedSolutions: matched.filter((s) => s.basePrice != null).length, customOnly: matched.length > 0 && matched.every((s) => s.key === "ai-custom-solution"), analysisFallback: analysis.status === "FALLBACK",
  }, await getQualificationConfig());
  await prisma.aiLead.update({ where: { id: a.leadId }, data: { priority: q.classification, qualificationScore: q.score, qualificationReasons: { summary: q.summary, reasons: q.reasons } as never, currency: result.currency, ...(result.status === "COMPLETE" ? { dealValue: result.initialTotal, monthlyRecurring: result.monthlyTotal } : {}) } });
  if (q.classification === "HIGH" || q.classification === "MEDIUM") await advanceLead(a.leadId, "QUALIFIED", o.actor ?? "system", { score: q.score });
  await logActivity({ leadId: a.leadId, assessmentId, actor: o.actor ?? "system", action: "lead.qualified", detail: { classification: q.classification, score: q.score } });
  await enqueueJob({ type: "PROPOSAL", key: `proposal:${assessmentId}:c${calc.id}`, payload: { assessmentId, calculationId: calc.id } });
  return { calc, qualification: q };
}

export { CHALLENGE_OPTIONS };
export type { Currency };
