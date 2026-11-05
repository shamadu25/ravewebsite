import { Prisma } from "@prisma/client";

/** Minimal in-memory stand-in for the Prisma models the analytics code touches (unique constraints included). */
type Row = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
const dup = () => new Prisma.PrismaClientKnownRequestError("Unique constraint failed", { code: "P2002", clientVersion: "test" });

function table(uniques: string[], defaults: Row = {}) {
  const rows: Row[] = [];
  let seq = 0;
  const match = (r: Row, where: Row = {}): boolean =>
    Object.entries(where).every(([k, v]) => {
      if (v && typeof v === "object" && !(v instanceof Date)) {
        const x = r[k];
        if ("gte" in v && !(x >= v.gte)) return false;
        if ("lt" in v && !(x < v.lt)) return false;
        if ("not" in v && x === v.not) return false;
        if ("in" in v && !v.in.includes(x)) return false;
        return true;
      }
      return r[k] === v;
    });
  return {
    rows,
    findUnique: async ({ where }: Row) => { const r = rows.find((x) => match(x, where)); return r ? { ...r } : null; },
    findUniqueOrThrow: async ({ where }: Row) => { const r = rows.find((x) => match(x, where)); if (!r) throw new Error("not found"); return { ...r }; },
    findFirst: async ({ where, orderBy }: Row = {}) => {
      let list = rows.filter((r) => match(r, where));
      if (orderBy) { const [k, d] = Object.entries(orderBy)[0] as [string, string]; list = [...list].sort((a, b) => (a[k] < b[k] ? -1 : a[k] > b[k] ? 1 : 0) * (d === "desc" ? -1 : 1)); }
      return list[0] ? { ...list[0] } : null;
    },
    create: async ({ data }: Row) => {
      for (const u of uniques) if (data[u] !== undefined && rows.some((r) => r[u] === data[u])) throw dup();
      const row = { id: ++seq, createdAt: new Date(), ...defaults, ...data };
      rows.push(row);
      return { ...row };
    },
    createMany: async ({ data, skipDuplicates }: Row) => {
      let n = 0;
      for (const d of data) {
        if (uniques.some((u) => d[u] !== undefined && rows.some((r) => r[u] === d[u]))) { if (skipDuplicates) continue; throw dup(); }
        rows.push({ id: ++seq, createdAt: new Date(), ...defaults, ...d }); n++;
      }
      return { count: n };
    },
    update: async ({ where, data }: Row) => {
      const r = rows.find((x) => match(x, where)); if (!r) throw new Error("not found");
      for (const [k, v] of Object.entries(data)) r[k] = v && typeof v === "object" && "increment" in (v as Row) ? (r[k] ?? 0) + (v as Row).increment : v;
      return { ...r };
    },
    updateMany: async ({ where, data }: Row) => { const hit = rows.filter((r) => match(r, where)); hit.forEach((r) => Object.assign(r, data)); return { count: hit.length }; },
    count: async ({ where }: Row = {}) => rows.filter((r) => match(r, where)).length,
  };
}

export function makeDb() {
  return {
    analyticsVisitor: table(["visitorId"], { sessionCount: 0, leadCount: 0 }),
    analyticsSession: table(["sessionId"], { pageViews: 0, eventCount: 0, engagedSeconds: 0, elapsedSeconds: 0, maxScroll: 0, converted: false, channel: "direct", device: "desktop" }),
    analyticsPageview: table(["pageviewId"], { engagedSeconds: 0, elapsedSeconds: 0, maxScroll: 0, isExit: false }),
    analyticsEvent: table(["eventId"]),
    analyticsConversion: table(["conversionKey", "leadId"], { pagesVisited: 0, previousVisits: 0, engagedSecondsBefore: 0, attributed: false }),
    systemSetting: { findUnique: async () => null, upsert: async () => ({}) },
  };
}
