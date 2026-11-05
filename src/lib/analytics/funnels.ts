import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { sessionWhere, type Filters } from "./filters";

export type StepKind = "any_page" | "path" | "event";
export interface FunnelStep { label: string; kind: StepKind; /** path prefixes (comma separated) for `path`; event type for `event`. */ value?: string }
export interface FunnelDef { id: string; name: string; steps: FunnelStep[] }

export const DEFAULT_FUNNEL: FunnelDef = {
  id: "default", name: "Website visitor → enquiry",
  steps: [
    { label: "Website visitor", kind: "any_page" },
    { label: "Product / service page visitor", kind: "path", value: "/products,/services" },
    { label: "Contact page visitor", kind: "path", value: "/contact,/get-started,/book-consultation" },
    { label: "Form started", kind: "event", value: "form_start" },
    { label: "Form successfully submitted", kind: "event", value: "lead_created" },
  ],
};

export interface FunnelResult {
  steps: Array<{ label: string; visitors: number; pctOfFirst: number; pctOfPrevious: number; dropOffPct: number; medianSecondsFromPrevious: number | null }>;
  conversionRate: number; truncated: boolean;
}

const ROW_CAP = 250_000;

/** Core, DB-free funnel maths so it can be unit-tested: input = per-step ascending timestamps per visitor. */
export function computeFunnel(labels: string[], stepTimes: Array<Map<number, number[]>>): Omit<FunnelResult, "truncated"> {
  // Strict ordering rule: a visitor reaches step k only via an event at or after the time they reached step k-1. Counted once per visitor.
  let reached = new Map<number, number>(); // visitor → time reached current step
  const out: FunnelResult["steps"] = [];
  stepTimes.forEach((times, i) => {
    const next = new Map<number, number>();
    const gaps: number[] = [];
    for (const [v, ts] of times) {
      if (i === 0) { next.set(v, ts[0]); continue; }
      const prev = reached.get(v);
      if (prev === undefined) continue;
      const t = ts.find((x) => x >= prev);
      if (t !== undefined) { next.set(v, t); gaps.push(t - prev); }
    }
    const first = out[0]?.visitors ?? next.size;
    const prevCount = i === 0 ? next.size : out[i - 1].visitors;
    gaps.sort((a, b) => a - b);
    out.push({
      label: labels[i], visitors: next.size,
      pctOfFirst: first ? Math.round((next.size / first) * 1000) / 10 : 0,
      pctOfPrevious: i === 0 ? 100 : prevCount ? Math.round((next.size / prevCount) * 1000) / 10 : 0,
      dropOffPct: i === 0 ? 0 : prevCount ? Math.round(((prevCount - next.size) / prevCount) * 1000) / 10 : 0,
      medianSecondsFromPrevious: gaps.length ? Math.round(gaps[Math.floor(gaps.length / 2)]) : null,
    });
    reached = next;
  });
  const first = out[0]?.visitors ?? 0, last = out[out.length - 1]?.visitors ?? 0;
  return { steps: out, conversionRate: first ? Math.round((last / first) * 1000) / 10 : 0 };
}

function stepFilter(step: FunnelStep): Prisma.Sql {
  if (step.kind === "any_page") return Prisma.sql`e.type = 'page_view'`;
  if (step.kind === "event") return Prisma.sql`e.type = ${(step.value ?? "").slice(0, 40)}`;
  const prefixes = (step.value ?? "").split(",").map((p) => p.trim()).filter((p) => p.startsWith("/")).slice(0, 10);
  if (!prefixes.length) return Prisma.sql`1 = 0`;
  return Prisma.sql`e.type = 'page_view' AND (${Prisma.join(prefixes.map((p) => Prisma.sql`(e.path = ${p} OR e.path LIKE ${p.replace(/[\\%_]/g, "\\$&") + "/%"})`), " OR ")})`;
}

export async function runFunnel(f: Filters, def: FunnelDef): Promise<FunnelResult> {
  let truncated = false;
  const stepTimes: Array<Map<number, number[]>> = [];
  for (const step of def.steps.slice(0, 8)) {
    const rows = await prisma.$queryRaw<Array<{ v: number; t: unknown }>>(Prisma.sql`
      SELECT e.visitor_ref v, UNIX_TIMESTAMP(e.occurred_at) t FROM analytics_events e JOIN analytics_sessions s ON s.id = e.session_ref
      WHERE ${sessionWhere(f)} AND ${stepFilter(step)} ORDER BY e.visitor_ref, e.occurred_at LIMIT ${ROW_CAP}`);
    if (rows.length >= ROW_CAP) truncated = true;
    const m = new Map<number, number[]>();
    for (const r of rows) { const a = m.get(Number(r.v)); const t = Number(r.t); if (a) a.push(t); else m.set(Number(r.v), [t]); }
    stepTimes.push(m);
  }
  return { ...computeFunnel(def.steps.map((s) => s.label), stepTimes), truncated };
}

const KEY = "analytics.funnels";
export async function listFunnels(): Promise<FunnelDef[]> {
  const row = await prisma.systemSetting.findUnique({ where: { key: KEY } }).catch(() => null);
  const custom = Array.isArray(row?.value) ? (row!.value as unknown as FunnelDef[]).filter((x) => x && x.id && Array.isArray(x.steps)) : [];
  return [DEFAULT_FUNNEL, ...custom];
}
export function sanitizeFunnel(input: { name?: unknown; steps?: unknown }): Omit<FunnelDef, "id"> {
  const name = String(input.name ?? "").replace(/[\u0000-\u001F]/g, "").trim().slice(0, 80);
  if (!name) throw new Error("Funnel name is required.");
  const raw = Array.isArray(input.steps) ? input.steps : [];
  const steps: FunnelStep[] = raw.slice(0, 8).map((s) => {
    const o = s as Record<string, unknown>;
    const kind = o.kind === "event" ? "event" : o.kind === "any_page" ? "any_page" : "path";
    const value = String(o.value ?? "").trim().slice(0, 200);
    const label = String(o.label ?? "").trim().slice(0, 80) || (kind === "any_page" ? "Any page" : value);
    if (kind === "event" && !/^[a-z0-9_]{2,40}$/.test(value)) throw new Error(`Invalid event name "${value}".`);
    if (kind === "path" && !value.split(",").every((p) => p.trim().startsWith("/"))) throw new Error("Page paths must start with /.");
    return { label, kind, value: kind === "any_page" ? undefined : value };
  });
  if (steps.length < 2) throw new Error("A funnel needs at least two steps.");
  return { name, steps };
}
export async function saveFunnel(def: Omit<FunnelDef, "id">): Promise<FunnelDef> {
  const existing = (await listFunnels()).filter((x) => x.id !== "default");
  const created: FunnelDef = { id: `f${Date.now().toString(36)}`, ...def };
  const value = [...existing, created].slice(-20);
  await prisma.systemSetting.upsert({ where: { key: KEY }, create: { key: KEY, value: value as never }, update: { value: value as never } });
  return created;
}
export async function deleteFunnel(id: string): Promise<void> {
  const value = (await listFunnels()).filter((x) => x.id !== "default" && x.id !== id);
  await prisma.systemSetting.upsert({ where: { key: KEY }, create: { key: KEY, value: value as never }, update: { value: value as never } });
}
