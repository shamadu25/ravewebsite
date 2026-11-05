/** Stateful follow-up sequence rules (directive §7). Pure functions; DB + locks live in the caller. */
export interface SequenceStep { step: number; dayOffset: number; purpose: string }
/** Default cadence: day 1, 3-4, 7-8, 12-14, 20-21 — stored as the earliest day of each window. */
export const DEFAULT_STEPS: SequenceStep[] = [
  { step: 1, dayOffset: 0, purpose: "Initial personalised outreach" },
  { step: 2, dayOffset: 3, purpose: "First follow-up" },
  { step: 3, dayOffset: 7, purpose: "Additional business value" },
  { step: 4, dayOffset: 12, purpose: "Relevant use case" },
  { step: 5, dayOffset: 20, purpose: "Final polite follow-up" },
];

export type StopReason = "REPLIED" | "OPTED_OUT" | "UNSUBSCRIBED" | "HARD_BOUNCE" | "INVALID_CONTACT" | "CUSTOMER" | "SUPPRESSED" | "MAX_ATTEMPTS" | "CEO_OWNED" | "COMPLAINT";

export interface ProspectState {
  repliedNonAutomatic: boolean; optedOut: boolean; unsubscribed: boolean; hardBounced: boolean; contactInvalid: boolean;
  isCustomer: boolean; suppressed: boolean; complained: boolean; ceoOwned: boolean; stepsSent: number;
}

/** First matching stop condition, or null if the sequence may continue. Replies are checked before anything else. */
export function stopReason(s: ProspectState, maxSteps = DEFAULT_STEPS.length): StopReason | null {
  if (s.complained) return "COMPLAINT";
  if (s.repliedNonAutomatic) return "REPLIED";
  if (s.optedOut) return "OPTED_OUT";
  if (s.unsubscribed) return "UNSUBSCRIBED";
  if (s.hardBounced) return "HARD_BOUNCE";
  if (s.contactInvalid) return "INVALID_CONTACT";
  if (s.suppressed) return "SUPPRESSED";
  if (s.isCustomer) return "CUSTOMER";
  if (s.ceoOwned) return "CEO_OWNED";
  if (s.stepsSent >= maxSteps) return "MAX_ATTEMPTS";
  return null;
}

export interface SendWindow { startHour: number; endHour: number; days: number[] } // days: 0=Sun
export const BUSINESS_HOURS: SendWindow = { startHour: 9, endHour: 16, days: [1, 2, 3, 4, 5] };

function localParts(d: Date, tz: string) {
  const f = new Intl.DateTimeFormat("en-US", { timeZone: tz, hour: "numeric", hourCycle: "h23", weekday: "short", year: "numeric", month: "numeric", day: "numeric" }).formatToParts(d);
  const g = (t: string) => f.find((p) => p.type === t)!.value;
  return { hour: Number(g("hour")), dow: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(g("weekday")) };
}
export function inWindow(d: Date, tz: string, w: SendWindow = BUSINESS_HOURS, holidays: ReadonlySet<string> = new Set()): boolean {
  const p = localParts(d, tz);
  const iso = new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(d);
  return w.days.includes(p.dow) && p.hour >= w.startHour && p.hour < w.endHour && !holidays.has(iso);
}
/** Earliest instant >= `from` inside the recipient's local send window (hourly search, max 14 days). */
export function nextSendTime(from: Date, tz: string, w: SendWindow = BUSINESS_HOURS, holidays: ReadonlySet<string> = new Set()): Date {
  const t = new Date(Math.ceil(from.getTime() / 3600_000) * 3600_000);
  if (inWindow(from, tz, w, holidays)) return from;
  for (let i = 0; i < 24 * 14; i++, t.setTime(t.getTime() + 3600_000)) if (inWindow(t, tz, w, holidays)) return new Date(t);
  throw new Error(`No send window within 14 days for ${tz}`);
}
/** When step `n` becomes due, relative to when step 1 actually went out. */
export function stepDueAt(firstSentAt: Date, step: SequenceStep, tz: string, w?: SendWindow): Date {
  return nextSendTime(new Date(firstSentAt.getTime() + step.dayOffset * 86400_000), tz, w);
}
