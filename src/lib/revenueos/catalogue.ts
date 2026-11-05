import { z } from "zod";
import { prisma } from "@/lib/prisma";

const ORG = "ravesoft";
export const AVAILABILITY = ["AVAILABLE", "LIMITED", "DISCONTINUED"] as const;

/** Editable catalogue entry. Pricing stays null until the CEO configures it — it is never invented. */
export const ProductInput = z.object({
  key: z.string().regex(/^[a-z0-9-]{2,60}$/),
  name: z.string().min(2).max(160),
  category: z.string().min(2).max(80),
  description: z.string().max(4000).optional(),
  targetIndustries: z.array(z.string().max(80)).max(50).default([]),
  problemsSolved: z.array(z.string().max(200)).max(50).default([]),
  capabilities: z.array(z.string().max(200)).max(80).default([]),
  differentiators: z.array(z.string().max(200)).max(30).default([]),
  supportedMarkets: z.array(z.string().max(80)).max(60).default([]),
  qualificationQuestions: z.array(z.string().max(300)).max(30).default([]),
  outreachAngles: z.array(z.string().max(300)).max(30).default([]),
  pricing: z.object({ model: z.enum(["FIXED", "SUBSCRIPTION", "IMPLEMENTATION", "CUSTOM"]), currency: z.string().length(3), amountCents: z.number().int().nonnegative(), minProjectCents: z.number().int().nonnegative().optional() }).nullable().optional(),
  websiteUrl: z.string().url().optional(),
  availability: z.enum(AVAILABILITY).default("AVAILABLE"),
});
export type ProductInput = z.infer<typeof ProductInput>;

/** Starting catalogue = the product lines and target markets stated in the RevenueOS brief. No prices, case studies or statistics. */
const P = (key: string, name: string, category: string, targetIndustries: string[], problemsSolved: string[], capabilities: string[] = []): ProductInput =>
  ProductInput.parse({ key, name, category, targetIndustries, problemsSolved, capabilities });
export const SEED_PRODUCTS: ProductInput[] = [
  P("ai-automation", "AI Automation", "AI Automation", ["Professional services", "Retail", "Healthcare", "Logistics"], ["Repetitive manual processes", "High enquiry volumes", "Inefficient administration"], ["AI sales agents", "AI customer support", "AI appointment scheduling", "AI lead qualification", "AI operations automation", "AI business intelligence", "AI document processing", "Custom AI employee"]),
  P("ai-sales-automation", "AI Sales Automation", "AI Automation", ["Roofing", "HVAC", "Plumbing", "Remodeling", "Real estate", "Professional services"], ["Missed enquiries", "Slow responses", "Poor lead qualification", "Inconsistent follow-ups", "Missed appointments"]),
  P("clickpos", "Click P O S", "POS", ["Supermarkets", "Retail", "Pharmacies", "Wholesale", "Restaurants"], ["Inventory visibility", "Multi-location management", "Disconnected sales reporting"], ["Point of sale", "Inventory", "Purchasing", "Sales management", "Stock transfers", "Expenses", "Reporting", "Accounting", "User management", "Offline synchronization", "Multi-location management", "Hardware integrations"]),
  P("erp", "ERP", "ERP", ["Distribution", "Wholesale", "Manufacturing", "Multi-branch organisations"], ["Disconnected back-office operations"]),
  P("emr-hms", "EMR / Hospital Management", "Healthcare", ["Hospitals", "Clinics", "Medical centres", "Diagnostic centres"], ["Patient registration", "Appointment handling", "Disconnected medical records"]),
  P("hrm", "HRM", "HR", ["Medium and large employers", "Multi-branch organisations"], ["Complex workforce management"]),
  P("queue-management", "Queue Management", "Service operations", ["Hospitals", "Banks", "Government service centres", "Customer service centres"], ["Queue and waiting-time management in high-volume service"]),
  P("hotel-management", "Hotel Management", "Hospitality", ["Hotels", "Resorts", "Guest houses", "Hospitality groups"], []),
  P("restaurant-management", "Restaurant Management", "Hospitality", ["Restaurants", "Cafes", "Food service", "Hospitality groups"], []),
  P("custom-software", "Custom Software Development", "Custom", ["Any"], ["Requirements no existing product fully covers"]),
];

/** Inserts missing products only; never overwrites CEO edits. */
export async function seedCatalogue(): Promise<{ created: number }> {
  let created = 0;
  for (const p of SEED_PRODUCTS) {
    const exists = await prisma.rvProduct.findUnique({ where: { orgId_key: { orgId: ORG, key: p.key } } });
    if (exists) continue;
    await prisma.rvProduct.create({ data: toRow(p) });
    created++;
  }
  return { created };
}

export function toRow(p: ProductInput) {
  return { orgId: ORG, key: p.key, name: p.name, category: p.category, description: p.description ?? null, targetIndustries: p.targetIndustries, problemsSolved: p.problemsSolved, capabilities: p.capabilities, differentiators: p.differentiators, supportedMarkets: p.supportedMarkets, qualificationQuestions: p.qualificationQuestions, outreachAngles: p.outreachAngles, pricing: p.pricing ?? undefined, websiteUrl: p.websiteUrl ?? null, availability: p.availability };
}

export interface CatalogueProduct { key: string; name: string; targetIndustries: string[]; problemsSolved: string[]; supportedMarkets: string[]; availability: string }
export interface Match { productKey: string; score: number; reasons: string[]; evidenceMatched: string[] }

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]/g, " ");
const words = (s: string) => new Set(norm(s).split(/\s+/).filter((w) => w.length > 3));

/**
 * Solution matching (Agent 4). A product is only recommended if it is not discontinued, serves the prospect's industry,
 * and at least one *observed* operational gap overlaps its documented problems. Industry alone is never enough.
 */
export function matchSolutions(o: { industry: string; country?: string; observedGaps: string[] }, catalogue: CatalogueProduct[]): Match[] {
  const ind = norm(o.industry);
  const matches: Match[] = [];
  for (const p of catalogue) {
    if (p.availability === "DISCONTINUED") continue;
    if (p.supportedMarkets.length && o.country && !p.supportedMarkets.some((m) => norm(m) === norm(o.country!))) continue;
    const industryHit = p.targetIndustries.some((t) => t === "Any" || ind.includes(norm(t).trim()) || norm(t).includes(ind.trim()));
    if (!industryHit) continue;
    const pw = p.problemsSolved.map((x) => ({ x, w: words(x) }));
    const evidenceMatched: string[] = [];
    for (const gap of o.observedGaps) {
      const gw = words(gap);
      if (pw.some(({ w }) => [...gw].some((g) => w.has(g)))) evidenceMatched.push(gap);
    }
    if (!evidenceMatched.length) continue;
    matches.push({ productKey: p.key, score: Math.min(100, 40 + evidenceMatched.length * 20), reasons: [`Serves ${o.industry}`, `Addresses ${evidenceMatched.length} observed gap(s)`], evidenceMatched });
  }
  return matches.sort((a, b) => b.score - a.score);
}
