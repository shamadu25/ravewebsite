// Central configuration for the RaveSoft AI Agent (spec §12, §6, §69).

export const AI_CONFIG = {
  enabled: process.env.AI_AGENT_ENABLED !== "false",
  assistantName: process.env.AI_ASSISTANT_NAME ?? "Rave AI",
  openai: {
    apiKey: process.env.OPENAI_API_KEY ?? "",
    model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
    baseUrl: process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1",
  },
} as const;

/** Deterministic lead scoring weights (spec §12). */
export const LEAD_SCORING_WEIGHTS: Record<string, number> = {
  decision_maker: 15,
  clear_problem: 15,
  high_business_impact: 15,
  implementation_under_30_days: 15,
  pricing_interest: 10,
  demo_interest: 10,
  meaningful_lead_volume: 10,
  contact_details_complete: 5,
  returning_high_intent_visitor: 5,
};

export const LEAD_SCORE_LEVELS: Array<{ level: string; min: number; max: number }> = [
  { level: "low", min: 0, max: 30 },
  { level: "nurture", min: 31, max: 50 },
  { level: "qualified", min: 51, max: 70 },
  { level: "sales_qualified", min: 71, max: 85 },
  { level: "hot", min: 86, max: 100 },
];

/** Quick action buttons shown on first chat open (spec §6). */
export const QUICK_ACTIONS: Array<{ label: string; message: string }> = [
  { label: "Get More Sales", message: "I want to get more sales for my business." },
  { label: "Automate WhatsApp", message: "I want to automate WhatsApp inquiries." },
  { label: "Get an AI Employee", message: "I want an AI employee for my business." },
  { label: "Automate Customer Service", message: "I want to automate customer service." },
  { label: "Build Custom Software", message: "I need custom software built." },
  { label: "CliqPOS", message: "Tell me about CliqPOS." },
  { label: "Hotel Software", message: "Tell me about your hotel management software." },
  { label: "Talk to RaveSoft", message: "I would like to speak to someone at RaveSoft." },
  { label: "I Need Support", message: "I am an existing customer and need support." },
];
