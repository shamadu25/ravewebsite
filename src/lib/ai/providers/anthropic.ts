import { AiProviderUnavailableError, LLMMessage, LLMProvider, LLMResponse, REQUEST_TIMEOUT_MS } from "./types";
import { extractJsonObject, toTurns } from "./messages";


/** Claude as a chat provider (fallback when OpenAI is unavailable). Same key and fast-tier model as the OS layer. */
export class AnthropicProvider implements LLMProvider {
  constructor(
    private readonly apiKey: string,
    private readonly model: string
  ) {}

  async chat(messages: LLMMessage[]): Promise<LLMResponse> {
    if (!this.apiKey) throw new AiProviderUnavailableError("ANTHROPIC_API_KEY is not configured.");
    const { system, turns } = toTurns(messages);
    const started = Date.now();

    let response: Response;
    try {
      response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "x-api-key": this.apiKey, "anthropic-version": "2023-06-01", "Content-Type": "application/json" },
        body: JSON.stringify({
          model: this.model,
          max_tokens: 1024,
          temperature: 0.4,
          system: `${system}\n\nRespond with a single valid JSON object and nothing else.`,
          messages: turns,
        }),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
    } catch (error) {
      throw new AiProviderUnavailableError("Failed to reach the AI provider.", { cause: error });
    }

    if (!response.ok) throw new AiProviderUnavailableError(`AI provider request failed with status ${response.status}.`);

    const data = await response.json();
    const text = (data?.content ?? []).filter((b: { type: string }) => b.type === "text").map((b: { text: string }) => b.text).join("");
    return {
      content: extractJsonObject(text) || "{}",
      model: data?.model ?? this.model,
      inputTokens: data?.usage?.input_tokens ?? 0,
      outputTokens: data?.usage?.output_tokens ?? 0,
      latencyMs: Date.now() - started,
    };
  }
}
