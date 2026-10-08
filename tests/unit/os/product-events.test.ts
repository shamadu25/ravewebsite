/** @jest-environment node */
jest.mock("@/lib/prisma", () => ({ prisma: {} }));
import { ProductEvent } from "@/lib/os/products";

const base = { businessUnit: "CLIQPOS", type: "REGISTERED", externalId: "reg-1", userRef: "1" };

describe("ProductEvent schema (regression: backfill rejected most events)", () => {
  it.each(["2026-03-01T10:15:00+00:00", "2026-03-01T10:15:00Z", "2026-03-01T10:15:00.123Z", "2026-03-01T12:15:00+02:00"])("accepts timestamp %s", (t) => {
    expect(ProductEvent.safeParse({ ...base, occurredAt: t }).success).toBe(true);
  });
  it("accepts PHP-style period fields on a payment", () => {
    const r = ProductEvent.safeParse({ ...base, type: "PAYMENT", externalId: "sub-9", amountCents: 4900, periodMonths: 1, periodEndsAt: "2026-04-01T23:59:59+00:00", occurredAt: "2026-03-01T00:00:00+00:00" });
    expect(r.success).toBe(true);
  });
  it("drops a malformed email instead of rejecting the event", () => {
    const r = ProductEvent.safeParse({ ...base, email: "not-an-email" });
    expect(r.success).toBe(true);
    expect(r.success && r.data.email).toBeUndefined();
  });
  it("trims over-long names instead of rejecting", () => {
    const r = ProductEvent.safeParse({ ...base, name: "x".repeat(500) });
    expect(r.success && r.data.name?.length).toBe(200);
  });
  it("still rejects genuinely invalid events", () => {
    expect(ProductEvent.safeParse({ ...base, type: "NOPE" }).success).toBe(false);
    expect(ProductEvent.safeParse({ ...base, occurredAt: "yesterday" }).success).toBe(false);
    expect(ProductEvent.safeParse({ ...base, externalId: "" }).success).toBe(false);
    expect(ProductEvent.safeParse({ ...base, type: "PAYMENT", amountCents: -5 }).success).toBe(false);
  });
});
