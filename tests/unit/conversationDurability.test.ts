import { AiProviderUnavailableError } from "@/lib/ai/providers/types";

const prismaMock = {
  message: { count: jest.fn().mockResolvedValue(2), create: jest.fn().mockResolvedValue({}), findMany: jest.fn().mockResolvedValue([{ role: "visitor", content: "hello" }]) },
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
const alertTeam = jest.fn().mockResolvedValue(true);
jest.mock("@/lib/services/teamAlerts", () => ({ alertTeam: (...a: unknown[]) => alertTeam(...a), inBackground: (fn: () => Promise<unknown>) => void fn() }));
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

  it("while a human is active the AI is NOT called and the team is alerted", async () => {
    const res = await sendMessage({ ...(base as object), status: "human_active" } as never, "still there?");
    expect(runAgent).not.toHaveBeenCalled();
    expect(res.humanActive).toBe(true);
    expect(res.message).toBe("");
    expect(prismaMock.message.create).toHaveBeenCalledTimes(1); // only the visitor message
    expect(alertTeam).toHaveBeenCalledWith("visitor_waiting", expect.objectContaining({ externalId: "ext-7" }));
  });

  it("alerts the team on the first visitor message of a chat", async () => {
    prismaMock.message.count.mockResolvedValueOnce(1);
    runAgent.mockRejectedValue(new Error("boom"));
    await sendMessage(base, "hello");
    expect(alertTeam).toHaveBeenCalledWith("new_chat", expect.anything());
  });

  it("does not alert on later messages while the AI is handling the chat", async () => {
    runAgent.mockRejectedValue(new Error("boom"));
    await sendMessage(base, "hello");
    expect(alertTeam).not.toHaveBeenCalled();
  });

  it("a visitor message reopens a closed chat", async () => {
    runAgent.mockRejectedValue(new Error("boom"));
    await sendMessage({ ...(base as object), status: "closed" } as never, "hello?");
    expect(prismaMock.conversation.update.mock.calls[0][0].data).toMatchObject({ status: "open" });
  });
});
