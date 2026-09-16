export interface HeroContent {
  headline: string;
  supporting: string;
}

const AGENT_HEADLINES: Record<string, HeroContent> = {
  whatsapp: {
    headline: "Turn More WhatsApp Inquiries Into Paying Customers",
    supporting:
      "Get an AI Employee that replies to WhatsApp inquiries instantly, follows up automatically, and qualifies leads — 24/7.",
  },
  sales: {
    headline: "Give Every New Lead an Instant Response and Consistent Follow-Up",
    supporting:
      "Get an AI Employee that replies instantly, follows up automatically, qualifies leads and helps turn more inquiries into paying customers — 24/7.",
  },
  support: {
    headline: "Answer Customer Questions 24/7 Without Overloading Your Team",
    supporting:
      "Get an AI Employee that handles repetitive support questions consistently, so your team can focus on what needs a human.",
  },
  appointments: {
    headline: "Let Customers Qualify and Book Appointments Automatically",
    supporting: "Get an AI Employee that checks requirements, books appointments, and sends reminders — 24/7.",
  },
};

const DEFAULT_HERO: HeroContent = {
  headline: "Stop Losing Customers Because Your Team Replies Late",
  supporting:
    "Get an AI Employee that replies instantly, follows up automatically, qualifies leads and helps turn more inquiries into paying customers — 24/7.",
};

const INDUSTRY_EXAMPLES: Record<string, string> = {
  hotel: "hotel booking inquiries and reservation follow-up",
  "real-estate": "property inquiries and viewing requests",
  ecommerce: "product questions, abandoned inquiries and order support",
};

export function resolveHeroContent(agentParam?: string | string[]): HeroContent {
  const key = Array.isArray(agentParam) ? agentParam[0] : agentParam;
  if (!key) return DEFAULT_HERO;
  return AGENT_HEADLINES[key] ?? DEFAULT_HERO;
}

export function resolveIndustryExample(industryParam?: string | string[]): string | null {
  const key = Array.isArray(industryParam) ? industryParam[0] : industryParam;
  if (!key) return null;
  return INDUSTRY_EXAMPLES[key] ?? null;
}
