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

export const OFFER = {
  name: "AI Sales and Lead Recovery Employee",
  /** Only capabilities listed here may be mentioned in outreach. Extend only once the workflow is confirmed live. */
  confirmedCapabilities: ["respond to incoming web enquiries", "ask qualification questions", "follow up on estimates", "hand sensitive cases to a person"] as string[],
};

export const SENDER = () => ({
  identity: process.env.GROWTH_SENDER_IDENTITY ?? "RaveSoft Digital Solutions",
  postalAddress: process.env.GROWTH_POSTAL_ADDRESS ?? "",
});
