import type { LLMMessage } from "./types";

export interface Turn {
  role: "user" | "assistant";
  content: string;
}

/**
 * Splits a chat transcript into the system prompt and the user/assistant turns, in the shape Anthropic and
 * Gemini require: roles strictly alternate and the first turn is the visitor's. Our transcripts start with
 * Ama's greeting, and a visitor can send several messages in a row, so both cases are handled here.
 */
export function toTurns(messages: LLMMessage[]): { system: string; turns: Turn[] } {
  const system = messages
    .filter((m) => m.role === "system")
    .map((m) => m.content)
    .join("\n\n");

  const turns: Turn[] = [];
  for (const m of messages) {
    if (m.role === "system" || !m.content.trim()) continue;
    const last = turns[turns.length - 1];
    if (last && last.role === m.role) last.content += `\n\n${m.content}`;
    else turns.push({ role: m.role, content: m.content });
  }
  if (turns.length === 0 || turns[0].role === "assistant") turns.unshift({ role: "user", content: "(The visitor opened the chat.)" });
  return { system, turns };
}

/**
 * The agent expects a bare JSON object. Anthropic has no JSON mode and models sometimes wrap JSON in prose or
 * code fences, so pull out the outermost object when the whole text is not valid JSON.
 */
export function extractJsonObject(text: string): string {
  const trimmed = text.trim();
  try {
    JSON.parse(trimmed);
    return trimmed;
  } catch {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start !== -1 && end > start) {
      const candidate = trimmed.slice(start, end + 1);
      try {
        JSON.parse(candidate);
        return candidate;
      } catch {
        // fall through
      }
    }
    return trimmed;
  }
}
