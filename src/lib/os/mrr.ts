/**
 * Recurring-revenue maths. A recurring ledger entry is the cash for ONE billing period
 * (amountCents covers `periodMonths` months) that is "live" from occurredAt until recurringEndsAt.
 * Normalising to a monthly figure keeps annual plans from inflating MRR, and bounded windows keep
 * renewals from stacking (each renewal's window starts where the last one ends).
 */
export interface RecurringEntry {
  kind: string;
  amountCents: number;
  periodMonths: number;
  occurredAt: Date;
  recurringEndsAt: Date | null;
}

export const monthlyCents = (e: Pick<RecurringEntry, "amountCents" | "periodMonths">): number => e.amountCents / Math.max(1, e.periodMonths || 1);

export const isLiveAt = (e: RecurringEntry, at: Date): boolean => e.kind === "RECURRING" && e.occurredAt <= at && (!e.recurringEndsAt || e.recurringEndsAt > at);

export function mrrCentsAt<T extends RecurringEntry>(entries: T[], at: Date): number {
  return Math.round(entries.filter((e) => isLiveAt(e, at)).reduce((n, e) => n + monthlyCents(e), 0));
}

/** Months between two dates, rounded, min 1 — used to infer a billing period from a subscription's start/end. */
export function monthsBetween(start: Date, end: Date): number {
  return Math.max(1, Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 30.4375)));
}
