/** @jest-environment node */
const mockPrisma: any = {
  osOutreach: { findUniqueOrThrow: jest.fn(), update: jest.fn().mockResolvedValue({}), findFirst: jest.fn().mockResolvedValue(null) },
  osOpportunity: { update: jest.fn(), findUnique: jest.fn().mockResolvedValue({ id: 5, stage: "RESEARCHED" }) },
  osActivity: { create: jest.fn() },
  osOptOut: { findFirst: jest.fn() },
  systemSetting: { findUnique: jest.fn() },
};
jest.mock("@/lib/prisma", () => ({ prisma: mockPrisma }));
jest.mock("@/lib/os/audit", () => ({ audit: jest.fn().mockResolvedValue(undefined) }));
const send = jest.fn();
let connected = true;
jest.mock("@/lib/os/channels", () => ({ getChannelAdapter: () => ({ send, status: () => ({ connected }) }) }));
jest.mock("@/lib/os/crm", () => ({ logActivity: jest.fn(), setStage: jest.fn() }));

import { sendOutreach } from "@/lib/os/outreach";

const actor = { actor: "tester", actorType: "HUMAN" as const };
const msg = (over: Record<string, unknown> = {}) => ({ id: 1, orgId: "ravesoft", opportunityId: 5, channel: "EMAIL", toAddress: "Owner@Clinic.com", subject: "s", body: "b", status: "DRAFT", approvalId: null, ...over });
const finalStatus = () => mockPrisma.osOutreach.update.mock.calls.at(-1)[0].data.status;

beforeEach(() => {
  jest.clearAllMocks();
  connected = true;
  mockPrisma.systemSetting.findUnique.mockResolvedValue(null);
  mockPrisma.osOptOut.findFirst.mockResolvedValue(null);
  mockPrisma.osOutreach.findUniqueOrThrow.mockResolvedValue(msg());
});

describe("sendOutreach", () => {
  it("sends and records SENT only when the adapter confirms", async () => {
    send.mockResolvedValue({ ok: true, providerRef: "abc" });
    expect((await sendOutreach(1, actor)).status).toBe("SENT");
    expect(finalStatus()).toBe("SENT");
  });
  it("never sends to an opted-out address", async () => {
    mockPrisma.osOptOut.findFirst.mockResolvedValue({ id: 1 });
    expect((await sendOutreach(1, actor)).status).toBe("BLOCKED");
    expect(send).not.toHaveBeenCalled();
    expect(mockPrisma.osOptOut.findFirst.mock.calls[0][0].where.address.in).toContain("owner@clinic.com");
  });
  it("honours the global outbound pause", async () => {
    mockPrisma.systemSetting.findUnique.mockResolvedValue({ value: true });
    expect((await sendOutreach(1, actor)).status).toBe("BLOCKED");
    expect(send).not.toHaveBeenCalled();
  });
  it("reports failure honestly when the channel is not connected", async () => {
    send.mockResolvedValue({ ok: false, notConnected: true, error: "WHATSAPP integration is not connected." });
    const r = await sendOutreach(1, actor);
    expect(r).toMatchObject({ status: "FAILED", notConnected: true });
    expect(finalStatus()).toBe("FAILED");
  });
  it("blocks when the prospect has no address", async () => {
    mockPrisma.osOutreach.findUniqueOrThrow.mockResolvedValue(msg({ toAddress: null }));
    expect((await sendOutreach(1, actor)).status).toBe("BLOCKED");
    expect(send).not.toHaveBeenCalled();
  });
  it("is idempotent for already-sent messages", async () => {
    mockPrisma.osOutreach.findUniqueOrThrow.mockResolvedValue(msg({ status: "SENT" }));
    await sendOutreach(1, actor);
    expect(send).not.toHaveBeenCalled();
  });
});

describe("email compliance headers", () => {
  it("adds a one-click unsubscribe link, our own Message-ID and a footer on every email", async () => {
    process.env.ADMIN_SESSION_SECRET = "s"; process.env.SMTP_USER = "info@ravesoftsolutions.com";
    send.mockResolvedValue({ ok: true, providerRef: "x" });
    await sendOutreach(1, actor);
    const m = send.mock.calls.at(-1)[0];
    expect(m.unsubscribeUrl).toMatch(/\/api\/os\/unsubscribe\?o=5&/);
    expect(m.messageId).toMatch(/^<os-1-[a-z0-9]+@ravesoftsolutions\.com>$/);
    expect(m.body).toMatch(/Unsubscribe: https?:\/\//);
  });
  it("threads a follow-up onto the previous sent email", async () => {
    mockPrisma.osOutreach.findFirst.mockResolvedValueOnce({ providerRef: "<os-0-abc@ravesoftsolutions.com>" });
    send.mockResolvedValue({ ok: true, providerRef: "y" });
    await sendOutreach(1, actor);
    expect(send.mock.calls.at(-1)[0].inReplyTo).toBe("<os-0-abc@ravesoftsolutions.com>");
  });
});
