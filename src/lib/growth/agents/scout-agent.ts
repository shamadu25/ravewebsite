import { prisma } from "@/lib/prisma";
import { BUILTIN_PROFILES, GROWTH_ORG } from "../config";
import { runDiscovery } from "../discovery";
import { enrichPerson } from "../enrich";

export interface ScoutOptions { profileKeys?: string[]; areas: string[]; limitPerQuery?: number; enrichMax?: number }

/** Finds and scores companies across industries, then enriches already-verified decision-makers. Never invents a person or an address. */
export async function runScout(o: ScoutOptions) {
  const keys = o.profileKeys?.length ? o.profileKeys : Object.keys(BUILTIN_PROFILES);
  const found: Record<string, Record<string, number>> = {};
  const errors: string[] = [];
  for (const key of keys) {
    for (const area of o.areas) {
      try {
        const r = await runDiscovery({ profileKey: key, area, limit: o.limitPerQuery ?? 10 });
        errors.push(...r.errors);
        for (const x of r.results) found[key] = { ...found[key], [x.outcome]: (found[key]?.[x.outcome] ?? 0) + 1 };
        if (r.errors.length) break;
      } catch (e) { errors.push(`${key}/${area}: ${e instanceof Error ? e.message : "error"}`); }
    }
  }
  // Enrich verified decision-makers at qualified companies that have no contact yet (cached persons cost nothing).
  const people = await prisma.grPerson.findMany({ where: { verified: true, contacts: { none: {} }, company: { orgId: GROWTH_ORG, status: "QUALIFIED", outreachDisabled: false } }, take: o.enrichMax ?? 10, orderBy: { id: "asc" } });
  const enriched: Record<string, number> = {};
  for (const p of people) {
    const r = await enrichPerson(p.id, "agent:scout");
    enriched[r.status] = (enriched[r.status] ?? 0) + 1;
    if (r.status === "NOT_CONFIGURED") { errors.push(r.message); break; }
  }
  const needDecisionMaker = await prisma.grCompany.count({ where: { orgId: GROWTH_ORG, status: "QUALIFIED", outreachDisabled: false, people: { none: { verified: true } } } });
  return { found, enriched, needDecisionMaker, errors: [...new Set(errors)] };
}
