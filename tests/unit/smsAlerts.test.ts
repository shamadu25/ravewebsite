/** @jest-environment node */
const send = jest.fn();
const status = jest.fn();
jest.mock("@/lib/os/channels", () => ({ getChannelAdapter: () => ({ status: () => status(), send: (m: unknown) => send(m) }) }));
const count = jest.fn();
jest.mock("@/lib/prisma", () => ({ prisma: { osAuditLog: { count: (...a: unknown[]) => count(...a) } } }));
const audit = jest.fn().mockResolvedValue(undefined);
jest.mock("@/lib/os/audit", () => ({ audit: (...a: unknown[]) => audit(...a) }));

import { alertNumbers, buildAlertSms, dailyCap, enabledEvents, maskNumber, sendSmsAlert, smsSafe } from "@/lib/sms/alerts";

const ENV = { ...process.env };
beforeEach(() => {
  jest.clearAllMocks();
  process.env = { ...ENV };
  delete process.env.SMS_ALERT_EVENTS;
  delete process.env.SMS_DAILY_CAP;
  process.env.SMS_ALERT_NUMBERS = "+233531561484, +233 20 123 4567";
  status.mockReturnValue({ connected: true });
  count.mockResolvedValue(0);
  send.mockResolvedValue({ ok: true, providerRef: "SM1" });
});
afterAll(() => {
  process.env = ENV;
});

describe("configuration parsing", () => {
  it("normalises numbers, drops junk, de-duplicates and caps at 5", () => {
    expect(alertNumbers("+233531561484, (233) 20-123-4567 ,+233531561484, abc, +12")).toEqual(["+233531561484", "+233201234567"]);
    expect(alertNumbers("")).toEqual([]);
    delete process.env.SMS_ALERT_NUMBERS; // no argument → reads the environment
    expect(alertNumbers()).toEqual([]);
    expect(alertNumbers("+2335000000001,+2335000000002,+2335000000003,+2335000000004,+2335000000005,+2335000000006")).toHaveLength(5);
  });

  it("defaults to the three urgent events and lets new_chat be opted in", () => {
    expect(enabledEvents(undefined)).toEqual(["human_handoff", "visitor_waiting", "hot_lead"]);
    expect(enabledEvents("new_chat, HOT_LEAD, bogus")).toEqual(["new_chat", "hot_lead"]);
  });

  it("reads the daily cap defensively", () => {
    expect(dailyCap(undefined)).toBe(40);
    expect(dailyCap("15")).toBe(15);
    expect(dailyCap("-1")).toBe(40);
    expect(dailyCap("lots")).toBe(40);
  });

  it("masks numbers", () => {
    expect(maskNumber("+233531561484")).toBe("+233•••484");
  });
});

describe("message text", () => {
  it("keeps SMS in plain ASCII", () => {
    expect(smsSafe("Café “wow” — Akwaaba… 🙂")).toBe('Cafe "wow" - Akwaaba...');
  });

  it("includes the label, name, detail and link, within ~2 segments", () => {
    const text = buildAlertSms("visitor_waiting", { name: "Kofi Mensah", detail: "Can I get a quote for 3 pharmacies?", path: "/admin/conversations/abc-123" });
    expect(text).toContain("Visitor waiting - Kofi Mensah");
    expect(text).toContain('"Can I get a quote for 3 pharmacies?"');
    expect(text).toMatch(/https:\/\/[^\s]+\/admin\/conversations\/abc-123$/);
    expect(text.length).toBeLessThanOrEqual(310);
  });

  it("trims a long message but never loses the link", () => {
    const text = buildAlertSms("human_handoff", { name: "A".repeat(200), detail: "x".repeat(2000), path: "/admin/conversations/11111111-1111-4111-8111-111111111111" });
    expect(text.length).toBeLessThanOrEqual(330);
    expect(text).toContain("/admin/conversations/11111111-1111-4111-8111-111111111111");
    expect(text).toContain("...");
  });

  it("flags hot leads with the score", () => {
    const text = buildAlertSms("hot_lead", { name: "Ama", extra: "score 91", path: "/admin/leads/7" });
    expect(text).toContain("HOT LEAD - Ama - score 91");
  });

  it("never contains non-ASCII characters", () => {
    expect(buildAlertSms("new_chat", { name: "Zoë 😀", detail: "Où êtes-vous ? ça marche", path: "/x" })).toMatch(/^[\x20-\x7E\n]+$/);
  });
});

describe("sendSmsAlert", () => {
  it("texts every configured number and records one audit row per message", async () => {
    const r = await sendSmsAlert("human_handoff", { name: "Kofi", detail: "wants a human", path: "/admin/conversations/a" });
    expect(r).toEqual({ sent: 2, failed: 0 });
    expect(send).toHaveBeenCalledTimes(2);
    expect(send.mock.calls.map((c) => c[0].to)).toEqual(["+233531561484", "+233201234567"]);
    expect(audit).toHaveBeenCalledTimes(2);
    expect(audit.mock.calls[0][0]).toMatchObject({ action: "sms.alert", resourceId: "human_handoff" });
  });

  it("does nothing for events that are not enabled (new_chat is opt-in)", async () => {
    expect(await sendSmsAlert("new_chat", { path: "/x" })).toMatchObject({ sent: 0, skipped: "event not enabled" });
    process.env.SMS_ALERT_EVENTS = "new_chat";
    expect((await sendSmsAlert("new_chat", { path: "/x" })).sent).toBe(2);
  });

  it("skips quietly when unconfigured or the provider is not connected", async () => {
    process.env.SMS_ALERT_NUMBERS = "";
    expect(await sendSmsAlert("hot_lead", { path: "/x" })).toMatchObject({ skipped: "no SMS_ALERT_NUMBERS" });
    process.env.SMS_ALERT_NUMBERS = "+233531561484";
    status.mockReturnValue({ connected: false });
    expect(await sendSmsAlert("hot_lead", { path: "/x" })).toMatchObject({ skipped: "SMS provider not connected" });
    expect(send).not.toHaveBeenCalled();
  });

  it("stops at the rolling daily cap, and only sends what the cap still allows", async () => {
    process.env.SMS_DAILY_CAP = "10";
    count.mockResolvedValue(10);
    expect(await sendSmsAlert("hot_lead", { path: "/x" })).toMatchObject({ sent: 0, skipped: "daily cap reached" });
    count.mockResolvedValue(9);
    const r = await sendSmsAlert("hot_lead", { path: "/x" });
    expect(r.sent).toBe(1);
    expect(send).toHaveBeenCalledTimes(1);
  });

  it("one failing number does not stop the others, and only successes count toward the cap", async () => {
    send.mockResolvedValueOnce({ ok: false, error: "invalid number" }).mockResolvedValueOnce({ ok: true, providerRef: "SM2" });
    const spy = jest.spyOn(console, "error").mockImplementation(() => undefined);
    const r = await sendSmsAlert("hot_lead", { path: "/x" });
    expect(r).toEqual({ sent: 1, failed: 1 });
    expect(audit).toHaveBeenCalledTimes(1);
    spy.mockRestore();
  });

  it("never throws into the caller", async () => {
    count.mockRejectedValue(new Error("db down"));
    const spy = jest.spyOn(console, "error").mockImplementation(() => undefined);
    await expect(sendSmsAlert("hot_lead", { path: "/x" })).resolves.toMatchObject({ sent: 0, skipped: "error" });
    spy.mockRestore();
  });
});
