/** @jest-environment node */
import { DEFAULT_FOLLOWUP, nextFollowup, stopReason, type FollowupState } from "@/lib/ai-automation/followup";
import { signToken, verifyToken } from "@/lib/ai-automation/tokens";

const DAY = 86_400_000;
const sentAt = new Date("2026-02-01T09:00:00Z");
const at = (days: number) => new Date(sentAt.getTime() + days * DAY + 1000);
const state = (o: Partial<FollowupState> = {}): FollowupState => ({ proposalStatus: "SENT", sentAt, validUntil: new Date(sentAt.getTime() + 30 * DAY), emailOptOut: false, followupsStopped: false, customerReplied: false, attemptsSent: 0, stepsDone: [], ...o });

describe("follow-up scheduling (day 2 / 5 / 10 default)", () => {
  it("is not due before day 2, due at day 2", () => {
    expect(nextFollowup(state(), DEFAULT_FOLLOWUP, at(1)).due).toBeNull();
    const d = nextFollowup(state(), DEFAULT_FOLLOWUP, at(2)).due!;
    expect(d.stepIndex).toBe(0); expect(d.step.templateKey).toBe("followup_check_in");
  });
  it("moves on to day 5 then day 10 as steps complete", () => {
    expect(nextFollowup(state({ stepsDone: [0], attemptsSent: 1 }), DEFAULT_FOLLOWUP, at(4)).due).toBeNull();
    expect(nextFollowup(state({ stepsDone: [0], attemptsSent: 1 }), DEFAULT_FOLLOWUP, at(5)).due!.step.templateKey).toBe("followup_benefits");
    expect(nextFollowup(state({ stepsDone: [0, 1], attemptsSent: 2 }), DEFAULT_FOLLOWUP, at(10)).due!.step.templateKey).toBe("followup_invite");
  });
  it("stops after the maximum attempts and when all steps are done", () => {
    expect(nextFollowup(state({ attemptsSent: 3, stepsDone: [0, 1, 2] }), DEFAULT_FOLLOWUP, at(30)).due).toBeNull();
    expect(nextFollowup(state({ attemptsSent: 1 }), { ...DEFAULT_FOLLOWUP, maxAttempts: 1 }, at(30)).due).toBeNull();
  });
  it("honours configured delays and templates", () => {
    const cfg = { ...DEFAULT_FOLLOWUP, steps: [{ delayDays: 1, templateKey: "followup_invite" }] };
    expect(nextFollowup(state(), cfg, at(1)).due!.step.templateKey).toBe("followup_invite");
  });
});

describe("follow-up stop conditions", () => {
  it.each([
    ["customer opts out", { emailOptOut: true }, "OPT_OUT"],
    ["customer declines", { proposalStatus: "DECLINED" }, "DECLINED"],
    ["customer accepts", { proposalStatus: "ACCEPTED" }, "ACCEPTED"],
    ["proposal expires (status)", { proposalStatus: "EXPIRED" }, "EXPIRED"],
    ["administrator stops the sequence", { followupsStopped: true }, "ADMIN_STOPPED"],
    ["staff record that the customer replied", { customerReplied: true }, "CUSTOMER_REPLIED"],
  ])("stops when %s", (_n, patch, reason) => {
    expect(stopReason(state(patch), DEFAULT_FOLLOWUP, at(3))).toBe(reason);
    expect(nextFollowup(state(patch), DEFAULT_FOLLOWUP, at(10)).due).toBeNull();
  });
  it("stops once validUntil has passed", () => {
    expect(stopReason(state({ validUntil: new Date(sentAt.getTime() + DAY) }), DEFAULT_FOLLOWUP, at(5))).toBe("EXPIRED");
  });
  it("opt-out always stops, even if the admin removed it from the configured conditions", () => {
    expect(stopReason(state({ emailOptOut: true }), { ...DEFAULT_FOLLOWUP, stopConditions: [] }, at(3))).toBe("OPT_OUT");
  });
  it("does not assume the customer has not replied: 'replied' is an explicit manual flag, and can be configured off", () => {
    expect(stopReason(state(), DEFAULT_FOLLOWUP, at(3))).toBeNull();
    expect(stopReason(state({ customerReplied: true }), { ...DEFAULT_FOLLOWUP, stopConditions: ["OPT_OUT"] }, at(3))).toBeNull();
  });
  it("never follows up proposals that are not SENT (drafts, rejected, awaiting re-approval)", () => {
    for (const s of ["DRAFT", "REJECTED", "AWAITING_APPROVAL", "MANUAL_REVIEW"]) expect(nextFollowup(state({ proposalStatus: s }), DEFAULT_FOLLOWUP, at(10)).due).toBeNull();
  });
});

describe("signed links", () => {
  beforeAll(() => { process.env.AI_AUTOMATION_LINK_SECRET = "unit-test-secret"; });
  it("round-trips and carries no personal data", () => {
    const t = signToken("proposal", 42, 30);
    expect(verifyToken(t, "proposal")).toMatchObject({ k: "proposal", id: 42 });
    expect(Buffer.from(t.split(".")[0], "base64url").toString()).not.toMatch(/@|name|email/i);
  });
  it("rejects tampering, the wrong kind, expiry and garbage", () => {
    const t = signToken("proposal", 42, 30);
    const [p, s] = t.split(".");
    const forged = Buffer.from(JSON.stringify({ k: "proposal", id: 43, exp: 9999999999 })).toString("base64url");
    expect(verifyToken(`${forged}.${s}`, "proposal")).toBeNull();
    expect(verifyToken(`${p}.${s.slice(1)}x`, "proposal")).toBeNull();
    expect(verifyToken(t, "optout")).toBeNull();
    expect(verifyToken(signToken("proposal", 1, 1, Date.now() - 3 * DAY), "proposal")).toBeNull();
    for (const bad of ["", "abc", "a.b", null, undefined, "x".repeat(500)]) expect(verifyToken(bad as string, "proposal")).toBeNull();
  });
});
