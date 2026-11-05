/** @jest-environment node */
import { extractJsonObject, toTurns } from "@/lib/ai/providers/messages";
import { AnthropicProvider } from "@/lib/ai/providers/anthropic";
import { GeminiProvider } from "@/lib/ai/providers/gemini";
import { COOLDOWN_MS, FallbackProvider, resetCooldowns } from "@/lib/ai/providers/fallback";
import { AiProviderUnavailableError, type LLMProvider, type LLMResponse } from "@/lib/ai/providers/types";

const ok = (content = '{"message":"hi"}', model = "m"): LLMResponse => ({ content, model, inputTokens: 1, outputTokens: 1, latencyMs: 5 });
const stub = (impl: () => Promise<LLMResponse>): LLMProvider & { chat: jest.Mock } => ({ chat: jest.fn(impl) });

describe("toTurns", () => {
  it("separates the system prompt and starts with the visitor", () => {
    const { system, turns } = toTurns([
      { role: "system", content: "Be Ama." },
      { role: "assistant", content: "Hi, I'm Ama." },
      { role: "user", content: "Hello" },
    ]);
    expect(system).toBe("Be Ama.");
    expect(turns).toEqual([
      { role: "user", content: "(The visitor opened the chat.)" },
      { role: "assistant", content: "Hi, I'm Ama." },
      { role: "user", content: "Hello" },
    ]);
  });

  it("merges consecutive messages from the same side and drops empties", () => {
    const { turns } = toTurns([
      { role: "user", content: "one" },
      { role: "user", content: "two" },
      { role: "assistant", content: "   " },
      { role: "assistant", content: "reply" },
      { role: "user", content: "three" },
    ]);
    expect(turns).toEqual([
      { role: "user", content: "one\n\ntwo" },
      { role: "assistant", content: "reply" },
      { role: "user", content: "three" },
    ]);
  });

  it("always yields at least one turn", () => {
    expect(toTurns([{ role: "system", content: "x" }]).turns).toHaveLength(1);
  });
});

describe("extractJsonObject", () => {
  it("leaves valid JSON alone and unwraps fences or prose", () => {
    expect(extractJsonObject(' {"a":1} ')).toBe('{"a":1}');
    expect(extractJsonObject('```json\n{"a":{"b":2}}\n```')).toBe('{"a":{"b":2}}');
    expect(extractJsonObject('Sure! Here you go: {"a":1} Hope that helps.')).toBe('{"a":1}');
    expect(extractJsonObject("no json here")).toBe("no json here");
  });
});

describe("AnthropicProvider", () => {
  afterEach(() => jest.restoreAllMocks());

  it("sends alternating turns, the JSON instruction and the key", async () => {
    const f = jest.spyOn(global, "fetch").mockResolvedValue({ ok: true, json: async () => ({ model: "claude-haiku-5-5", content: [{ type: "text", text: 'Here: {"message":"Hello!"}' }], usage: { input_tokens: 10, output_tokens: 4 } }) } as Response);
    const res = await new AnthropicProvider("ak", "claude-haiku-5-5").chat([
      { role: "system", content: "Be Ama." },
      { role: "assistant", content: "Hi" },
      { role: "user", content: "Price?" },
    ]);
    const [url, init] = f.mock.calls[0];
    expect(url).toBe("https://api.anthropic.com/v1/messages");
    expect((init!.headers as Record<string, string>)["x-api-key"]).toBe("ak");
    const body = JSON.parse(String(init!.body));
    expect(body.system).toContain("Be Ama.");
    expect(body.system).toMatch(/single valid JSON object/);
    expect(body.messages.map((m: { role: string }) => m.role)).toEqual(["user", "assistant", "user"]);
    expect(res).toMatchObject({ content: '{"message":"Hello!"}', inputTokens: 10, outputTokens: 4 });
  });

  it("maps failures to AiProviderUnavailableError with the status", async () => {
    jest.spyOn(global, "fetch").mockResolvedValue({ ok: false, status: 529 } as Response);
    await expect(new AnthropicProvider("ak", "m").chat([{ role: "user", content: "x" }])).rejects.toThrow("status 529");
    jest.spyOn(global, "fetch").mockRejectedValue(new Error("boom"));
    await expect(new AnthropicProvider("ak", "m").chat([{ role: "user", content: "x" }])).rejects.toBeInstanceOf(AiProviderUnavailableError);
    await expect(new AnthropicProvider("", "m").chat([{ role: "user", content: "x" }])).rejects.toThrow(/not configured/);
  });
});

describe("GeminiProvider", () => {
  afterEach(() => jest.restoreAllMocks());

  it("uses model/user roles, a system instruction and JSON mode", async () => {
    const f = jest.spyOn(global, "fetch").mockResolvedValue({ ok: true, json: async () => ({ modelVersion: "gemini-x", candidates: [{ content: { parts: [{ text: '{"message":"Hi"}' }] } }], usageMetadata: { promptTokenCount: 7, candidatesTokenCount: 3, thoughtsTokenCount: 2 } }) } as Response);
    const res = await new GeminiProvider("gk", "gemini-3.5-flash-lite", "https://g.example/v1beta").chat([
      { role: "system", content: "Be Ama." },
      { role: "assistant", content: "Hi" },
      { role: "user", content: "Price?" },
    ]);
    const [url, init] = f.mock.calls[0];
    expect(url).toBe("https://g.example/v1beta/models/gemini-3.5-flash-lite:generateContent");
    expect((init!.headers as Record<string, string>)["x-goog-api-key"]).toBe("gk");
    const body = JSON.parse(String(init!.body));
    expect(body.systemInstruction.parts[0].text).toBe("Be Ama.");
    expect(body.contents.map((c: { role: string }) => c.role)).toEqual(["user", "model", "user"]);
    expect(body.generationConfig.responseMimeType).toBe("application/json");
    expect(res).toMatchObject({ content: '{"message":"Hi"}', outputTokens: 5 });
  });

  it("treats an empty answer as a failure so the next provider is tried", async () => {
    jest.spyOn(global, "fetch").mockResolvedValue({ ok: true, json: async () => ({ candidates: [{ finishReason: "SAFETY" }] }) } as Response);
    await expect(new GeminiProvider("gk", "m", "https://g").chat([{ role: "user", content: "x" }])).rejects.toThrow(/no text.*SAFETY/);
  });
});

describe("FallbackProvider", () => {
  beforeEach(() => {
    resetCooldowns();
    jest.spyOn(console, "warn").mockImplementation(() => undefined);
  });
  afterEach(() => jest.restoreAllMocks());
  const msgs = [{ role: "user" as const, content: "hi" }];

  it("uses the first provider when it works", async () => {
    const a = stub(async () => ok("A"));
    const b = stub(async () => ok("B"));
    const res = await new FallbackProvider([{ name: "openai", provider: a }, { name: "google", provider: b }]).chat(msgs);
    expect(res).toMatchObject({ content: "A", provider: "openai" });
    expect(b.chat).not.toHaveBeenCalled();
  });

  it("falls through to the next provider on failure", async () => {
    const a = stub(async () => { throw new AiProviderUnavailableError("AI provider request failed with status 429."); });
    const b = stub(async () => ok("B"));
    const res = await new FallbackProvider([{ name: "openai", provider: a }, { name: "google", provider: b }]).chat(msgs);
    expect(res).toMatchObject({ content: "B", provider: "google" });
  });

  it("skips a failing provider for a minute so it does not slow every message, then retries it", async () => {
    let t = 1_000_000;
    const a = stub(async () => { throw new AiProviderUnavailableError("down"); });
    const b = stub(async () => ok("B"));
    const p = new FallbackProvider([{ name: "openai", provider: a }, { name: "google", provider: b }], () => t);
    await p.chat(msgs);
    await p.chat(msgs);
    expect(a.chat).toHaveBeenCalledTimes(1);
    t += COOLDOWN_MS + 1;
    await p.chat(msgs);
    expect(a.chat).toHaveBeenCalledTimes(2);
  });

  it("a recovered provider leaves the cooldown immediately", async () => {
    let t = 5_000_000;
    let fail = true;
    const a = stub(async () => { if (fail) throw new AiProviderUnavailableError("down"); return ok("A"); });
    const b = stub(async () => ok("B"));
    const p = new FallbackProvider([{ name: "openai", provider: a }, { name: "google", provider: b }], () => t);
    await p.chat(msgs);
    fail = false;
    t += COOLDOWN_MS + 1;
    expect((await p.chat(msgs)).provider).toBe("openai");
    expect((await p.chat(msgs)).provider).toBe("openai");
  });

  it("still tries everything when all providers are cooling down", async () => {
    const t = 9_000_000;
    let fail = true;
    const a = stub(async () => { if (fail) throw new AiProviderUnavailableError("down"); return ok("A"); });
    const p = new FallbackProvider([{ name: "openai", provider: a }], () => t);
    await expect(p.chat(msgs)).rejects.toThrow();
    fail = false;
    expect((await p.chat(msgs)).content).toBe("A");
  });

  it("reports every failure when all providers fail", async () => {
    const a = stub(async () => { throw new AiProviderUnavailableError("AI provider request failed with status 429."); });
    const b = stub(async () => { throw new Error("socket hang up"); });
    const err = await new FallbackProvider([{ name: "openai", provider: a }, { name: "google", provider: b }]).chat(msgs).catch((e) => e);
    expect(err).toBeInstanceOf(AiProviderUnavailableError);
    expect(err.message).toBe("[openai] AI provider request failed with status 429. | [google] socket hang up");
  });
});

describe("getLLMProvider chain", () => {
  const ENV = { ...process.env };
  afterEach(() => {
    process.env = { ...ENV };
    jest.resetModules();
    jest.restoreAllMocks();
  });
  const load = async (env: Record<string, string | undefined>) => {
    for (const k of ["OPENAI_API_KEY", "ANTHROPIC_API_KEY", "GEMINI_API_KEY", "CHAT_AI_PROVIDER", "AI_AGENT_ENABLED"]) delete process.env[k];
    Object.assign(process.env, Object.fromEntries(Object.entries(env).filter(([, v]) => v !== undefined)));
    jest.resetModules();
    return import("@/lib/ai/providers");
  };

  it("orders configured providers OpenAI → Claude → Gemini by default", async () => {
    const m = await load({ OPENAI_API_KEY: "a", ANTHROPIC_API_KEY: "b", GEMINI_API_KEY: "c" });
    expect(m.chatProviderOrder().map((p) => p.name)).toEqual(["openai", "anthropic", "google"]);
  });

  it("only includes providers that have a key", async () => {
    const m = await load({ GEMINI_API_KEY: "c" });
    expect(m.chatProviderOrder().map((p) => p.name)).toEqual(["google"]);
  });

  it("CHAT_AI_PROVIDER moves one to the front", async () => {
    const m = await load({ OPENAI_API_KEY: "a", ANTHROPIC_API_KEY: "b", GEMINI_API_KEY: "c", CHAT_AI_PROVIDER: "Google" });
    expect(m.chatProviderOrder().map((p) => p.name)).toEqual(["google", "openai", "anthropic"]);
  });

  it("with nothing configured, or switched off, behaves as unavailable", async () => {
    const none = await load({});
    await expect(none.getLLMProvider().chat([{ role: "user", content: "x" }])).rejects.toThrow("No AI provider is configured.");
    const off = await load({ OPENAI_API_KEY: "a", AI_AGENT_ENABLED: "false" });
    await expect(off.getLLMProvider().chat([{ role: "user", content: "x" }])).rejects.toThrow("No AI provider is configured.");
  });
});
