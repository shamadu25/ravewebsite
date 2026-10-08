/** @jest-environment node */
import { monthlyCents, monthsBetween, mrrCentsAt, type RecurringEntry } from "@/lib/os/mrr";

const d = (s: string) => new Date(s + "T00:00:00Z");
const e = (amountUsd: number, periodMonths: number, from: string, to: string | null): RecurringEntry => ({ kind: "RECURRING", amountCents: amountUsd * 100, periodMonths, occurredAt: d(from), recurringEndsAt: to ? d(to) : null });

describe("MRR from recurring ledger entries", () => {
  it("does not stack monthly renewals: only the live period counts", () => {
    const jan = e(49, 1, "2026-01-01", "2026-02-01"), feb = e(49, 1, "2026-02-01", "2026-03-01"), mar = e(49, 1, "2026-03-01", "2026-04-01");
    expect(mrrCentsAt([jan, feb, mar], d("2026-03-15"))).toBe(4900);
  });
  it("normalises an annual plan to its monthly value", () => {
    expect(mrrCentsAt([e(588, 12, "2026-01-01", "2027-01-01")], d("2026-06-01"))).toBe(4900);
    expect(monthlyCents({ amountCents: 58800, periodMonths: 12 })).toBe(4900);
  });
  it("stops counting a lapsed plan and a not-yet-started one", () => {
    const lapsed = e(49, 1, "2026-01-01", "2026-02-01"), future = e(49, 1, "2026-06-01", "2026-07-01");
    expect(mrrCentsAt([lapsed, future], d("2026-03-01"))).toBe(0);
  });
  it("ignores one-time entries", () => {
    expect(mrrCentsAt([{ ...e(500, 1, "2026-01-01", null), kind: "ONE_TIME" }], d("2026-03-01"))).toBe(0);
  });
  it("sums different customers' live plans", () => {
    expect(mrrCentsAt([e(49, 1, "2026-03-01", "2026-04-01"), e(99, 1, "2026-03-05", "2026-04-05")], d("2026-03-10"))).toBe(14800);
  });
  it("infers billing period from subscription dates", () => {
    expect(monthsBetween(d("2026-01-01"), d("2026-02-01"))).toBe(1);
    expect(monthsBetween(d("2026-01-01"), d("2027-01-01"))).toBe(12);
    expect(monthsBetween(d("2026-01-01"), d("2026-01-08"))).toBe(1);
  });
});
