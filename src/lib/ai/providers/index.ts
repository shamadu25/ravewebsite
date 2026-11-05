import { AI_CONFIG } from "@/lib/ai/config";
import { LLMProvider } from "./types";
import { OpenAIProvider } from "./openai";
import { AnthropicProvider } from "./anthropic";
import { GeminiProvider } from "./gemini";
import { NullProvider } from "./null";
import { FallbackProvider, type NamedProvider } from "./fallback";

export type ChatProviderName = "openai" | "anthropic" | "google";

export interface ChatProviderInfo {
  name: ChatProviderName;
  label: string;
  envVar: string;
  configured: boolean;
  model: string;
}

/** Everything the website chat can use, in the default order. Models match the OS layer's fast tier. */
export function chatProviders(): ChatProviderInfo[] {
  return [
    { name: "openai", label: "OpenAI", envVar: "OPENAI_API_KEY", configured: Boolean(AI_CONFIG.openai.apiKey), model: AI_CONFIG.openai.model },
    { name: "anthropic", label: "Anthropic (Claude)", envVar: "ANTHROPIC_API_KEY", configured: Boolean(process.env.ANTHROPIC_API_KEY), model: process.env.OS_ANTHROPIC_MODEL_FAST ?? "claude-haiku-5-5" },
    { name: "google", label: "Google (Gemini)", envVar: "GEMINI_API_KEY", configured: Boolean(process.env.GEMINI_API_KEY), model: process.env.OS_GEMINI_MODEL_FAST ?? "gemini-3.5-flash-lite" },
  ];
}

/** Configured providers in the order the chat tries them. CHAT_AI_PROVIDER=anthropic|google|openai moves one to the front. */
export function chatProviderOrder(): ChatProviderInfo[] {
  const preferred = process.env.CHAT_AI_PROVIDER?.trim().toLowerCase();
  const configured = chatProviders().filter((p) => p.configured);
  return [...configured].sort((a, b) => Number(b.name === preferred) - Number(a.name === preferred));
}

function build(info: ChatProviderInfo): NamedProvider {
  if (info.name === "openai") return { name: info.name, provider: new OpenAIProvider(AI_CONFIG.openai.apiKey, info.model, AI_CONFIG.openai.baseUrl) };
  if (info.name === "anthropic") return { name: info.name, provider: new AnthropicProvider(process.env.ANTHROPIC_API_KEY ?? "", info.model) };
  return { name: info.name, provider: new GeminiProvider(process.env.GEMINI_API_KEY ?? "", info.model, process.env.GEMINI_BASE_URL ?? "https://generativelanguage.googleapis.com/v1beta") };
}

/** The AI behind the website chat: every configured provider, tried in order, so one provider's outage, quota or key problem does not take the chat down. */
export function getLLMProvider(): LLMProvider {
  if (!AI_CONFIG.enabled) return new NullProvider();
  const chain = chatProviderOrder().map(build);
  if (chain.length === 0) return new NullProvider();
  return new FallbackProvider(chain);
}

export * from "./types";
