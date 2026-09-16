export const BUSINESS_TYPES = [
  "retail_ecommerce",
  "professional_services",
  "hotel_hospitality",
  "restaurant",
  "healthcare",
  "education",
  "real_estate",
  "financial_services",
  "logistics",
  "other",
] as const;

export const MAIN_PROBLEMS = [
  "slow_response",
  "poor_followup",
  "repetitive_support",
  "lead_qualification",
  "missed_bookings",
  "payment_collection",
  "repetitive_internal",
  "other",
] as const;

export const INQUIRY_CHANNELS = ["whatsapp", "social", "website", "email", "phone", "multiple"] as const;

export const INQUIRY_VOLUMES = ["lt_20", "20_100", "101_500", "gt_500", "not_sure"] as const;

export const RESPONSE_SPEEDS = ["within_5min", "within_1hr", "same_day", "after_24h", "varies"] as const;

export type BusinessType = (typeof BUSINESS_TYPES)[number];
export type MainProblem = (typeof MAIN_PROBLEMS)[number];
export type InquiryChannel = (typeof INQUIRY_CHANNELS)[number];
export type InquiryVolume = (typeof INQUIRY_VOLUMES)[number];
export type ResponseSpeed = (typeof RESPONSE_SPEEDS)[number];

export interface AssessmentAnswers {
  businessType: BusinessType;
  mainProblem: MainProblem;
  inquiryChannel: InquiryChannel;
  inquiryVolume: InquiryVolume;
  responseSpeed: ResponseSpeed;
  successCriteria: string;
}

export type Complexity = "Simple" | "Moderate" | "Advanced";

export interface AssessmentRecommendation {
  agentName: string;
  problemSolved: string;
  firstWorkflow: string;
  recommendedChannels: string[];
  humanHandoff: string;
  nextStep: string;
  complexity: Complexity;
}
