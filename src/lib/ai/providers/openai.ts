import { AiProviderUnavailableError, LLMMessage, LLMProvider, LLMResponse } from "./types";

export class OpenAIProvider implements LLMProvider {
  constructor(
    private readonly apiKey: string,
    private readonly model: string,
    private readonly baseUrl: string
  ) {}

  async chat(messages: LLMMessage[]): Promise<LLMResponse> {
    if (!this.apiKey) {
      throw new AiProviderUnavailableError("OPENAI_API_KEY is not configured.");
    }

    const started = Date.now();

    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: this.model,
          messages,
          response_format: { type: "json_object" },
          temperature: 0.4,
        }),
      });
    } catch (error) {
      throw new AiProviderUnavailableError("Failed to reach the AI provider.", { cause: error });
    }

    if (!response.ok) {
      throw new AiProviderUnavailableError(`AI provider request failed with status ${response.status}.`);
    }

    const latencyMs = Date.now() - started;
    const data = await response.json();

    return {
      content: data?.choices?.[0]?.message?.content ?? "{}",
      model: data?.model ?? this.model,
      inputTokens: data?.usage?.prompt_tokens ?? 0,
      outputTokens: data?.usage?.completion_tokens ?? 0,
      latencyMs,
    };
  }
}
