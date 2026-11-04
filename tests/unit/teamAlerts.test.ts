const prismaMock = { conversionEvent: { findFirst: jest.fn(), create: jest.fn().mockResolvedValue({}) }, contact: { findUnique: jest.fn().mockResolvedValue(null) } };
jest.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
const mail = jest.fn().mockResolvedValue(undefined);
jest.mock("@/lib/mail/notifications", () => ({ sendChatActivityNotification: (...a: unknown[]) => mail(...a) }));

import { alertDue, alertTeam, WAITING_ALERT_GAP_MS } from "@/lib/services/teamAlerts";

const input = { conversationId: 1, externalId: "e1", contactId: null, page: "/", message: "hi" };
beforeEach(() => { jest.clearAllMocks(); prismaMock.conversionEvent.findFirst.mockResolvedValue(null); });

describe("alertDue", () => {
  it("new_chat fires once per conversation", async () => {
    expect(await alertDue(1, "new_chat")).toBe(true);
    prismaMock.conversionEvent.findFirst.mockResolvedValue({ occurredAt: new Date(0) });
    expect(await alertDue(1, "new_chat", Date.now())).toBe(false);
  });
  it("visitor_waiting is throttled to one per gap", async () => {
    const t = Date.now();
    prismaMock.conversionEvent.findFirst.mockResolvedValue({ occurredAt: new Date(t - 60_000) });
    expect(await alertDue(1, "visitor_waiting", t)).toBe(false);
    prismaMock.conversionEvent.findFirst.mockResolvedValue({ occurredAt: new Date(t - WAITING_ALERT_GAP_MS - 1) });
    expect(await alertDue(1, "visitor_waiting", t)).toBe(true);
  });
});

describe("alertTeam", () => {
  it("records the alert event and emails", async () => {
    expect(await alertTeam("new_chat", input)).toBe(true);
    expect(prismaMock.conversionEvent.create.mock.calls[0][0].data.eventType).toBe("team_alert_new_chat");
    expect(mail).toHaveBeenCalledTimes(1);
  });
  it("sends nothing when throttled", async () => {
    prismaMock.conversionEvent.findFirst.mockResolvedValue({ occurredAt: new Date() });
    expect(await alertTeam("new_chat", input)).toBe(false);
    expect(mail).not.toHaveBeenCalled();
  });
  it("never throws if email fails or the DB errors", async () => {
    mail.mockRejectedValueOnce(new Error("smtp"));
    await expect(alertTeam("new_chat", input)).resolves.toBe(true);
    prismaMock.conversionEvent.findFirst.mockRejectedValueOnce(new Error("db"));
    await expect(alertTeam("new_chat", input)).resolves.toBe(false);
  });
});
