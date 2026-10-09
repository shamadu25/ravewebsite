/** ISO week label like 2026-W41, used to run weekly cadences exactly once per week. */
export const isoWeek = (d = new Date()): string => {
  const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  t.setUTCDate(t.getUTCDate() + 4 - (t.getUTCDay() || 7));
  const y0 = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  return `${t.getUTCFullYear()}-W${String(Math.ceil(((t.getTime() - y0.getTime()) / 86400_000 + 1) / 7)).padStart(2, "0")}`;
};
