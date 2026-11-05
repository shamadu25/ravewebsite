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

describe("multi-provider diagnosis", () => {
  it("explains every provider that failed, in order", () => {
    const d = diagnoseChatAiError("[openai] AI provider request failed with status 429. | [google] AI provider request failed with status 401.");
    expect(d.cause).toBe("quota_or_rate_limit");
    expect(d.summary).toMatch(/Every AI provider failed/);
    expect(d.summary).toMatch(/OpenAI refused the request/);
    expect(d.summary).toMatch(/Google Gemini rejected the API key/);
    expect(d.fix).toMatch(/GEMINI_API_KEY/);
  });

  it("names the right key and billing page per provider", () => {
    expect(diagnoseChatAiError("[anthropic] AI provider request failed with status 401.").fix).toMatch(/ANTHROPIC_API_KEY/);
    expect(diagnoseChatAiError("[anthropic] AI provider request failed with status 429.").fix).toMatch(/console\.anthropic\.com/);
    expect(diagnoseChatAiError("[openai] AI provider request failed with status 429.").fix).toMatch(/platform\.openai\.com/);
  });
});

describe("the exact symptom: no AI key", () => {
  const ENV = { ...process.env };
  const clearKeys = () => {
    delete process.env.OPENAI_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.GEMINI_API_KEY;
    delete process.env.CHAT_AI_PROVIDER;
    process.env.AI_AGENT_ENABLED = "true";
  };
  afterEach(() => {
    process.env = { ...ENV };
    jest.resetModules();
    jest.restoreAllMocks();
  });

  it("testChatAi names the missing keys instead of failing silently", async () => {
    clearKeys();
    jest.resetModules();
    const { testChatAi, chatAiStatus } = await import("@/lib/ai/health");
    expect(chatAiStatus()).toMatchObject({ enabled: true, anyConfigured: false });
    expect(await testChatAi()).toMatchObject({ ok: false, cause: "no_key" });
  });

  it("a Gemini-only setup now works (this used to be the failure)", async () => {
    clearKeys();
    process.env.GEMINI_API_KEY = "gem-key";
    jest.resetModules();
    const fetchMock = jest.spyOn(global, "fetch").mockResolvedValue({ ok: true, json: async () => ({ modelVersion: "gemini-x", candidates: [{ content: { parts: [{ text: '{"ok":true}' }] } }] }) } as Response);
    const { testChatAi, chatAiStatus } = await import("@/lib/ai/health");
    expect(chatAiStatus().anyConfigured).toBe(true);
    expect(await testChatAi()).toMatchObject({ ok: true, provider: "google", model: "gemini-x" });
    expect(String(fetchMock.mock.calls[0][0])).toContain("generativelanguage.googleapis.com");
  });

  it("reports a switched-off assistant", async () => {
    clearKeys();
    process.env.OPENAI_API_KEY = "sk-test";
    process.env.AI_AGENT_ENABLED = "false";
    jest.resetModules();
    const { testChatAi } = await import("@/lib/ai/health");
    expect(await testChatAi()).toMatchObject({ ok: false, cause: "disabled" });
  });

  it("OpenAI out of credit falls through to Claude, and the test says who answered", async () => {
    clearKeys();
    process.env.OPENAI_API_KEY = "sk-test";
    process.env.ANTHROPIC_API_KEY = "ak-test";
    jest.resetModules();
    jest.spyOn(console, "warn").mockImplementation(() => undefined);
    const fetchMock = jest.spyOn(global, "fetch").mockImplementation(async (url) =>
      String(url).includes("openai.com")
        ? ({ ok: false, status: 429 } as Response)
        : ({ ok: true, json: async () => ({ model: "claude-haiku-5-5", content: [{ type: "text", text: '{"ok":true}' }] }) } as Response)
    );
    const { testChatAi } = await import("@/lib/ai/health");
    expect(await testChatAi()).toMatchObject({ ok: true, provider: "anthropic", model: "claude-haiku-5-5" });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("when every provider fails, the diagnosis explains each one", async () => {
    clearKeys();
    process.env.OPENAI_API_KEY = "sk-test";
    process.env.GEMINI_API_KEY = "gem-key";
    jest.resetModules();
    jest.spyOn(console, "warn").mockImplementation(() => undefined);
    jest.spyOn(global, "fetch").mockImplementation(async (url) => ({ ok: false, status: String(url).includes("openai.com") ? 429 : 503 }) as Response);
    const { testChatAi } = await import("@/lib/ai/health");
    const r = await testChatAi();
    expect(r).toMatchObject({ ok: false, cause: "quota_or_rate_limit" });
    expect((r as { summary: string }).summary).toMatch(/OpenAI refused[\s\S]*Google Gemini had an outage/);
  });
});
