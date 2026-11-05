import { z } from "zod";

/** Shared enums/schemas for the AI Automation platform. Statuses are validated strings (repo convention), not DB enums. */

export const PIPELINE_STATUSES = [
  "NEW_LEAD",
  "ASSESSMENT_COMPLETED",
  "AI_ANALYSIS_COMPLETED",
  "QUALIFIED",
  "PROPOSAL_GENERATED",
  "AWAITING_APPROVAL",
  "PROPOSAL_SENT",
  "NEGOTIATION",
  "ACCEPTED",
  "IMPLEMENTATION",
  "ACTIVE_CUSTOMER",
  "COMPLETED",
  "LOST",
] as const;
export type PipelineStatus = (typeof PIPELINE_STATUSES)[number];

export const LEAD_PRIORITIES = ["HIGH", "MEDIUM", "LOW", "MANUAL_REVIEW"] as const;
export type LeadPriority = (typeof LEAD_PRIORITIES)[number];

export const PROPOSAL_STATUSES = ["DRAFT", "MANUAL_REVIEW", "AWAITING_APPROVAL", "APPROVED", "REJECTED", "SENT", "ACCEPTED", "DECLINED", "EXPIRED"] as const;
export type ProposalStatus = (typeof PROPOSAL_STATUSES)[number];

export const COMPLEXITIES = ["LOW", "MEDIUM", "HIGH"] as const;
export type Complexity = (typeof COMPLEXITIES)[number];

export const CURRENCIES = ["USD", "GHS", "NGN", "GBP"] as const;
export type Currency = (typeof CURRENCIES)[number];
export const BASE_CURRENCY: Currency = "USD";

export const PRICING_METHODS = ["FIXED", "PER_UNIT", "HOURLY"] as const;
export type PricingMethod = (typeof PRICING_METHODS)[number];

export const EMAIL_STATUSES = ["QUEUED", "ACCEPTED", "DELIVERED", "BOUNCED", "FAILED"] as const;
export type EmailStatus = (typeof EMAIL_STATUSES)[number];

export const JOB_TYPES = ["ANALYSIS", "MATCH_PRICE", "PROPOSAL", "PDF", "EMAIL", "FOLLOWUP", "PROVISION"] as const;
export type JobType = (typeof JOB_TYPES)[number];

// ── Assessment question configuration ────────────────────────────────────
export const QUESTION_TYPES = ["text", "textarea", "number", "select", "multiselect", "boolean", "email", "tel", "url"] as const;
export type QuestionType = (typeof QUESTION_TYPES)[number];

export const OptionSchema = z.object({ value: z.string().min(1).max(120), label: z.string().min(1).max(240) });
export type QuestionOption = z.infer<typeof OptionSchema>;

export const ShowIfSchema = z.object({ key: z.string().min(1).max(80), in: z.array(z.string().max(120)).min(1) });
export type ShowIf = z.infer<typeof ShowIfSchema>;

export const QuestionSchema = z.object({
  key: z.string().regex(/^[a-zA-Z][a-zA-Z0-9_]{1,79}$/),
  stage: z.number().int().min(1).max(6),
  label: z.string().min(1).max(400),
  helpText: z.string().max(600).optional(),
  type: z.enum(QUESTION_TYPES),
  required: z.boolean().default(false),
  options: z.array(OptionSchema).max(40).optional(),
  showIf: ShowIfSchema.optional(),
  placeholder: z.string().max(200).optional(),
  maxLength: z.number().int().min(1).max(5000).optional(),
});
export type Question = z.infer<typeof QuestionSchema>;

// ── Industry landing-page content ───────────────────────────────────────
const Pair = z.object({ title: z.string().min(1).max(160), body: z.string().min(1).max(700) });
export const IndustryContentSchema = z.object({
  shortName: z.string().max(80),
  icon: z.string().max(40),
  audience: z.array(z.string().max(120)).max(12),
  hero: z.object({
    eyebrow: z.string().max(120),
    headline: z.string().min(1).max(200),
    subcopy: z.string().min(1).max(500),
    bullets: z.array(z.string().max(160)).max(5),
    image: z.object({ src: z.string().max(300), alt: z.string().max(300) }),
  }),
  problems: z.array(Pair).max(10),
  useCases: z.array(z.object({ title: z.string().max(160), scenario: z.string().max(700), steps: z.array(z.string().max(240)).max(6) })).max(6),
  integrations: z.array(z.string().max(120)).max(16),
  safeguards: Pair.optional(),
  faqs: z.array(z.object({ q: z.string().min(1).max(240), a: z.string().min(1).max(1200) })).max(10),
  cta: z.object({ primary: z.string().max(100), secondary: z.string().max(100), closing: z.string().max(200) }),
  related: z.array(z.object({ label: z.string().max(120), href: z.string().max(200) })).max(8),
  assessmentIntro: z.string().max(400),
});
export type IndustryContent = z.infer<typeof IndustryContentSchema>;

export interface IndustryConfig {
  slug: string;
  name: string;
  hasPage: boolean;
  sortOrder: number;
  active: boolean;
  seo: { title: string; description: string; keywords: string[]; ogImage?: string };
  content: IndustryContent;
  questions: Question[];
}

export interface SolutionSeed {
  key: string;
  name: string;
  description: string;
  problemsSolved: string[];
  capabilities: string[];
  deliverables: string[];
  integrations: string[]; // integration keys
  dependencies: string[];
  complexityLevels: Complexity[];
  defaultComplexity: Complexity;
  /** Signals used by the matcher. */
  areas: string[];
  challenges: string[];
  /** industry slug → priority (lower = earlier) */
  industries: Record<string, number>;
}

export interface SolutionRecord extends Omit<SolutionSeed, "industries" | "areas" | "challenges"> {
  id?: number;
  basePrice: number | null;
  pricingMethod: PricingMethod;
  currency: string;
  estimatedHours: number | null;
  deliveryWeeks: number | null;
  monthlyMaintenance: number | null;
  active: boolean;
  mappings: Array<{ industrySlug: string; priority: number; areas: string[]; challenges: string[] }>;
}

export const CHALLENGE_OPTIONS: QuestionOption[] = [
  { value: "MANUAL_WORK", label: "Too much manual work" },
  { value: "HIGH_COSTS", label: "High operating costs" },
  { value: "SLOW_RESPONSES", label: "Slow customer responses" },
  { value: "LOST_SALES", label: "Lost sales" },
  { value: "POOR_FOLLOWUP", label: "Poor lead follow-up" },
  { value: "STAFF_MANAGEMENT", label: "Inefficient staff management" },
  { value: "POOR_REPORTING", label: "Poor reporting" },
  { value: "CUSTOMER_SERVICE", label: "Customer service problems" },
  { value: "SCHEDULING", label: "Scheduling difficulties" },
  { value: "INVENTORY", label: "Inventory problems" },
  { value: "INEFFICIENCY", label: "Operational inefficiencies" },
  { value: "OTHER", label: "Other" },
];

export const AUTOMATION_AREA_OPTIONS: QuestionOption[] = [
  { value: "AI_SALES", label: "AI Sales" },
  { value: "AI_MARKETING", label: "AI Marketing" },
  { value: "AI_SUPPORT", label: "AI Customer Support" },
  { value: "AI_LEADGEN", label: "AI Lead Generation" },
  { value: "AI_WHATSAPP", label: "AI WhatsApp" },
  { value: "AI_BOOKING", label: "AI Appointment Booking" },
  { value: "AI_FINANCE", label: "AI Finance" },
  { value: "AI_HR", label: "AI HR" },
  { value: "AI_OPERATIONS", label: "AI Operations" },
  { value: "AI_BI", label: "AI Business Intelligence" },
  { value: "AI_CUSTOM", label: "Custom AI Solutions" },
  { value: "NOT_SURE", label: "Not sure — recommend what my business needs" },
];

export const INTEGRATION_LABELS: Record<string, string> = {
  "whatsapp-business": "WhatsApp Business Platform",
  crm: "CRM system",
  "calendar-scheduling": "Calendar / scheduling platform",
  email: "Email system",
  "payment-gateway": "Payment gateway",
  accounting: "Accounting software",
  "pos-erp": "POS / ERP system",
  "hms-ehr": "Hospital / practice management system",
  pms: "Hotel property management system",
  "booking-platforms": "Online booking platforms / channel manager",
  "fleet-telematics": "Fleet / telematics system",
  "website-chat": "Website chat",
  sms: "SMS gateway",
  "document-storage": "Document storage",
  "school-management": "School management system",
  "core-systems": "Loan / core financial system",
  "analytics-bi": "Analytics / BI tooling",
  "custom-api": "Custom API",
};
