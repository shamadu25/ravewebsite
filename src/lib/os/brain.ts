import { prisma } from "@/lib/prisma";
import { ORG_ID } from "./constants";
import { audit } from "./audit";

export const BRAIN_SECTIONS = [
  "Mission", "Vision", "Strategy", "Revenue Goals", "Products", "Customers", "Prospects", "Pricing", "Competitors",
  "Brand", "Marketing", "Sales", "Support", "Operations", "Finance", "Employees", "SOPs", "Knowledge", "Policies",
  "Integrations", "Metrics", "Historical Decisions",
] as const;

const STOP = new Set(["the", "a", "an", "and", "or", "of", "to", "in", "for", "on", "is", "are", "with", "how", "what", "we", "our", "it", "this", "that"]);

export function tokenize(text: string): string[] {
  return text.toLowerCase().split(/[^a-z0-9$]+/).filter((t) => t.length > 2 && !STOP.has(t));
}

/** Rank entries by term overlap (title weighted 3x). Pure, so it is unit-testable. */
export function rankEntries<T extends { title: string; content: string; tags?: unknown }>(entries: T[], query: string, limit: number): T[] {
  const q = tokenize(query);
  if (!q.length) return [];
  return entries
    .map((e) => {
      const title = new Set(tokenize(e.title));
      const body = new Set(tokenize(e.content));
      const tags = new Set(Array.isArray(e.tags) ? (e.tags as string[]).flatMap((t) => tokenize(String(t))) : []);
      const score = q.reduce((n, t) => n + (title.has(t) ? 3 : 0) + (tags.has(t) ? 2 : 0) + (body.has(t) ? 1 : 0), 0);
      return { e, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((x) => x.e);
}

/**
 * Scoped retrieval (spec §4): an agent only sees sections in its knowledgeSources and entries whose
 * allowedDepartments (if set) include its department. Nothing else is ever returned.
 */
export async function retrieveForAgent(opts: { department: string; sections: string[]; query: string; limit?: number }) {
  if (!opts.sections.length) return [];
  const rows = await prisma.osBrainEntry.findMany({ where: { orgId: ORG_ID, section: { in: opts.sections } }, take: 500 });
  const permitted = rows.filter((r) => {
    const allowed = r.allowedDepartments as string[] | null;
    return !allowed || allowed.length === 0 || allowed.includes(opts.department);
  });
  return rankEntries(permitted, opts.query, opts.limit ?? 5).map((r) => ({ id: r.id, section: r.section, title: r.title, content: r.content.slice(0, 1200) }));
}

export async function upsertBrainEntry(input: {
  section: string; title: string; content: string; tags?: string[]; sourceUrl?: string | null; allowedDepartments?: string[] | null;
  isDemo?: boolean; actor: string; actorType: "HUMAN" | "AI_AGENT" | "SYSTEM"; id?: number;
}) {
  const data = {
    orgId: ORG_ID, section: input.section, title: input.title, content: input.content, tags: input.tags ?? [],
    sourceUrl: input.sourceUrl ?? null, allowedDepartments: input.allowedDepartments ?? undefined, isDemo: input.isDemo ?? false,
  };
  const row = input.id
    ? await prisma.osBrainEntry.update({ where: { id: input.id }, data: { ...data, version: { increment: 1 } } })
    : await prisma.osBrainEntry.create({ data: { ...data, createdBy: input.actor } });
  await audit({ actor: input.actor, actorType: input.actorType, action: input.id ? "brain.update" : "brain.create", resource: "brain_entry", resourceId: row.id, input: { section: input.section, title: input.title } });
  return row;
}

/** Split into ~1200-char chunks on paragraph boundaries so retrieval returns focused passages. */
export function chunkText(text: string, size = 1200): string[] {
  const out: string[] = [];
  let cur = "";
  for (const para of text.split(/\n{2,}/)) {
    if ((cur + "\n\n" + para).length > size && cur) { out.push(cur.trim()); cur = ""; }
    if (para.length > size) { for (let i = 0; i < para.length; i += size) out.push(para.slice(i, i + size).trim()); } else cur += (cur ? "\n\n" : "") + para;
  }
  if (cur.trim()) out.push(cur.trim());
  return out.filter(Boolean);
}

