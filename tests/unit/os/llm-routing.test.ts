/** @jest-environment node */
import { complete, completeWith, configuredProviders, estimateCostUsd, providerOrder } from "@/lib/os/llm";
import { parseIntent, normaliseIntent, REPLY_INTENTS } from "@/lib/os/reply-intent";
import { REPLY_DATASET } from "@/lib/os/evals/reply-intent";

const OLD = { ...process.env };
const fetchMock = jest.fn();
beforeEach(() => { process.env = { ...OLD }; delete process.env.OPENAI_API_KEY; delete process.env.ANTHROPIC_API_KEY; delete process.env.GEMINI_API_KEY; delete process.env.OS_PROVIDER_FAST; delete process.env.OS_LLM_PROVIDER; global.fetch = fetchMock as never; fetchMock.mockReset(); });
afterAll(() => { process.env = OLD; });

const geminiOk = (text: string) => ({ ok: true, status: 200, json: async () => ({ candidates: [{ content: { parts: [{ text }] }, finishReason: "STOP" }], usageMetadata: { promptTokenCount: 120, candidatesTokenCount: 8 }, modelVersion: "gemini-3.5-flash-lite" }) });
const openaiOk = (text: string) => ({ ok: true, status: 200, json: async () => ({ choices: [{ message: { content: text } }], model: "gpt-4o-mini", usage: { prompt_tokens: 100, completion_tokens: 10 } }) });

describe("Gemini provider", () => {
  it("sends the key in a header (not the URL), system prompt, JSON mode, and reads text + token usage", async () => {
    process.env.GEMINI_API_KEY = "g-key";
    fetchMock.mockResolvedValue(geminiOk('{"intent":"INTERESTED"}'));
    const r = await complete({ tier: "fast", json: true, system: "SYS", user: "USER", temperature: 0 });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toContain("/models/gemini-3.5-flash-lite:generateContent");
    expect(url).not.toContain("g-key");                       // never leak the key into URLs/logs
    expect(init.headers["x-goog-api-key"]).toBe("g-key");
    const body = JSON.parse(init.body);
    expect(body.systemInstruction.parts[0].text).toBe("SYS");
    expect(body.contents[0].parts[0].text).toBe("USER");
    expect(body.generationConfig).toMatchObject({ temperature: 0, responseMimeType: "application/json" });
    expect(r).toMatchObject({ provider: "google", inputTokens: 120, outputTokens: 8, text: '{"intent":"INTERESTED"}' });
    expect(r.costUsd).toBeGreaterThan(0);
  });
  it("surfaces Google's real error message (e.g. a wrong model name)", async () => {
    process.env.GEMINI_API_KEY = "g";
    fetchMock.mockResolvedValue({ ok: false, status: 404, json: async () => ({ error: { message: "models/gemini-9 is not found" } }) });
    await expect(completeWith("google", { tier: "fast", system: "s", user: "u" })).rejects.toThrow(/google 404: models\/gemini-9 is not found/);
  });
  it("reports blocked/empty answers instead of returning blank text", async () => {
    process.env.GEMINI_API_KEY = "g";
    fetchMock.mockResolvedValue({ ok: true, status: 200, json: async () => ({ candidates: [{ finishReason: "SAFETY" }] }) });
    await expect(completeWith("google", { tier: "fast", system: "s", user: "u" })).rejects.toThrow(/no text.*SAFETY/);
  });
  it("prices Gemini models and honours price overrides", () => {
    expect(estimateCostUsd("gemini-3.5-flash-lite", 1_000_000, 1_000_000)).toBeCloseTo(2.8, 3);   // $0.30 + $2.50
    expect(estimateCostUsd("gemini-3.1-pro-preview", 1_000_000, 1_000_000)).toBeCloseTo(14, 3);   // $2 + $12
    process.env.OS_PRICE_GEMINI_3_5_FLASH_LITE = "1,2";
    expect(estimateCostUsd("gemini-3.5-flash-lite", 1_000_000, 1_000_000)).toBeCloseTo(3, 3);
  });
});

describe("cost estimation handles dated model IDs (regression: 20x overstatement)", () => {
  it("prices gpt-4o-mini snapshots at the mini rate, not the default", () => {
    expect(estimateCostUsd("gpt-4o-mini-2024-07-18", 1_000_000, 1_000_000)).toBeCloseTo(0.75, 3);   // $0.15 in + $0.60 out
    expect(estimateCostUsd("gpt-4o-2024-08-06", 1_000_000, 1_000_000)).toBeCloseTo(12.5, 3);        // $2.50 + $10
    expect(estimateCostUsd("gemini-3.5-flash-lite-preview-06-17", 1_000_000, 0)).toBeCloseTo(0.3, 3);
  });
  it("uses the longest matching key and a conservative default for unknown models", () => {
    expect(estimateCostUsd("gpt-4o-mini", 1_000_000, 0)).toBeCloseTo(0.15, 3);   // not gpt-4o's $2.50
    expect(estimateCostUsd("some-new-model", 1_000_000, 0)).toBeCloseTo(3, 3);
  });
});

describe("Gemini 3.8 Flash promo price steps up on 2027-01-01", () => {
  afterEach(() => jest.useRealTimers());
  it("charges the promo rate in 2026 and the full rate afterwards", () => {
    jest.useFakeTimers().setSystemTime(new Date("2026-10-09T00:00:00Z"));
    expect(estimateCostUsd("gemini-3.8-flash", 1_000_000, 1_000_000)).toBeCloseTo(4.5, 3);        // 0.75 + 3.75
    jest.setSystemTime(new Date("2027-01-02T00:00:00Z"));
    expect(estimateCostUsd("gemini-3.8-flash", 1_000_000, 1_000_000)).toBeCloseTo(9, 3);          // 1.50 + 7.50
  });
});

describe("provider routing and fallback", () => {
  beforeEach(() => { process.env.OPENAI_API_KEY = "o"; process.env.GEMINI_API_KEY = "g"; });
  it("defaults to OpenAI first when several are connected, and lists them", () => {
    expect(providerOrder("fast").map((p) => p.name)).toEqual(["openai", "google"]);
    expect(configuredProviders()).toEqual(["openai", "google"]);
  });
  it("lets a tier prefer Google (OS_PROVIDER_FAST) without touching other tiers", () => {
    process.env.OS_PROVIDER_FAST = "google";
    expect(providerOrder("fast")[0].name).toBe("google");
    expect(providerOrder("strong")[0].name).toBe("openai");
  });
  it("falls through to the next provider when the first fails", async () => {
    process.env.OS_PROVIDER_FAST = "google";
    fetchMock.mockImplementationOnce(async () => ({ ok: false, status: 503, json: async () => ({ error: { message: "overloaded" } }) })).mockImplementationOnce(async () => openaiOk("hi"));
    const r = await complete({ tier: "fast", system: "s", user: "u" });
    expect(r.provider).toBe("openai");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
  it("completeWith never falls back (comparisons must be attributable)", async () => {
    process.env.OS_PROVIDER_FAST = "google";
    fetchMock.mockResolvedValue({ ok: false, status: 503, json: async () => ({ error: { message: "overloaded" } }) });
    await expect(completeWith("google", { tier: "fast", system: "s", user: "u" })).rejects.toThrow(/overloaded/);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
  it("throws a clear error when nothing is configured", async () => {
    delete process.env.OPENAI_API_KEY; delete process.env.GEMINI_API_KEY;
    await expect(complete({ tier: "fast", system: "s", user: "u" })).rejects.toThrow(/No LLM provider is configured/);
  });
});

describe("reply intent parsing + dataset", () => {
  it("accepts valid intents in any case and rejects junk", () => {
    expect(parseIntent('{"intent":"not_interested"}')).toBe("NOT_INTERESTED");
    expect(parseIntent('Sure! ```json\n{"intent":"QUESTION"}\n```')).toBe("QUESTION");
    expect(parseIntent('{"intent":"MAYBE"}')).toBeNull();
    expect(parseIntent("no json here")).toBeNull();
    expect(normaliseIntent(42)).toBeNull();
  });
  it("labelled dataset is valid and covers every intent", () => {
    for (const d of REPLY_DATASET) expect(REPLY_INTENTS).toContain(d.label);
    for (const intent of REPLY_INTENTS) expect(REPLY_DATASET.filter((d) => d.label === intent).length).toBeGreaterThanOrEqual(2);
  });
});
