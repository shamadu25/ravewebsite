import { prisma } from "@/lib/prisma";

export interface AnalyticsSettings {
  /** Master switch. When false the collector accepts nothing. */
  enabled: boolean;
  /** Days raw events/pageviews/sessions are kept. Daily summaries are kept indefinitely. */
  rawRetentionDays: number;
  /** Look-back for last-touch attribution: a non-direct touch older than this no longer counts. */
  attributionWindowDays: number;
  /** "opt_out": track unless the visitor declines / DNT / GPC. "opt_in": track only after the visitor accepts. */
  consentMode: "opt_out" | "opt_in";
  excludedPaths: string[];
  /** Alert thresholds (percent change vs the previous equal period). */
  alertTrafficDropPct: number;
  alertTrafficSpikePct: number;
  alertFormFailurePct: number;
  alertConversionDropPct: number;
}

export const DEFAULT_SETTINGS: AnalyticsSettings = {
  enabled: true,
  rawRetentionDays: 180,
  attributionWindowDays: 90,
  consentMode: "opt_out",
  excludedPaths: ["/pay", "/admin"],
  alertTrafficDropPct: 40,
  alertTrafficSpikePct: 150,
  alertFormFailurePct: 20,
  alertConversionDropPct: 40,
};

const KEY = "analytics.settings";
let cache: { at: number; value: AnalyticsSettings } | null = null;

export function sanitizeSettings(input: Partial<AnalyticsSettings> & Record<string, unknown>): AnalyticsSettings {
  const d = DEFAULT_SETTINGS;
  const int = (v: unknown, min: number, max: number, fb: number) => (typeof v === "number" && Number.isFinite(v) ? Math.min(max, Math.max(min, Math.round(v))) : fb);
  return {
    enabled: typeof input.enabled === "boolean" ? input.enabled : d.enabled,
    rawRetentionDays: int(input.rawRetentionDays, 7, 1095, d.rawRetentionDays),
    attributionWindowDays: int(input.attributionWindowDays, 1, 365, d.attributionWindowDays),
    consentMode: input.consentMode === "opt_in" ? "opt_in" : "opt_out",
    excludedPaths: Array.isArray(input.excludedPaths) ? input.excludedPaths.filter((p): p is string => typeof p === "string" && p.startsWith("/")).slice(0, 50).map((p) => p.slice(0, 200)) : d.excludedPaths,
    alertTrafficDropPct: int(input.alertTrafficDropPct, 5, 100, d.alertTrafficDropPct),
    alertTrafficSpikePct: int(input.alertTrafficSpikePct, 20, 1000, d.alertTrafficSpikePct),
    alertFormFailurePct: int(input.alertFormFailurePct, 1, 100, d.alertFormFailurePct),
    alertConversionDropPct: int(input.alertConversionDropPct, 5, 100, d.alertConversionDropPct),
  };
}

export async function getSettings(fresh = false): Promise<AnalyticsSettings> {
  if (!fresh && cache && Date.now() - cache.at < 60_000) return cache.value;
  let value = DEFAULT_SETTINGS;
  try {
    const row = await prisma.systemSetting.findUnique({ where: { key: KEY } });
    if (row?.value && typeof row.value === "object") value = sanitizeSettings(row.value as Record<string, unknown>);
  } catch {
    /* defaults keep tracking alive if the settings read fails */
  }
  cache = { at: Date.now(), value };
  return value;
}

export async function saveSettings(patch: Partial<AnalyticsSettings>): Promise<AnalyticsSettings> {
  const next = sanitizeSettings({ ...(await getSettings(true)), ...patch });
  await prisma.systemSetting.upsert({ where: { key: KEY }, create: { key: KEY, value: next as never }, update: { value: next as never } });
  cache = { at: Date.now(), value: next };
  return next;
}
