import { AiProviderUnavailableError } from "@/lib/ai/providers/types";

const prismaMock = {
  message: { create: jest.fn().mockResolvedValue({}), findMany: jest.fn().mockResolvedValue([{ role: "visitor", content: "hello" }]) },
  conversation: { update: jest.fn().mockResolvedValue({}), findUnique: jest.fn() },
  conversionEvent: { create: jest.fn().mockResolvedValue({}) },
  contact: { findUnique: jest.fn().mockResolvedValue(null) },
  intent: { upsert: jest.fn() },
  intentDetection: { create: jest.fn() },
};
jest.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
const runAgent = jest.fn();
jest.mock("@/lib/ai/agent/raveConcierge", () => ({ runRaveConciergeAgent: (...a: unknown[]) => runAgent(...a) }));
const notify = jest.fn().mockResolvedValue(undefined);
jest.mock("@/lib/mail/notifications", () => ({ sendHumanHandoffNotification: (...a: unknown[]) => notify(...a) }));

import { sendMessage } from "@/lib/services/conversation";

const base = { id: 7, externalId: "ext-7", contactId: null, status: "open", currentPage: "/", landingPage: "/" } as never;

beforeEach(() => jest.clearAllMocks());

describe("sendMessage durability", () => {
  it("saves the visitor message and bumps lastMessageAt BEFORE the AI runs", async () => {
    runAgent.mockRejectedValue(new Error("boom"));
    await sendMessage(base, "hello");
    const order = [prismaMock.message.create.mock.invocationCallOrder[0], prismaMock.conversation.update.mock.invocationCallOrder[0], runAgent.mock.invocationCallOrder[0]];
    expect(order[0]).toBeLessThan(order[2]);
    expect(order[1]).toBeLessThan(order[2]);
    expect(prismaMock.message.create.mock.calls[0][0].data).toMatchObject({ role: "visitor", content: "hello" });
  });

  it("an unexpected AI error no longer throws: fallback + handoff + one alert", async () => {
    runAgent.mockRejectedValue(new Error("boom"));
    const res = await sendMessage(base, "hello");
    expect(res.aiUnavailable).toBe(true);
    expect(res.needsHuman).toBe(true);
    expect(notify).toHaveBeenCalledTimes(1);
    expect(prismaMock.conversation.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: "human_handoff" }) }));
  });

  it("provider outage behaves the same", async () => {
    runAgent.mockRejectedValue(new AiProviderUnavailableError("down"));
    const res = await sendMessage(base, "hello");
    expect(res.aiUnavailable).toBe(true);
    expect(notify).toHaveBeenCalledTimes(1);
  });

  it("does not re-alert while the chat is already in human handoff", async () => {
    runAgent.mockRejectedValue(new Error("boom"));
    await sendMessage({ ...(base as object), status: "human_handoff" } as never, "again");
    expect(notify).not.toHaveBeenCalled();
  });

  it("a failing alert never breaks the visitor response", async () => {
    runAgent.mockRejectedValue(new Error("boom"));
    notify.mockRejectedValueOnce(new Error("smtp down"));
    await expect(sendMessage(base, "hello")).resolves.toMatchObject({ aiUnavailable: true });
  });

  it("a visitor message reopens a closed chat", async () => {
    runAgent.mockRejectedValue(new Error("boom"));
    await sendMessage({ ...(base as object), status: "closed" } as never, "hello?");
    expect(prismaMock.conversation.update.mock.calls[0][0].data).toMatchObject({ status: "open" });
  });
});
