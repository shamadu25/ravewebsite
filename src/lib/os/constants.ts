export const ORG_ID = "ravesoft";

export const AGENT_STATUSES = ["ACTIVE", "PAUSED", "DRAFT", "ERROR", "REQUIRES_APPROVAL", "ARCHIVED"] as const;
export type AgentStatus = (typeof AGENT_STATUSES)[number];

export const AUTONOMY_LEVELS = ["ASSISTED", "SEMI_AUTONOMOUS", "AUTONOMOUS"] as const;
export type Autonomy = (typeof AUTONOMY_LEVELS)[number];

export const TASK_STATUSES = ["QUEUED", "RUNNING", "WAITING_APPROVAL", "COMPLETED", "FAILED", "CANCELLED"] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export const PRIORITIES = ["CRITICAL", "HIGH", "MEDIUM", "LOW"] as const;
export type Priority = (typeof PRIORITIES)[number];

export const DEPARTMENTS = [
  "COMMAND",
  "REVENUE",
  "MARKETING",
  "CUSTOMER_SUCCESS",
  "PRODUCT",
  "ENGINEERING",
  "FINANCE",
  "OPERATIONS",
] as const;
export type Department = (typeof DEPARTMENTS)[number];

export const PIPELINE_STAGES = [
  "NEW",
  "RESEARCHED",
  "CONTACTED",
  "ENGAGED",
  "QUALIFIED",
  "DEMO",
  "PROPOSAL",
  "NEGOTIATION",
  "VERBAL_COMMITMENT",
  "WON",
  "LOST",
  "NURTURE",
] as const;
export type PipelineStage = (typeof PIPELINE_STAGES)[number];

/** Default close probability per stage; overridable per opportunity. */
export const STAGE_PROBABILITY: Record<PipelineStage, number> = {
  NEW: 0.02,
  RESEARCHED: 0.04,
  CONTACTED: 0.06,
  ENGAGED: 0.12,
  QUALIFIED: 0.25,
  DEMO: 0.4,
  PROPOSAL: 0.55,
  NEGOTIATION: 0.7,
  VERBAL_COMMITMENT: 0.9,
  WON: 1,
  LOST: 0,
  NURTURE: 0.03,
};

export const BUSINESS_UNITS = ["RAVESOFT", "CLIQPOS", "KOVABOT", "HMS", "RESTOVAX"] as const;
export const REVENUE_ENGINES = ["SAAS", "AI_EMPLOYEE_SERVICES", "ENTERPRISE"] as const;
export type RevenueEngine = (typeof REVENUE_ENGINES)[number];

export const CHANNELS = ["EMAIL", "WHATSAPP", "SMS", "LINKEDIN", "WEB_CHAT", "VOICE"] as const;
export type Channel = (typeof CHANNELS)[number];

export const ACTOR_TYPES = ["HUMAN", "AI_AGENT", "SYSTEM", "WEBHOOK"] as const;
export type ActorType = (typeof ACTOR_TYPES)[number];

export const APPROVAL_KINDS = [
  "OUTREACH",
  "AD_SPEND",
  "DISCOUNT",
  "REFUND",
  "DEPLOYMENT",
  "CONTRACT",
  "PRICING_CHANGE",
  "FINANCIAL",
  "PUBLIC_ANNOUNCEMENT",
  "QUALIFICATION",
  "AGENT_CHANGE",
  "COMMAND",
  "ESCALATION",
  "OTHER",
] as const;
export type ApprovalKind = (typeof APPROVAL_KINDS)[number];
