import { Prisma } from "@prisma/client";
import { resolveRange, type DateRange } from "./ranges";

export interface Filters extends DateRange { country?: string; channel?: string; campaign?: string; device?: string }
type SP = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
const clean = (v: string | undefined, re: RegExp, max: number) => (v && re.test(v) ? v.slice(0, max) : undefined);

export function parseFilters(sp: SP, now = new Date()): Filters {
  const range = resolveRange(one(sp.range), one(sp.from), one(sp.to), now);
  return {
    ...range,
    country: clean(one(sp.country)?.toUpperCase(), /^[A-Z]{2}$/, 2),
    channel: clean(one(sp.channel), /^[a-z_]{3,20}$/, 20),
    campaign: clean(one(sp.campaign), /^[\w .\-+%:]{1,150}$/, 150),
    device: clean(one(sp.device), /^(desktop|mobile|tablet)$/, 10),
  };
}

const col = (alias: string, name: string) => Prisma.raw(`${alias}.${name}`);

/** WHERE fragment over analytics_sessions (alias `a`) for the current range + optional dimension filters. */
export function sessionWhere(f: Filters, a = "s", range: "cur" | "prev" = "cur"): Prisma.Sql {
  const from = range === "cur" ? f.from : f.prevFrom, to = range === "cur" ? f.to : f.prevTo;
  const parts: Prisma.Sql[] = [Prisma.sql`${col(a, "started_at")} >= ${from} AND ${col(a, "started_at")} < ${to}`];
  if (f.country) parts.push(Prisma.sql`${col(a, "country_code")} = ${f.country}`);
  if (f.channel) parts.push(Prisma.sql`${col(a, "channel")} = ${f.channel}`);
  if (f.campaign) parts.push(Prisma.sql`${col(a, "utm_campaign")} = ${f.campaign}`);
  if (f.device) parts.push(Prisma.sql`${col(a, "device")} = ${f.device}`);
  return Prisma.join(parts, " AND ");
}

/** Same filters over analytics_conversions (alias `c`): the last-touch channel/campaign is what leads are filtered by. */
export function conversionWhere(f: Filters, a = "c", range: "cur" | "prev" = "cur"): Prisma.Sql {
  const from = range === "cur" ? f.from : f.prevFrom, to = range === "cur" ? f.to : f.prevTo;
  const parts: Prisma.Sql[] = [Prisma.sql`${col(a, "occurred_at")} >= ${from} AND ${col(a, "occurred_at")} < ${to}`];
  if (f.country) parts.push(Prisma.sql`${col(a, "country_code")} = ${f.country}`);
  if (f.channel) parts.push(Prisma.sql`${col(a, "lt_channel")} = ${f.channel}`);
  if (f.campaign) parts.push(Prisma.sql`${col(a, "lt_campaign")} = ${f.campaign}`);
  if (f.device) parts.push(Prisma.sql`${col(a, "device")} = ${f.device}`);
  return Prisma.join(parts, " AND ");
}

/** Round-trips the active filters into a query string for links/exports. */
export function filterQuery(f: Filters, extra: Record<string, string | undefined> = {}): string {
  const p = new URLSearchParams();
  p.set("range", f.preset);
  if (f.preset === "custom") { p.set("from", f.from.toISOString().slice(0, 10)); p.set("to", new Date(f.to.getTime() - 1).toISOString().slice(0, 10)); }
  for (const k of ["country", "channel", "campaign", "device"] as const) if (f[k]) p.set(k, f[k] as string);
  for (const [k, v] of Object.entries(extra)) if (v) p.set(k, v);
  return p.toString();
}
