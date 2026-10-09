import { channelStatuses } from "./channels";
import { llmStatus } from "./llm";
import { getTool } from "./tools/registry";

export type Readiness = "WORKING" | "LIMITED" | "BLOCKED" | "NOT_ACTIVE";
export interface AgentReadiness { state: Readiness; issues: string[]; unlock: string[] }

/** What each deterministic handler truly needs. `tools` must be connected to do useful work; `optionalTools` widen what it can do. */
const NEEDS: Record<string, { llm?: boolean; tools?: string[]; optionalTools?: string[] }> = {
  "prospecting.research": { optionalTools: ["places.search"] },
  "outreach.draft_send": { tools: ["outreach.send"] },
  "closing.proposal": { tools: ["outreach.send"], optionalTools: ["payment.link"] },
  "content.weekly": { llm: true },
  "marketing.weekly_plan": { llm: true },
};

const FRIENDLY: Record<string, string> = {
  "places.search": "Google Places API key (automatic prospect discovery)",
  "outreach.send": "an outbound channel (SMTP email is enough)",
  "payment.link": "Paystack (PAYSTACK_SECRET_KEY) — pay-now links in proposals",
  "ads.manage": "an ads platform integration",
  "analytics.read": "Google Analytics",
  "search_console.read": "Google Search Console",
  "github.read": "GitHub token + repo",
  "calendar.schedule": "a calendar integration",
  "payments.read": "a payments provider",
};

export function agentReadiness(a: { status: string; handler: string | null; tools: string[] }, handlerKeys: Set<string>): AgentReadiness {
  const issues: string[] = [], unlock: string[] = [];
  if (a.status !== "ACTIVE") {
    const why = a.status === "PAUSED" ? "Paused" : a.status === "REQUIRES_APPROVAL" ? "Waiting for budget approval" : "Not activated";
    // For drafts, also say what is missing to make them useful.
    if (!a.handler && !llmStatus().configured) unlock.push("an LLM key (OpenAI or Anthropic)");
    for (const t of a.tools) { const d = getTool(t); if (d && (!d.run || !d.status().enabled)) unlock.push(FRIENDLY[t] ?? t); }
    return { state: "NOT_ACTIVE", issues: [why], unlock: [...new Set(unlock)] };
  }
  if (a.handler && !handlerKeys.has(a.handler)) return { state: "BLOCKED", issues: ["Handler not implemented"], unlock: [] };
  const needs = a.handler ? NEEDS[a.handler] ?? {} : { llm: true };
  if (needs.llm && !llmStatus().configured) { issues.push("No LLM provider connected"); unlock.push("an LLM key (OpenAI or Anthropic)"); }
  for (const t of needs.tools ?? []) {
    const ok = t === "outreach.send" ? channelStatuses().some((c) => c.connected) : getTool(t)?.status().enabled;
    if (!ok) { issues.push(`${FRIENDLY[t] ?? t} is not connected`); unlock.push(FRIENDLY[t] ?? t); }
  }
  if (issues.length) return { state: "BLOCKED", issues, unlock: [...new Set(unlock)] };
  const limited: string[] = [];
  for (const t of needs.optionalTools ?? []) if (!getTool(t)?.status().enabled) { limited.push(`${FRIENDLY[t] ?? t} not connected`); unlock.push(FRIENDLY[t] ?? t); }
  return limited.length ? { state: "LIMITED", issues: limited, unlock: [...new Set(unlock)] } : { state: "WORKING", issues: [], unlock: [] };
}
