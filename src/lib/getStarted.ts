/**
 * Single source of truth for the /get-started landing page: the solution and business-type options,
 * the query-string aliases used in ad URLs, and the client-side validation rules.
 * Pure data + functions (no React, no server code) so the page, the form and the tests share it.
 * The API validates independently (src/lib/enquiry.ts) — this module is never trusted by the server.
 */

export const BUSINESS_TYPES = [
  { value: "retail", label: "Retail / Supermarket / Wholesale" },
  { value: "hospitality", label: "Hospitality / Hotel" },
  { value: "restaurant", label: "Restaurant / Food Service" },
  { value: "healthcare", label: "Healthcare / Hospital / Clinic" },
  { value: "education", label: "Education / School" },
  { value: "legal-professional", label: "Legal / Professional Services" },
  { value: "real-estate", label: "Real Estate" },
  { value: "financial-services", label: "Financial Services" },
  { value: "manufacturing-distribution", label: "Manufacturing / Distribution" },
  { value: "other", label: "Other" },
] as const;
export type BusinessTypeValue = (typeof BUSINESS_TYPES)[number]["value"];
export const BUSINESS_TYPE_VALUES = BUSINESS_TYPES.map((b) => b.value) as [BusinessTypeValue, ...BusinessTypeValue[]];

export type SolutionCategory = "business" | "industry" | "development" | "ai" | "other";

export interface Solution {
  value: string;
  /** Exact option text shown in the form and stored on the lead. */
  label: string;
  category: SolutionCategory;
  /** Short business-focused description used on cards and in the "selected interest" summary. */
  blurb: string;
}

export const SOLUTIONS = [
  { value: "pos", label: "POS / Retail Management Software", category: "business", blurb: "Sales, inventory, receipts, customers and reporting for shops, supermarkets, pharmacies and multi-branch retail. CliqPOS is RaveSoft's cloud POS." },
  { value: "erp", label: "ERP / Business Management Software", category: "business", blurb: "One system for sales, inventory, procurement, HR, accounting and reporting across your departments." },
  { value: "hospital-management", label: "Hospital Management System", category: "industry", blurb: "Patient records, appointments, billing, pharmacy and lab workflows for hospitals and clinics." },
  { value: "hotel-management", label: "Hotel Management System", category: "industry", blurb: "Bookings, rooms, guests, billing and housekeeping for hotels, guest houses and lodges." },
  { value: "school-management", label: "School Management System", category: "industry", blurb: "Admissions, fees, attendance, results and parent communication for schools and colleges." },
  { value: "restaurant-management", label: "Restaurant Management System", category: "industry", blurb: "Orders, tables, kitchen flow, stock and daily sales reporting for restaurants and food service." },
  { value: "legal-practice", label: "Legal Practice Management Software", category: "industry", blurb: "Matters, clients, documents, deadlines and billing for law firms and professional practices." },
  { value: "custom-software", label: "Custom Software Development", category: "development", blurb: "Software designed around how your business actually works, when off-the-shelf tools don't fit." },
  { value: "website-development", label: "Website Development", category: "development", blurb: "Fast, professional websites and web applications that present your business and capture enquiries." },
  { value: "mobile-app", label: "Mobile App Development", category: "development", blurb: "iOS and Android applications for your customers, staff or field teams." },
  { value: "ai-agents", label: "AI Agents / AI Employees", category: "ai", blurb: "AI assistants that answer customers, qualify enquiries and follow up on channels like WhatsApp and web chat." },
  { value: "business-automation", label: "Business Process Automation", category: "ai", blurb: "Automate repetitive admin, approvals, reporting and hand-offs between your systems and teams." },
  { value: "other", label: "Other / Not Sure Yet", category: "other", blurb: "Not sure what you need? Describe the problem and we'll help you work out the right solution." },
] as const satisfies readonly Solution[];

export type SolutionValue = (typeof SOLUTIONS)[number]["value"];
export const SOLUTION_VALUES = SOLUTIONS.map((s) => s.value) as [SolutionValue, ...SolutionValue[]];

export const solutionByValue = (v: string | null | undefined): Solution | undefined => SOLUTIONS.find((s) => s.value === v);

/** Query-string values used in ads → form option. Anything not listed (or not a string) is ignored. */
const ALIASES: Record<string, SolutionValue> = {
  cliqpos: "pos",
  pos: "pos",
  erp: "erp",
  "hospital-management": "hospital-management",
  hospital: "hospital-management",
  "hotel-management": "hotel-management",
  hotel: "hotel-management",
  "school-management": "school-management",
  school: "school-management",
  "restaurant-management": "restaurant-management",
  restaurant: "restaurant-management",
  "legal-practice": "legal-practice",
  legal: "legal-practice",
  "custom-software": "custom-software",
  website: "website-development",
  "website-development": "website-development",
  "mobile-app": "mobile-app",
  mobile: "mobile-app",
  "ai-automation": "ai-agents",
  "ai-agents": "ai-agents",
  "ai-employee": "ai-agents",
  automation: "business-automation",
  "business-automation": "business-automation",
  other: "other",
};

/** Safely maps an untrusted query value to a known solution (case-insensitive, trimmed). Unknown → undefined. */
export function resolveSolution(raw: string | string[] | null | undefined): Solution | undefined {
  const v = Array.isArray(raw) ? raw[0] : raw;
  if (typeof v !== "string") return undefined;
  const key = v.trim().toLowerCase().slice(0, 60);
  if (!Object.prototype.hasOwnProperty.call(ALIASES, key)) return undefined;
  return solutionByValue(ALIASES[key]);
}

export const SOLUTION_CATEGORIES: { key: SolutionCategory; title: string }[] = [
  { key: "business", title: "Business Management Software" },
  { key: "industry", title: "Industry-Specific Software" },
  { key: "development", title: "Custom Software Development" },
  { key: "ai", title: "AI Agents and Business Automation" },
];

// ── Client-side validation (the API re-validates everything independently) ───────────────────────

export interface LeadValues {
  fullName: string;
  businessName: string;
  phone: string;
  email: string;
  businessType: string;
  solution: string;
  message: string;
}
export type LeadField = keyof LeadValues;
export type LeadErrors = Partial<Record<LeadField, string>>;

export const FIELD_ORDER: LeadField[] = ["fullName", "businessName", "phone", "email", "businessType", "solution", "message"];
export const MESSAGE_MAX = 2000;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function validateLead(v: LeadValues): LeadErrors {
  const e: LeadErrors = {};
  const name = v.fullName.trim();
  if (name.length < 2) e.fullName = "Please enter your full name.";
  else if (name.length > 120) e.fullName = "That name is too long.";

  const biz = v.businessName.trim();
  if (biz.length < 2) e.businessName = "Please enter your business name.";
  else if (biz.length > 160) e.businessName = "That name is too long.";

  const phone = v.phone.trim();
  const digits = phone.replace(/\D/g, "");
  if (!phone) e.phone = "Please enter a phone or WhatsApp number.";
  else if (!/^[+(\d][\d\s()-]*$/.test(phone) || digits.length < 7 || digits.length > 15)
    e.phone = "Enter a valid number, e.g. +233 24 123 4567.";

  const email = v.email.trim();
  if (!email) e.email = "Please enter your business email.";
  else if (!EMAIL_RE.test(email) || email.length > 254) e.email = "Enter a valid email address, e.g. name@company.com.";

  if (!v.businessType) e.businessType = "Please choose your business type.";
  else if (!(BUSINESS_TYPE_VALUES as string[]).includes(v.businessType)) e.businessType = "Please choose from the list.";

  if (!v.solution) e.solution = "Please choose the solution you need.";
  else if (!(SOLUTION_VALUES as string[]).includes(v.solution)) e.solution = "Please choose from the list.";

  if (v.message.length > MESSAGE_MAX) e.message = `Please keep this under ${MESSAGE_MAX} characters.`;
  return e;
}

/** The exact enquiry text sent for WhatsApp follow-up (contains no personal details). */
export const whatsappText = (solutionLabel?: string) =>
  `Hi RaveSoft, I just sent an enquiry on your website${solutionLabel ? ` about: ${solutionLabel}` : ""}.`;
