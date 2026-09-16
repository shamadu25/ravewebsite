import { AI_CONFIG } from "@/lib/ai/config";
import { LLMProvider } from "./types";
import { OpenAIProvider } from "./openai";
import { NullProvider } from "./null";

export function getLLMProvider(): LLMProvider {
  if (!AI_CONFIG.enabled || !AI_CONFIG.openai.apiKey) {
    return new NullProvider();
  }

  return new OpenAIProvider(AI_CONFIG.openai.apiKey, AI_CONFIG.openai.model, AI_CONFIG.openai.baseUrl);
}

export * from "./types";
