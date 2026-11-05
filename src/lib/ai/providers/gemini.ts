import { AiProviderUnavailableError, LLMMessage, LLMProvider, LLMResponse, REQUEST_TIMEOUT_MS } from "./types";
import { extractJsonObject, toTurns } from "./messages";

/** Gemini as a chat provider (fallback when OpenAI is unavailable). Same key, base URL and fast-tier model as the OS layer. */
export class GeminiProvider implements LLMProvider {
  constructor(
    private readonly apiKey: string,
    private readonly model: string,
    private readonly baseUrl: string
  ) {}

  async chat(messages: LLMMessage[]): Promise<LLMResponse> {
    if (!this.apiKey) throw new AiProviderUnavailableError("GEMINI_API_KEY is not configured.");
    const { system, turns } = toTurns(messages);
    const started = Date.now();

    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}/models/${encodeURIComponent(this.model)}:generateContent`, {
        method: "POST",
        headers: { "x-goog-api-key": this.apiKey, "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: system }] },
          contents: turns.map((t) => ({ role: t.role === "assistant" ? "model" : "user", parts: [{ text: t.content }] })),
          generationConfig: { temperature: 0.4, responseMimeType: "application/json" },
        }),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
    } catch (error) {
      throw new AiProviderUnavailableError("Failed to reach the AI provider.", { cause: error });
    }

    if (!response.ok) throw new AiProviderUnavailableError(`AI provider request failed with status ${response.status}.`);

    const data = await response.json().catch(() => ({}));
    const text = (data?.candidates?.[0]?.content?.parts ?? []).map((p: { text?: string }) => p.text ?? "").join("");
    if (!text) throw new AiProviderUnavailableError(`AI provider returned no text (finish: ${data?.candidates?.[0]?.finishReason ?? "unknown"}).`);
    return {
      content: extractJsonObject(text),
      model: data?.modelVersion ?? this.model,
      inputTokens: data?.usageMetadata?.promptTokenCount ?? 0,
      outputTokens: (data?.usageMetadata?.candidatesTokenCount ?? 0) + (data?.usageMetadata?.thoughtsTokenCount ?? 0),
      latencyMs: Date.now() - started,
    };
  }
}
