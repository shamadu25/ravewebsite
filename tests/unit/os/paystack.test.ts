/** @jest-environment node */
process.env.ADMIN_SESSION_SECRET = "pay-test-secret";
process.env.PAYSTACK_SECRET_KEY = "sk_test_abc";
jest.mock("@/lib/prisma", () => ({ prisma: {} }));
import { createHmac } from "crypto";
import { fromChargeMinor, paystackInterval, toChargeMinor, verifyPaystackSignature } from "@/lib/os/paystack";
import { signPayToken, verifyPayToken } from "@/lib/os/payments";

describe("Paystack webhook signature (HMAC-SHA512)", () => {
  const body = JSON.stringify({ event: "charge.success", data: { reference: "r1" } });
  const sig = createHmac("sha512", "sk_test_abc").update(body).digest("hex");
  it("accepts the genuine signature and rejects tampering or absence", () => {
    expect(verifyPaystackSignature(body, sig)).toBe(true);
    expect(verifyPaystackSignature(body + " ", sig)).toBe(false);
    expect(verifyPaystackSignature(body, sig.replace(/^./, "0"))).toBe(false);
    expect(verifyPaystackSignature(body, null)).toBe(false);
    expect(verifyPaystackSignature(body, "short")).toBe(false);
  });
});

describe("pay link tokens", () => {
  it("round-trip, and any change invalidates them", () => {
    const t = signPayToken(42, "dental-employee-monthly");
    expect(verifyPayToken(t)).toEqual({ opportunityId: 42, planKey: "dental-employee-monthly" });
    const [body, sig] = t.split(".");
    expect(verifyPayToken(`${Buffer.from("43|dental-employee-monthly").toString("base64url")}.${sig}`)).toBeNull();
    expect(verifyPayToken(`${body}.${"0".repeat(sig.length)}`)).toBeNull();
    expect(verifyPayToken("garbage")).toBeNull();
    expect(verifyPayToken("")).toBeNull();
  });
});

describe("currency conversion (USD ledger ↔ charge currency)", () => {
  const OLD = process.env.PAYSTACK_FX_RATE;
  afterEach(() => { process.env.PAYSTACK_FX_RATE = OLD; });
  it("is identity at rate 1", () => { process.env.PAYSTACK_FX_RATE = "1"; expect(toChargeMinor(12500)).toBe(12500); expect(fromChargeMinor(12500)).toBe(12500); });
  it("converts and round-trips at another rate (e.g. USD→GHS)", () => {
    process.env.PAYSTACK_FX_RATE = "15.5";
    expect(toChargeMinor(12500)).toBe(193750);          // $125 → GHS 1,937.50 in pesewas
    expect(fromChargeMinor(193750)).toBe(12500);
  });
  it("maps billing periods to Paystack intervals and rejects odd ones", () => {
    expect([1, 3, 6, 12].map(paystackInterval)).toEqual(["monthly", "quarterly", "biannually", "annually"]);
    expect(paystackInterval(2)).toBeNull();
  });
});
