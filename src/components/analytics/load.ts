import { pageCaller } from "@/lib/analytics/access";
import { parseFilters, type Filters } from "@/lib/analytics/filters";
import type { Permission } from "@/lib/os/rbac";

type SP = Promise<Record<string, string | string[] | undefined>>;

/** Per-page authorisation + filter parsing. Returns null when the signed-in user lacks the permission. */
export async function loadIntel(searchParams: SP, permission: Permission = "analytics.read") {
  const caller = await pageCaller(permission);
  if (!caller) return null;
  const sp = await searchParams;
  return { caller, sp, f: parseFilters(sp) };
}

export const previousOf = (f: Filters): Filters => ({ ...f, from: f.prevFrom, to: f.prevTo });
export const pageNo = (sp: Record<string, string | string[] | undefined>) => Math.max(1, Math.min(10_000, Number(Array.isArray(sp.page) ? sp.page[0] : sp.page) || 1));
