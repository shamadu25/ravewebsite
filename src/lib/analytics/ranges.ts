/** Date-range presets for the Intelligence dashboards. Pure and unit-tested. All boundaries are UTC; `to` is exclusive. */
export const PRESETS = ["today", "yesterday", "7d", "30d", "90d", "this_month", "last_month", "this_year", "custom"] as const;
export type Preset = (typeof PRESETS)[number];

export const PRESET_LABEL: Record<Preset, string> = {
  today: "Today", yesterday: "Yesterday", "7d": "Last 7 days", "30d": "Last 30 days", "90d": "Last 90 days",
  this_month: "This month", last_month: "Last month", this_year: "This year", custom: "Custom range",
};

export interface DateRange { preset: Preset; from: Date; to: Date; prevFrom: Date; prevTo: Date; days: number; label: string }

const DAY = 86_400_000;
const startOfDay = (d: Date) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
const parseDay = (s?: string | null) => (s && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s)) ? new Date(`${s}T00:00:00.000Z`) : null);

export function resolveRange(preset: string | undefined, fromStr?: string | null, toStr?: string | null, now = new Date()): DateRange {
  const today = startOfDay(now);
  const tomorrow = new Date(today.getTime() + DAY);
  let p = (PRESETS as readonly string[]).includes(preset ?? "") ? (preset as Preset) : "30d";
  let from: Date, to: Date;
  switch (p) {
    case "today": from = today; to = tomorrow; break;
    case "yesterday": from = new Date(today.getTime() - DAY); to = today; break;
    case "7d": from = new Date(tomorrow.getTime() - 7 * DAY); to = tomorrow; break;
    case "90d": from = new Date(tomorrow.getTime() - 90 * DAY); to = tomorrow; break;
    case "this_month": from = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1)); to = tomorrow; break;
    case "last_month": from = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - 1, 1)); to = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1)); break;
    case "this_year": from = new Date(Date.UTC(today.getUTCFullYear(), 0, 1)); to = tomorrow; break;
    case "custom": {
      const f = parseDay(fromStr), t = parseDay(toStr);
      if (f && t && t >= f) { from = f; to = new Date(Math.min(t.getTime() + DAY, tomorrow.getTime())); if (to <= from) to = new Date(from.getTime() + DAY); }
      else { p = "30d"; from = new Date(tomorrow.getTime() - 30 * DAY); to = tomorrow; }
      break;
    }
    default: from = new Date(tomorrow.getTime() - 30 * DAY); to = tomorrow;
  }
  const span = to.getTime() - from.getTime();
  const days = Math.max(1, Math.round(span / DAY));
  return { preset: p, from, to, prevFrom: new Date(from.getTime() - span), prevTo: from, days, label: p === "custom" ? `${from.toISOString().slice(0, 10)} → ${new Date(to.getTime() - 1).toISOString().slice(0, 10)}` : PRESET_LABEL[p] };
}

/** Percentage change vs the previous period. Returns null when there is no meaningful baseline (previous = 0). */
export function pctChange(current: number, previous: number): number | null {
  if (!Number.isFinite(current) || !Number.isFinite(previous) || previous === 0) return null;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

export function dayKeys(from: Date, to: Date): string[] {
  const out: string[] = [];
  for (let t = from.getTime(); t < to.getTime(); t += DAY) out.push(new Date(t).toISOString().slice(0, 10));
  return out.slice(0, 400);
}
