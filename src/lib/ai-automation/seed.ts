/**
 * Idempotent catalogue seeding. Creates MISSING records only — it never overwrites anything an administrator has edited.
 * Seeds NO prices (see catalogue/solutions.ts). The only pricing rule seeded is the neutral MEDIUM complexity baseline (×1.0).
 */
import { prisma } from "@/lib/prisma";
import { INDUSTRY_SEEDS, SOLUTION_SEEDS } from "./catalogue";
import { DEFAULT_FOLLOWUP } from "./followup";

let seeded = false;

export async function seedAiAutomation(): Promise<{ industries: number; solutions: number; mappings: number; rules: number }> {
  let industries = 0, solutions = 0, mappings = 0, rules = 0;

  for (const i of INDUSTRY_SEEDS) {
    const existing = await prisma.aiIndustry.findUnique({ where: { slug: i.slug } });
    if (existing) continue;
    const row = await prisma.aiIndustry.create({
      data: {
        slug: i.slug, name: i.name, active: i.active, hasPage: i.hasPage, sortOrder: i.sortOrder, content: i.content as never,
        page: { create: { seoTitle: i.seo.title, seoDescription: i.seo.description, keywords: i.seo.keywords as never, ogImage: i.seo.ogImage ?? null, active: i.hasPage } },
      },
    });
    let n = 0;
    for (const q of i.questions) {
      await prisma.aiIndustryQuestion.create({
        data: {
          industryId: row.id, key: q.key, stage: q.stage, label: q.label, helpText: q.helpText ?? null, type: q.type, required: q.required, sortOrder: (n += 10), showIf: (q.showIf ?? undefined) as never,
          options: q.options ? { create: q.options.map((o, idx) => ({ value: o.value, label: o.label, sortOrder: idx })) } : undefined,
        },
      });
    }
    industries++;
  }

  for (const s of SOLUTION_SEEDS) {
    let row = await prisma.aiSolutionCatalogue.findUnique({ where: { key: s.key } });
    if (!row) {
      row = await prisma.aiSolutionCatalogue.create({
        data: {
          key: s.key, name: s.name, description: s.description, problemsSolved: s.problemsSolved as never, capabilities: s.capabilities as never, deliverables: s.deliverables as never,
          integrations: s.integrations as never, dependencies: s.dependencies as never, complexityLevels: s.complexityLevels as never, defaultComplexity: s.defaultComplexity,
          basePrice: null, pricingMethod: "FIXED", estimatedHours: null, deliveryWeeks: null, monthlyMaintenance: null,
        },
      });
      solutions++;
    }
    for (const [slug, priority] of Object.entries(s.industries)) {
      const ind = await prisma.aiIndustry.findUnique({ where: { slug } });
      if (!ind) continue;
      const m = await prisma.aiSolutionIndustryMapping.findUnique({ where: { solutionId_industryId: { solutionId: row.id, industryId: ind.id } } });
      if (m) continue;
      await prisma.aiSolutionIndustryMapping.create({ data: { solutionId: row.id, industryId: ind.id, priority, signals: { areas: s.areas, challenges: s.challenges } as never } });
      mappings++;
    }
  }

  const baseline = await prisma.aiPricingRule.findUnique({ where: { kind_key: { kind: "COMPLEXITY_MULTIPLIER", key: "MEDIUM" } } });
  if (!baseline) {
    await prisma.aiPricingRule.create({ data: { kind: "COMPLEXITY_MULTIPLIER", key: "MEDIUM", label: "Medium complexity (baseline ×1.0)", params: { multiplier: 1 }, sortOrder: 20 } });
    rules++;
  }

  const seq = await prisma.aiFollowupSequence.findUnique({ where: { key: "default" } });
  if (!seq) {
    await prisma.aiFollowupSequence.create({ data: { key: "default", name: "Default proposal follow-up", steps: DEFAULT_FOLLOWUP.steps as never, maxAttempts: DEFAULT_FOLLOWUP.maxAttempts, stopConditions: DEFAULT_FOLLOWUP.stopConditions as never } });
  }
  seeded = true;
  return { industries, solutions, mappings, rules };
}

/** Cheap, memoised guard used by background jobs so the first real submission works even before an explicit seed. */
export async function ensureSeeded(): Promise<void> {
  if (seeded) return;
  const count = await prisma.aiIndustry.count();
  if (count === 0) await seedAiAutomation(); else seeded = true;
}
