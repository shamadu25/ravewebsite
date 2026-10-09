/** @jest-environment node */
process.env.ADMIN_SESSION_SECRET = "test-secret-for-signing";
jest.mock("@/lib/prisma", () => ({ prisma: {} }));
import { bouncedRecipient, classifyEmail, extractReplyText, makeMessageId, normaliseMessageId, signUnsubscribe, unsubscribeUrl, verifyUnsubscribe } from "@/lib/os/email-utils";

describe("unsubscribe tokens", () => {
  it("verify for the right deal+address and fail for anything else", () => {
    const t = signUnsubscribe(7, "Owner@Clinic.com");
    expect(verifyUnsubscribe(7, "owner@clinic.com", t)).toBe(true); // case-insensitive address
    expect(verifyUnsubscribe(8, "owner@clinic.com", t)).toBe(false);
    expect(verifyUnsubscribe(7, "someone@else.com", t)).toBe(false);
    expect(verifyUnsubscribe(7, "owner@clinic.com", "x".repeat(32))).toBe(false);
    expect(verifyUnsubscribe(7, "owner@clinic.com", "short")).toBe(false);
  });
  it("builds a link carrying the signed token", () => {
    expect(unsubscribeUrl(7, "a@b.com")).toMatch(/\/api\/os\/unsubscribe\?o=7&a=a%40b\.com&t=[a-f0-9]{32}$/);
  });
});

describe("reply text extraction", () => {
  it("keeps what the prospect wrote and drops quoted history", () => {
    const r = extractReplyText("Yes please, call me Tuesday.\n\nThanks\nAma\n\nOn Wed, 7 Oct 2026 at 10:00, RaveSoft <info@ravesoftsolutions.com> wrote:\n> Would a 15-minute walkthrough help?\n> Best regards");
    expect(r).toBe("Yes please, call me Tuesday.\n\nThanks\nAma");
  });
  it("drops > quoted lines and Outlook-style separators", () => {
    expect(extractReplyText("Interested.\n> old text\n-----Original Message-----\nFrom: x@y.com")).toBe("Interested.");
  });
  it("caps very long replies", () => expect(extractReplyText("a".repeat(5000)).length).toBe(2000));
});

describe("email classification", () => {
  it("detects bounces, auto-replies and normal mail", () => {
    expect(classifyEmail({ from: "MAILER-DAEMON@mail.x.com", subject: "Undelivered Mail Returned to Sender" })).toBe("BOUNCE");
    expect(classifyEmail({ from: "a@b.com", subject: "Out of office: back Monday" })).toBe("AUTO_REPLY");
    expect(classifyEmail({ from: "a@b.com", subject: "Re: hi", autoSubmitted: "auto-replied" })).toBe("AUTO_REPLY");
    expect(classifyEmail({ from: "a@b.com", subject: "Re: hi", precedence: "bulk" })).toBe("AUTO_REPLY");
    expect(classifyEmail({ from: "a@b.com", subject: "Re: your proposal", autoSubmitted: "no" })).toBe("NORMAL");
  });
  it("finds the failed recipient only if it is a known prospect", () => {
    const known = new Set(["owner@clinic.com"]);
    expect(bouncedRecipient("Final-Recipient: rfc822; owner@clinic.com\nAction: failed", known)).toBe("owner@clinic.com");
    expect(bouncedRecipient("Could not deliver to <owner@clinic.com>", known)).toBe("owner@clinic.com");
    expect(bouncedRecipient("Final-Recipient: rfc822; stranger@else.com", known)).toBeNull();
  });
});

describe("message ids", () => {
  it("are unique, on the sender's domain, and normalise for matching", () => {
    const a = makeMessageId(5, "info@ravesoftsolutions.com"), b = makeMessageId(5, "info@ravesoftsolutions.com");
    expect(a).not.toBe(b);
    expect(a).toMatch(/^<os-5-[a-z0-9]+@ravesoftsolutions\.com>$/);
    expect(normaliseMessageId(a)).toBe(a.slice(1, -1));
  });
});
