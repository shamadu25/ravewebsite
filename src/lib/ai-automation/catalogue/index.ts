import { AUTOMATION_AREA_OPTIONS, CHALLENGE_OPTIONS, type IndustryConfig, type Question } from "../types";
import { area, multi, opts, sel, text } from "./helpers";
import { EDUCATION, FINANCIAL_SERVICES, LOGISTICS, MANUFACTURING, OTHER, PROFESSIONAL_SERVICES } from "./industries-b";
import { HEALTHCARE, HOSPITALITY, REAL_ESTATE, RETAIL } from "./industries-a";

export { SOLUTION_SEEDS } from "./solutions";

/** Industries in display order. Eight have dedicated landing pages; Manufacturing and Other are assessment-only. */
export const INDUSTRY_SEEDS: IndustryConfig[] = [RETAIL, REAL_ESTATE, HEALTHCARE, HOSPITALITY, LOGISTICS, FINANCIAL_SERVICES, PROFESSIONAL_SERVICES, MANUFACTURING, EDUCATION, OTHER].sort((a, b) => a.sortOrder - b.sortOrder);

export const PAGE_INDUSTRY_SLUGS = INDUSTRY_SEEDS.filter((i) => i.hasPage).map((i) => i.slug);

/** Reserved so an admin-created industry can never shadow a real route under /ai-automation. */
export const RESERVED_SLUGS = ["proposal", "optout", "privacy-request", "assessment", "api", "admin"];

const s = (n: number, q: Question): Question => ({ ...q, stage: n });

/**
 * Questions shown for every industry. `industry` is rendered specially by the engine (preselected on industry pages).
 * Country appears once (stage 1) and is reused for the contact record: we collect only what we need.
 */
export const UNIVERSAL_QUESTIONS: Question[] = [
  // Stage 1 — business profile
  s(1, text("businessName", "Business name", { required: true })),
  s(1, { key: "industry", stage: 1, label: "Industry", type: "select", required: true, options: INDUSTRY_SEEDS.map((i) => ({ value: i.slug, label: i.name })) }),
  s(1, text("country", "Country", { required: true, placeholder: "e.g. Ghana" })),
  s(1, text("city", "City", { required: true })),
  s(1, { key: "website", stage: 1, label: "Website (optional)", type: "url", required: false, placeholder: "https://", maxLength: 300 }),
  s(1, sel("employees", "Number of employees", ["1–5", "6–20", "21–50", "51–200", "More than 200"], { required: true })),
  s(1, sel("branches", "Number of branches or locations", ["1", "2–3", "4–10", "More than 10"], { required: true })),
  s(1, sel("businessAge", "How long has the business operated?", ["Less than 1 year", "1–3 years", "4–10 years", "More than 10 years"], { required: true })),
  s(1, area("description", "Briefly describe your business", { required: true, maxLength: 1200, helpText: "What you sell, who your customers are, and how you operate." })),
  // Stage 2 — operations (industry-specific questions are inserted before these)
  s(2, multi("departments", "Which departments or teams do you have?", ["Sales", "Marketing", "Customer service", "Operations", "Finance / accounts", "HR", "IT", "Management only"], { required: true })),
  s(2, area("productsServices", "What products and services do you offer?", { required: true, maxLength: 1000 })),
  s(2, area("dailyActivities", "What are your team's main daily activities?", { maxLength: 1000 })),
  s(2, area("existingSoftware", "What software and tools do you use today?", { maxLength: 800, helpText: "CRM, accounting, POS, spreadsheets, messaging apps, etc." })),
  s(2, multi("commChannels", "Which channels do you use to communicate with customers?", ["WhatsApp", "Phone calls", "Email", "Facebook / Instagram", "Website chat", "SMS", "In person"], { required: true })),
  s(2, area("workflows", "Describe a workflow that is slow or manual today", { maxLength: 1200 })),
  // Stage 3 — challenges
  s(3, { key: "challenges", stage: 3, label: "Which challenges affect your business? (select all that apply)", type: "multiselect", required: true, options: CHALLENGE_OPTIONS }),
  s(3, area("challengeOther", "Describe the other challenge", { showIf: { key: "challenges", in: ["OTHER"] }, maxLength: 800 })),
  s(3, area("challengeDetail", "Tell us more about the problems you want solved", { maxLength: 1500 })),
  // Stage 4 — opportunities
  s(4, { key: "automationAreas", stage: 4, label: "What would you like to automate? (select all that apply)", type: "multiselect", required: true, options: AUTOMATION_AREA_OPTIONS }),
  // Stage 5 — goals and budget
  s(5, area("outcomes", "What outcomes do you want?", { required: true, maxLength: 1000 })),
  s(5, multi("improvements", "Which improvements matter most?", ["Faster customer response", "More sales", "Lower costs", "Less manual work", "Better reporting", "Better customer experience"], { required: true })),
  s(5, sel("urgency", "How urgent is this?", ["Immediately", "Within 1–3 months", "Within 3–6 months", "Just exploring"], { required: true })),
  s(5, sel("timeline", "Preferred implementation timeline", ["Within 1 month", "1–3 months", "3–6 months", "More than 6 months", "Flexible"], { required: true })),
  s(5, sel("budget", "Budget range (optional)", ["Under $1,000", "$1,000–$5,000", "$5,000–$15,000", "$15,000–$50,000", "Over $50,000", "Not sure yet", "Prefer not to say"], { helpText: "Not required. Not sharing a budget will not affect your assessment." })),
  s(5, sel("monthlyExpectation", "How do you feel about a monthly subscription for support and running costs?", ["Comfortable with a monthly fee", "Prefer a low monthly fee", "Prefer one-time cost only", "Not sure yet"])),
  s(5, sel("customInvestment", "Are you willing to invest in custom implementation?", ["Yes, if it fits our needs", "Maybe, depending on the proposal", "Prefer standard solutions", "Not sure yet"])),
  // Stage 6 — contact
  s(6, text("fullName", "Full name", { required: true, maxLength: 120 })),
  s(6, text("position", "Position / role", { required: true, maxLength: 120 })),
  s(6, { key: "email", stage: 6, label: "Company email", type: "email", required: true, maxLength: 254 }),
  s(6, { key: "phone", stage: 6, label: "Phone number (with country code)", type: "tel", required: true, maxLength: 30, placeholder: "+233…" }),
  s(6, sel("preferredChannel", "Preferred way for us to contact you", ["Email", "WhatsApp", "Phone call", "Video meeting"], { required: true })),
  s(6, area("additionalInfo", "Anything else we should know?", { maxLength: 1000 })),
  s(6, { key: "consentProcessing", stage: 6, label: "I agree that RaveSoft may use these details to analyse my business and prepare and send me a proposal, as described in the Privacy Policy.", type: "boolean", required: true }),
  s(6, { key: "consentMarketing", stage: 6, label: "I'm happy to receive occasional follow-up emails about this proposal and related RaveSoft services. I can opt out at any time.", type: "boolean", required: false }),
];

export const STAGES = [
  { n: 1, title: "Business profile", blurb: "Who you are" },
  { n: 2, title: "Operations", blurb: "How you work today" },
  { n: 3, title: "Challenges", blurb: "What slows you down" },
  { n: 4, title: "Opportunities", blurb: "What to automate" },
  { n: 5, title: "Goals & budget", blurb: "What success looks like" },
  { n: 6, title: "Contact", blurb: "Where to send your proposal" },
] as const;

/** The full ordered question list for an industry: stage by stage, industry-specific questions before universal ones in stage 2. */
export function buildQuestionSet(industryQuestions: Question[], universal: Question[] = UNIVERSAL_QUESTIONS): Question[] {
  const out: Question[] = [];
  for (const stage of [1, 2, 3, 4, 5, 6]) {
    const ind = industryQuestions.filter((q) => q.stage === stage);
    const uni = universal.filter((q) => q.stage === stage);
    out.push(...ind, ...uni);
  }
  return out;
}

export { opts };
