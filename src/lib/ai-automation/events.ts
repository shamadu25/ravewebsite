/** Privacy-conscious funnel analytics: no IP, no cookies, no PII; anonymous per-tab session id; whitelisted event names. */
import { prisma } from "@/lib/prisma";

export const EVENT_NAMES = ["page_view", "industry_page_view", "assessment_start", "assessment_step", "industry_selected", "assessment_submit_attempt", "cta_click"] as const;
export type EventName = (typeof EVENT_NAMES)[number];

export function parseEvent(raw: unknown): { name: EventName; industrySlug: string | null; sessionId: string | null; step: number | null } | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.name !== "string" || !(EVENT_NAMES as readonly string[]).includes(r.name)) return null;
  const slug = typeof r.industry === "string" && /^[a-z0-9-]{2,80}$/.test(r.industry) ? r.industry : null;
  const session = typeof r.session === "string" && /^[A-Za-z0-9_-]{8,40}$/.test(r.session) ? r.session : null;
  const step = typeof r.step === "number" && Number.isInteger(r.step) && r.step >= 1 && r.step <= 6 ? r.step : null;
  return { name: r.name as EventName, industrySlug: slug, sessionId: session, step };
}

export async function recordEvent(e: NonNullable<ReturnType<typeof parseEvent>>) {
  await prisma.aiEvent.create({ data: { name: e.name, industrySlug: e.industrySlug, sessionId: e.sessionId, step: e.step } });
}
