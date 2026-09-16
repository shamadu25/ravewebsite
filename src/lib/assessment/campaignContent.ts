export interface HeroContent {
  headline: string;
  supporting: string;
}

const AGENT_HEADLINES: Record<string, HeroContent> = {
  whatsapp: {
    headline: "Turn More WhatsApp Inquiries Into Paying Customers",
    supporting:
      "Get an AI Employee that replies instantly, qualifies leads, follows up automatically and moves more WhatsApp inquiries toward a sale.",
  },
  sales: {
    headline: "Stop Losing Customers Because Your Team Replies Late",
    supporting:
      "Get an AI Employee that replies instantly, follows up automatically, qualifies leads and helps turn more inquiries into paying customers — 24/7.",
  },
  support: {
    headline: "Give Every Customer an Instant, Accurate Response—24/7",
    supporting:
      "Get an AI Employee that handles repetitive support questions consistently, so your team can focus on what needs a human.",
  },
  receivables: {
    headline: "Collect Outstanding Payments Without Chasing Every Customer Manually",
    supporting: "Get an AI Employee that sends professional payment reminders and escalates overdue accounts automatically.",
  },
  operations: {
    headline: "Automate Repetitive Business Work Without Expanding Your Team",
    supporting: "Get an AI Employee that connects your forms, email, CRM and spreadsheets to remove repetitive internal work.",
  },
};

const DEFAULT_HERO: HeroContent = {
  headline: "Discover the AI Employee Your Business Needs First",
  supporting:
    "Get an AI Employee that replies instantly, follows up automatically, qualifies leads and helps turn more inquiries into paying customers — 24/7.",
};

/** Maps a campaign ?agent= param to the assessment's mainProblem answer, so the
 * assessment can be preselected/skipped straight past that step. */
export const AGENT_TO_MAIN_PROBLEM: Record<string, string> = {
  whatsapp: "slow_response",
  sales: "slow_response",
  support: "repetitive_support",
  receivables: "payment_collection",
  operations: "repetitive_internal",
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

const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "fbclid"] as const;

/** Server-side UTM passthrough: builds a query string from the incoming page's
 * own searchParams so outbound links (booking, WhatsApp) carry the same
 * attribution, without needing client JS for this part. */
export function buildUtmQueryString(searchParams: Record<string, string | string[] | undefined>): string {
  const params = new URLSearchParams();
  for (const key of UTM_KEYS) {
    const value = searchParams[key];
    const single = Array.isArray(value) ? value[0] : value;
    if (single) params.set(key, single);
  }
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}
