export const GROWTH_ORG = "ravesoft";

/** Feature flag: the Growth Engine UI/API/cron is inert unless GROWTH_ENGINE_ENABLED=true. */
export const growthEnabled = () => process.env.GROWTH_ENGINE_ENABLED === "true";

export interface IcpWeights {
  industryFit: number;
  operationalPain: number;
  sizeAbility: number;
  demandGrowth: number;
  useCaseClarity: number;
  contactability: number;
}

export const DEFAULT_WEIGHTS: IcpWeights = { industryFit: 25, operationalPain: 25, sizeAbility: 15, demandGrowth: 15, useCaseClarity: 15, contactability: 5 };

export interface IcpProfile {
  key: string;
  name: string;
  industry: string;
  country: string;
  weights: IcpWeights;
  /** Search phrases used by discovery; {area} is replaced by a service area. */
  queries: string[];
  qualifyAt: number;
  minConfidence: number;
}

/** Shipped profiles. Others (plumbing, roofing...) are added as DB rows via GrIcpProfile, not code. */
export const HVAC_PROFILE: IcpProfile = {
  key: "us-hvac",
  name: "US HVAC contractors",
  industry: "HVAC",
  country: "US",
  weights: DEFAULT_WEIGHTS,
  queries: ["HVAC contractor {area}", "air conditioning repair {area}", "heating and cooling company {area}"],
  qualifyAt: 60,
  minConfidence: 0.4,
};

const tradeProfile = (key: string, name: string, industry: string, queries: string[]): IcpProfile => ({ key, name, industry, country: "US", weights: DEFAULT_WEIGHTS, queries, qualifyAt: 60, minConfidence: 0.4 });

export const ROOFING_PROFILE = tradeProfile("us-roofing", "US roofing contractors", "Roofing", ["roofing contractor {area}", "roof repair and replacement {area}", "storm damage roofing company {area}"]);
export const PLUMBING_PROFILE = tradeProfile("us-plumbing", "US plumbing contractors", "Plumbing", ["plumber {area}", "emergency plumbing service {area}", "plumbing and drain company {area}"]);
export const REMODELING_PROFILE = tradeProfile("us-remodeling", "US remodeling contractors", "Remodeling", ["home remodeling contractor {area}", "kitchen and bath remodeling {area}", "general contractor home renovation {area}"]);

/** Built-in profiles; a GrIcpProfile row with the same key overrides the shipped one. */
export const BUILTIN_PROFILES: Record<string, IcpProfile> = Object.fromEntries([HVAC_PROFILE, ROOFING_PROFILE, PLUMBING_PROFILE, REMODELING_PROFILE].map((p) => [p.key, p]));

/** Facts the agents may state. Anything not here (discounts, dates, results, integrations) must go to the founder. */
export const PRICING = {
  coreImplementationUsd: 7500,
  premiumFromUsd: 12500,
  recurringNote: "Recurring management and usage fees are quoted separately and disclosed before signing.",
};

export const OFFER = {
  name: "AI Sales and Lead Recovery Employee",
  /** Only capabilities listed here may be mentioned in outreach. Extend only once the workflow is confirmed live. */
  confirmedCapabilities: ["respond to incoming web enquiries", "ask qualification questions", "follow up on estimates", "hand sensitive cases to a person"] as string[],
};

export const SENDER = () => ({
  identity: process.env.GROWTH_SENDER_IDENTITY ?? "RaveSoft Digital Solutions",
  postalAddress: process.env.GROWTH_POSTAL_ADDRESS ?? "",
});
