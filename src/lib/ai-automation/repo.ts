/**
 * Catalogue loaders. Read the editable MySQL catalogue; fall back to the code seed when the DB is empty/unreachable so the public
 * pages (and the build) never depend on a seeded database. Admin edits always win once records exist.
 */
import { prisma } from "@/lib/prisma";
import { INDUSTRY_SEEDS, SOLUTION_SEEDS, UNIVERSAL_QUESTIONS, buildQuestionSet } from "./catalogue";
import { IndustryContentSchema, QuestionSchema, type Complexity, type IndustryConfig, type PricingMethod, type Question, type SolutionRecord } from "./types";
import type { PricingRuleRecord, PricingRuleKind } from "./pricing";

type QRow = { key: string; stage: number; label: string; helpText: string | null; type: string; required: boolean; showIf: unknown; sortOrder: number; active: boolean; options: Array<{ value: string; label: string; sortOrder: number }> };

export function rowToQuestion(r: QRow): Question | null {
  const parsed = QuestionSchema.safeParse({
    key: r.key, stage: r.stage, label: r.label, helpText: r.helpText ?? undefined, type: r.type, required: r.required,
    options: r.options.length ? [...r.options].sort((a, b) => a.sortOrder - b.sortOrder).map((o) => ({ value: o.value, label: o.label })) : undefined,
    showIf: r.showIf ?? undefined,
  });
  return parsed.success ? parsed.data : null;
}

export async function getIndustryConfigs(opts: { pagesOnly?: boolean; includeInactive?: boolean } = {}): Promise<IndustryConfig[]> {
  let configs: IndustryConfig[] | null = null;
  try {
    const rows = await prisma.aiIndustry.findMany({
      where: opts.includeInactive ? {} : { active: true },
      include: { page: true, questions: { where: { active: true }, include: { options: true }, orderBy: [{ stage: "asc" }, { sortOrder: "asc" }] } },
      orderBy: { sortOrder: "asc" },
    });
    if (rows.length) {
      configs = rows.flatMap((r) => {
        const content = IndustryContentSchema.safeParse(r.content);
        if (!content.success) return [];
        return [{
          slug: r.slug, name: r.name, hasPage: r.hasPage && (r.page?.active ?? true), sortOrder: r.sortOrder, active: r.active,
          seo: { title: r.page?.seoTitle ?? r.name, description: r.page?.seoDescription ?? "", keywords: (r.page?.keywords as string[] | null) ?? [], ogImage: r.page?.ogImage ?? undefined },
          content: content.data,
          questions: r.questions.map((q) => rowToQuestion(q as unknown as QRow)).filter((q): q is Question => !!q),
        } satisfies IndustryConfig];
      });
    }
  } catch { /* DB unavailable → fall back to seed */ }
  const all = configs && configs.length ? configs : INDUSTRY_SEEDS.filter((i) => opts.includeInactive || i.active);
  return opts.pagesOnly ? all.filter((i) => i.hasPage) : all;
}

export async function getIndustryConfig(slug: string): Promise<IndustryConfig | null> {
  return (await getIndustryConfigs({ includeInactive: true })).find((i) => i.slug === slug) ?? null;
}

/** The full ordered question set for an industry (industry-specific + universal). */
export async function getQuestionSet(slug: string): Promise<Question[]> {
  const ind = (await getIndustryConfigs()).find((i) => i.slug === slug) ?? (await getIndustryConfig("other"));
  return buildQuestionSet(ind?.questions ?? [], UNIVERSAL_QUESTIONS);
}

function seedToRecord(): SolutionRecord[] {
  return SOLUTION_SEEDS.map((s) => ({
    key: s.key, name: s.name, description: s.description, problemsSolved: s.problemsSolved, capabilities: s.capabilities, deliverables: s.deliverables, integrations: s.integrations,
    dependencies: s.dependencies, complexityLevels: s.complexityLevels, defaultComplexity: s.defaultComplexity,
    basePrice: null, pricingMethod: "FIXED", currency: "USD", estimatedHours: null, deliveryWeeks: null, monthlyMaintenance: null, active: true,
    mappings: Object.entries(s.industries).map(([industrySlug, priority]) => ({ industrySlug, priority, areas: s.areas, challenges: s.challenges })),
  }));
}

const dec = (v: unknown): number | null => (v == null ? null : Number(v));

export async function getSolutions(opts: { includeInactive?: boolean } = {}): Promise<SolutionRecord[]> {
  try {
    const rows = await prisma.aiSolutionCatalogue.findMany({ where: opts.includeInactive ? {} : { active: true }, include: { mappings: { include: { industry: true } } }, orderBy: { name: "asc" } });
    if (rows.length) {
      return rows.map((r) => ({
        id: r.id, key: r.key, name: r.name, description: r.description,
        problemsSolved: r.problemsSolved as string[], capabilities: r.capabilities as string[], deliverables: r.deliverables as string[], integrations: r.integrations as string[], dependencies: r.dependencies as string[],
        complexityLevels: r.complexityLevels as Complexity[], defaultComplexity: r.defaultComplexity as Complexity,
        basePrice: dec(r.basePrice), pricingMethod: r.pricingMethod as PricingMethod, currency: r.currency, estimatedHours: r.estimatedHours, deliveryWeeks: r.deliveryWeeks, monthlyMaintenance: dec(r.monthlyMaintenance), active: r.active,
        mappings: r.mappings.map((m) => { const sig = (m.signals ?? {}) as { areas?: string[]; challenges?: string[] }; return { industrySlug: m.industry.slug, priority: m.priority, areas: sig.areas ?? [], challenges: sig.challenges ?? [] }; }),
      }));
    }
  } catch { /* fall back */ }
  return seedToRecord();
}

export async function getPricingRules(): Promise<PricingRuleRecord[]> {
  try {
    const rows = await prisma.aiPricingRule.findMany({ orderBy: [{ kind: "asc" }, { sortOrder: "asc" }] });
    return rows.map((r) => ({ kind: r.kind as PricingRuleKind, key: r.key, label: r.label, params: r.params as Record<string, unknown>, active: r.active }));
  } catch { return []; }
}
