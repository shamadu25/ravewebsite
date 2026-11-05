/** @jest-environment node */
import { diagnoseChatAiError } from "@/lib/ai/health";

describe("diagnoseChatAiError", () => {
  it.each([
    ["No AI provider is configured.", "no_key"],
    ["OPENAI_API_KEY is not configured.", "no_key"],
    ["AI provider request failed with status 401.", "invalid_key"],
    ["AI provider request failed with status 403.", "invalid_key"],
    ["AI provider request failed with status 429.", "quota_or_rate_limit"],
    ["AI provider request failed with status 404.", "model_not_found"],
    ["AI provider request failed with status 400.", "model_not_found"],
    ["AI provider request failed with status 503.", "provider_error"],
    ["Failed to reach the AI provider.", "network"],
    ["Unknown column 'language' in 'field list'", "unknown"],
    [null, "unknown"],
  ])("%s → %s", (message, cause) => {
    const d = diagnoseChatAiError(message as string | null);
    expect(d.cause).toBe(cause);
    expect(d.summary.length).toBeGreaterThan(10);
    expect(d.fix.length).toBeGreaterThan(10);
  });
});

describe("the exact symptom: no OpenAI key", () => {
  const ENV = { ...process.env };
  afterEach(() => {
    process.env = { ...ENV };
    jest.resetModules();
  });

  it("testChatAi names the missing key instead of failing silently", async () => {
    delete process.env.OPENAI_API_KEY;
    process.env.GEMINI_API_KEY = "set-but-the-chat-ignores-it";
    process.env.AI_AGENT_ENABLED = "true";
    jest.resetModules();
    const { testChatAi, chatAiStatus } = await import("@/lib/ai/health");
    expect(chatAiStatus()).toMatchObject({ enabled: true, keyConfigured: false });
    const r = await testChatAi();
    expect(r).toMatchObject({ ok: false, cause: "no_key" });
  });

  it("testChatAi reports a switched-off assistant", async () => {
    process.env.OPENAI_API_KEY = "sk-test";
    process.env.AI_AGENT_ENABLED = "false";
    jest.resetModules();
    const { testChatAi } = await import("@/lib/ai/health");
    expect(await testChatAi()).toMatchObject({ ok: false, cause: "disabled" });
  });

  it("testChatAi surfaces an OpenAI quota error from the real provider code", async () => {
    process.env.OPENAI_API_KEY = "sk-test";
    process.env.AI_AGENT_ENABLED = "true";
    jest.resetModules();
    const fetchMock = jest.spyOn(global, "fetch").mockResolvedValue({ ok: false, status: 429 } as Response);
    const { testChatAi } = await import("@/lib/ai/health");
    expect(await testChatAi()).toMatchObject({ ok: false, cause: "quota_or_rate_limit" });
    fetchMock.mockRestore();
  });

  it("testChatAi reports success with the model used", async () => {
    process.env.OPENAI_API_KEY = "sk-test";
    process.env.AI_AGENT_ENABLED = "true";
    jest.resetModules();
    const fetchMock = jest.spyOn(global, "fetch").mockResolvedValue({ ok: true, json: async () => ({ model: "gpt-4o-mini-2024", choices: [{ message: { content: '{"ok":true}' } }] }) } as Response);
    const { testChatAi } = await import("@/lib/ai/health");
    expect(await testChatAi()).toMatchObject({ ok: true, model: "gpt-4o-mini-2024" });
    fetchMock.mockRestore();
  });
});
