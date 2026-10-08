/** @jest-environment node */
const mockPrisma: any = {
  osTask: { findUniqueOrThrow: jest.fn(), aggregate: jest.fn(), update: jest.fn() },
  osTrace: { create: jest.fn() },
  osApproval: { create: jest.fn() },
  osAlert: { findFirst: jest.fn(), create: jest.fn(), deleteMany: jest.fn() },
  osBrainEntry: { findMany: jest.fn().mockResolvedValue([]) },
  osAgent: { update: jest.fn() },
};
jest.mock("@/lib/prisma", () => ({ prisma: mockPrisma }));
jest.mock("@/lib/os/audit", () => ({ audit: jest.fn().mockResolvedValue(undefined) }));
const mockComplete = jest.fn();
jest.mock("@/lib/os/llm", () => ({
  complete: (...a: unknown[]) => mockComplete(...a),
  LlmUnavailableError: class extends Error {},
  parseJsonLoose: (t: string) => JSON.parse(t),
}));

import { executeTask } from "@/lib/os/runtime";
import { audit } from "@/lib/os/audit";

function setup(agent: Record<string, unknown>, task: Record<string, unknown> = {}) {
  const base = { id: 1, key: "test-agent", name: "Test Agent", department: "REVENUE", systemPrompt: "x", autonomy: "AUTONOMOUS", modelTier: "fast", temperature: 0.2, tools: [], knowledgeSources: [], approvalRules: null, maxExecutionSec: 5, maxRetries: 0, budgetLimitUsd: 25, handler: null, isDirector: false, orgId: "ravesoft" };
  mockPrisma.osTask.findUniqueOrThrow.mockResolvedValue({ id: 10, orgId: "ravesoft", title: "t", input: {}, retryCount: 0, isDemo: false, agent: { ...base, ...agent }, ...task });
  mockPrisma.osTask.aggregate.mockResolvedValue({ _sum: { costUsd: 0 } });
  mockPrisma.osTask.update.mockResolvedValue({});
  mockPrisma.osApproval.create.mockResolvedValue({ id: 99 });
  mockPrisma.osAlert.findFirst.mockResolvedValue(null);
  mockPrisma.osAlert.create.mockResolvedValue({ id: 1 });
}
const lastUpdate = () => mockPrisma.osTask.update.mock.calls.at(-1)[0].data;

beforeEach(() => jest.clearAllMocks());

describe("agent runtime security", () => {
  it("denies a tool the agent was never granted, audits it, and dead-letters the task", async () => {
    setup({ tools: ["brain.search"] });
    mockComplete.mockResolvedValue({ text: JSON.stringify({ summary: "send mail", tool_call: { tool: "outreach.send", input: { outreachId: 1 } } }), provider: "x", model: "m", inputTokens: 1, outputTokens: 1, costUsd: 0, latencyMs: 1 });
    const r = await executeTask(10);
    expect(r.status).toBe("FAILED");
    expect(lastUpdate()).toMatchObject({ status: "FAILED", deadLetter: true });
    expect(lastUpdate().error).toMatch(/has not been granted tool "outreach.send"/);
    expect(audit).toHaveBeenCalledWith(expect.objectContaining({ action: "tool.denied", result: "DENIED" }));
  });

  it("reports NOT CONNECTED instead of faking success when an integration is missing", async () => {
    setup({ tools: ["ads.manage"] });
    mockComplete.mockResolvedValue({ text: JSON.stringify({ summary: "wa", tool_call: { tool: "ads.manage", input: {} } }), provider: "x", model: "m", inputTokens: 1, outputTokens: 1, costUsd: 0, latencyMs: 1 });
    const r = await executeTask(10);
    expect(r.status).toBe("FAILED");
    expect(lastUpdate().error).toMatch(/not connected/i);
  });

  it("pauses for human approval when a SEMI_AUTONOMOUS agent attempts a gated tool", async () => {
    setup({ tools: ["tasks.delegate", "web.read_website"], autonomy: "ASSISTED" });
    mockComplete.mockResolvedValue({ text: JSON.stringify({ summary: "delegate", tool_call: { tool: "tasks.delegate", input: { agentKey: "x", title: "y" } } }), provider: "x", model: "m", inputTokens: 1, outputTokens: 1, costUsd: 0, latencyMs: 1 });
    const r = await executeTask(10);
    expect(r.status).toBe("WAITING_APPROVAL");
    expect(mockPrisma.osApproval.create).toHaveBeenCalled();
  });

  it("escalates low-confidence answers to a human instead of acting", async () => {
    setup({ tools: [] });
    mockComplete.mockResolvedValue({ text: JSON.stringify({ summary: "unsure", final: { result: "maybe qualified", confidence: 0.41 } }), provider: "x", model: "m", inputTokens: 1, outputTokens: 1, costUsd: 0, latencyMs: 1 });
    const r = await executeTask(10);
    expect(r.status).toBe("WAITING_APPROVAL");
    expect(mockPrisma.osApproval.create.mock.calls[0][0].data.confidence).toBe(0.41);
  });

  it("stops and requires approval when the agent's budget is exhausted", async () => {
    setup({ tools: [], budgetLimitUsd: 10 });
    mockPrisma.osTask.aggregate.mockResolvedValue({ _sum: { costUsd: 12 } });
    const r = await executeTask(10);
    expect(r.status).toBe("WAITING_APPROVAL");
    expect(mockPrisma.osAgent.update).toHaveBeenCalledWith(expect.objectContaining({ data: { status: "REQUIRES_APPROVAL" } }));
    expect(mockComplete).not.toHaveBeenCalled();
  });

  it("retries transient failures with backoff before dead-lettering", async () => {
    setup({ tools: [], maxRetries: 2 });
    mockComplete.mockRejectedValue(new Error("boom"));
    expect((await executeTask(10)).status).toBe("QUEUED");
    expect(lastUpdate()).toMatchObject({ status: "QUEUED", retryCount: 1 });
    expect(lastUpdate().runAfter.getTime()).toBeGreaterThan(Date.now());
  });
});

describe("failed tool results are never reported as success", () => {
  const { toolFailure } = jest.requireActual("@/lib/os/tools/registry") as typeof import("@/lib/os/tools/registry");
  it("maps BLOCKED/FAILED outcomes to errors and lets SENT through", () => {
    expect(toolFailure({ status: "BLOCKED", reason: "Recipient has opted out." })?.name).toBe("ToolBlockedError");
    expect(toolFailure({ status: "FAILED", notConnected: true, reason: "x" })?.name).toBe("NotConnectedError");
    expect(toolFailure({ status: "FAILED", reason: "SMTP refused" })?.message).toBe("SMTP refused");
    expect(toolFailure({ status: "SENT" })).toBeNull();
  });
});
