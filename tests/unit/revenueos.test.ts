/** @jest-environment node */
import { scoreLead, classify } from "@/lib/revenueos/scoring";
import { classifyReply } from "@/lib/revenueos/reply-labels";
import { stopReason, nextSendTime, inWindow, stepDueAt, DEFAULT_STEPS, type ProspectState } from "@/lib/revenueos/sequence";
import { encryptSecret, decryptSecret } from "@/lib/revenueos/crypto";

const clear: ProspectState = { repliedNonAutomatic: false, optedOut: false, unsubscribed: false, hardBounced: false, contactInvalid: false, isCustomer: false, suppressed: false, complained: false, ceoOwned: false, stepsSent: 1 };

describe("lead scoring", () => {
  it("gives zero for missing evidence", () => {
    const r = scoreLead({});
    expect(r.total).toBe(0); expect(r.priority).toBe("REJECT"); expect(r.autoOutreachEligible).toBe(false);
  });
  it("ignores a claimed fraction without evidence", () => {
    expect(scoreLead({ productFit: { fraction: 1, evidence: "  " } }).total).toBe(0);
  });
  it("sums to 100 and classifies A", () => {
    const f = (e: string) => ({ fraction: 1, evidence: e });
    const r = scoreLead({ productFit: f("a"), operationalOpportunity: f("b"), commercialFit: f("c"), decisionMaker: f("d"), buyingSignals: f("e"), verifiedContact: f("f"), geography: f("g") });
    expect(r.total).toBe(100); expect(r.priority).toBe("A");
  });
  it("applies thresholds, which are configurable", () => {
    expect(classify(84)).toBe("B"); expect(classify(70)).toBe("B"); expect(classify(69)).toBe("C"); expect(classify(49)).toBe("REJECT");
    expect(classify(60, { a: 90, b: 60, c: 40 })).toBe("B");
  });
});

describe("reply classification", () => {
  it("never treats out-of-office as interest", () => {
    const r = classifyReply("I am out of office until Monday. I'm interested in pricing when back.");
    expect(r.label).toBe("OUT_OF_OFFICE"); expect(r.genuineInterest).toBe(false); expect(r.stopSequence).toBe(false);
  });
  it("detects pricing, meeting, info", () => {
    expect(classifyReply("How much does it cost?").label).toBe("PRICING");
    expect(classifyReply("Can we schedule a meeting next week?").label).toBe("MEETING");
    expect(classifyReply("Can you send more information?").label).toBe("INFO_REQUEST");
  });
  it("suppresses on unsubscribe and complaint", () => {
    expect(classifyReply("Please remove me from your list")).toMatchObject({ label: "UNSUBSCRIBE", suppress: true, stopSequence: true });
    expect(classifyReply("This is spam, I am reporting you")).toMatchObject({ label: "COMPLAINT", suppress: true });
  });
  it("parses future follow-up month", () => {
    const r = classifyReply("Please contact me in January.", new Date("2026-11-05T00:00:00Z"));
    expect(r.label).toBe("NOT_NOW"); expect(r.followUpAfter?.toISOString()).toBe("2027-01-01T00:00:00.000Z");
  });
  it("ignores quoted history", () => {
    expect(classifyReply("Thanks\n> not interested earlier text").label).toBe("UNKNOWN");
  });
});

describe("sequence", () => {
  it("replies take precedence and stop the sequence", () => {
    expect(stopReason({ ...clear, repliedNonAutomatic: true, hardBounced: true })).toBe("REPLIED");
    expect(stopReason(clear)).toBeNull();
    expect(stopReason({ ...clear, stepsSent: 5 })).toBe("MAX_ATTEMPTS");
    expect(stopReason({ ...clear, ceoOwned: true })).toBe("CEO_OWNED");
  });
  it("respects local business hours across timezones", () => {
    const t = new Date("2026-11-04T23:00:00Z"); // Wed 23:00 UTC = Thu 00:00 Lagos(+1)
    expect(inWindow(t, "UTC")).toBe(false);
    const n = nextSendTime(t, "Africa/Lagos");
    expect(inWindow(n, "Africa/Lagos")).toBe(true);
    expect(nextSendTime(new Date("2026-11-07T10:00:00Z"), "UTC").getUTCDay()).toBe(1); // Saturday -> Monday
  });
  it("skips configured holidays", () => {
    const n = nextSendTime(new Date("2026-11-04T10:00:00Z"), "UTC", undefined, new Set(["2026-11-04"]));
    expect(n.toISOString().slice(0, 10)).toBe("2026-11-05");
  });
  it("schedules follow-ups relative to first send", () => {
    const d = stepDueAt(new Date("2026-11-02T10:00:00Z"), DEFAULT_STEPS[1], "UTC");
    expect(d.toISOString()).toBe("2026-11-05T10:00:00.000Z");
  });
});

describe("credential encryption", () => {
  beforeAll(() => { process.env.ENCRYPTION_KEY = Buffer.alloc(32, 7).toString("base64"); });
  it("round-trips and is non-deterministic", () => {
    const a = encryptSecret("sk-secret"), b = encryptSecret("sk-secret");
    expect(a).not.toBe(b); expect(a).not.toContain("sk-secret"); expect(decryptSecret(a)).toBe("sk-secret");
  });
  it("rejects tampering", () => {
    const a = encryptSecret("x"); const p = a.split(":"); p[3] = Buffer.from("zz").toString("base64");
    expect(() => decryptSecret(p.join(":"))).toThrow();
  });
  it("fails closed without a key", () => { delete process.env.ENCRYPTION_KEY; expect(() => encryptSecret("x")).toThrow(/ENCRYPTION_KEY/); });
});
