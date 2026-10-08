import { prisma } from "@/lib/prisma";
import { ORG_ID } from "./constants";

export interface EmployeeTemplateDef {
  key: string;
  industry: string;
  name: string;
  role: string;
  description: string;
  keywords: string[];
  employees: string[];
  monthlyPriceUsd: number;
}

/** Built-in vertical templates. More can be added at runtime in os_employee_templates — no code change. */
export const DEFAULT_TEMPLATES: EmployeeTemplateDef[] = [
  { key: "dental", industry: "Dental", name: "AI Dental Receptionist", role: "Receptionist", description: "Answers patient enquiries, books appointments and follows up on no-shows.", keywords: ["dental", "dentist", "orthodont", "teeth"], employees: ["AI Dental Receptionist", "AI Appointment Agent", "AI Follow-up Employee"], monthlyPriceUsd: 125 },
  { key: "hotel", industry: "Hotel", name: "AI Reservations Employee", role: "Reservations", description: "Handles booking enquiries, guest questions and upsells.", keywords: ["hotel", "lodge", "guesthouse", "resort", "hospitality"], employees: ["AI Reservations Employee", "AI Guest Support Employee", "AI Sales Employee"], monthlyPriceUsd: 199 },
  { key: "real-estate", industry: "Real Estate", name: "AI Lead Qualification Employee", role: "Lead qualification", description: "Qualifies property enquiries and books viewings.", keywords: ["real estate", "realtor", "property", "properties", "estate agent"], employees: ["AI Lead Qualification Employee", "AI Property Sales Employee", "AI Follow-up Employee"], monthlyPriceUsd: 249 },
  { key: "restaurant", industry: "Restaurant", name: "AI Reservation Employee", role: "Reservations", description: "Takes reservations and answers menu and order questions.", keywords: ["restaurant", "cafe", "bistro", "catering"], employees: ["AI Reservation Employee", "AI Customer Support Employee", "AI Order Support Employee"], monthlyPriceUsd: 99 },
  { key: "retail", industry: "Retail", name: "AI Sales Assistant", role: "Sales", description: "Answers product questions and recovers abandoned enquiries.", keywords: ["retail", "shop", "store", "supermarket"], employees: ["AI Sales Employee", "AI Customer Support Employee"], monthlyPriceUsd: 99 },
  { key: "pharmacy", industry: "Pharmacy", name: "AI Pharmacy Assistant", role: "Customer support", description: "Handles stock enquiries and refill reminders.", keywords: ["pharmacy", "chemist", "drugstore"], employees: ["AI Customer Support Employee", "AI Follow-up Employee"], monthlyPriceUsd: 99 },
  { key: "education", industry: "Education", name: "AI Admissions Employee", role: "Admissions", description: "Answers admissions questions and nurtures applicants.", keywords: ["school", "university", "college", "academy", "education"], employees: ["AI Admissions Employee", "AI Follow-up Employee"], monthlyPriceUsd: 149 },
  { key: "insurance", industry: "Insurance", name: "AI Insurance Lead Employee", role: "Lead qualification", description: "Qualifies quote requests and books advisor calls.", keywords: ["insurance", "assurance", "underwriter"], employees: ["AI Lead Qualification Employee", "AI Follow-up Employee"], monthlyPriceUsd: 179 },
  { key: "automotive", industry: "Automotive", name: "AI Service Booking Employee", role: "Service booking", description: "Books services and qualifies car-sales enquiries.", keywords: ["automotive", "car dealer", "garage", "motors", "vehicle"], employees: ["AI Appointment Agent", "AI Sales Employee"], monthlyPriceUsd: 149 },
  { key: "legal", industry: "Legal", name: "AI Legal Intake Employee", role: "Intake", description: "Collects matter details and books consultations.", keywords: ["law firm", "legal", "attorney", "solicitor", "chambers"], employees: ["AI Intake Employee", "AI Appointment Agent"], monthlyPriceUsd: 199 },
  { key: "beauty", industry: "Beauty", name: "AI Salon Booking Employee", role: "Booking", description: "Books appointments and sends reminders.", keywords: ["salon", "spa", "beauty", "barber", "makeup"], employees: ["AI Appointment Agent", "AI Follow-up Employee"], monthlyPriceUsd: 89 },
  { key: "professional-services", industry: "Professional Services", name: "AI Lead Generation Employee", role: "Lead generation", description: "Qualifies inbound enquiries and follows up.", keywords: ["consult", "accounting", "agency", "firm", "services"], employees: ["AI Lead Generation Employee", "AI Follow-up Employee"], monthlyPriceUsd: 149 },
];

export async function loadTemplates(): Promise<EmployeeTemplateDef[]> {
  const custom = await prisma.osEmployeeTemplate.findMany({ where: { orgId: ORG_ID } });
  const byKey = new Map<string, EmployeeTemplateDef>(DEFAULT_TEMPLATES.map((t) => [t.key, t]));
  for (const c of custom) {
    byKey.set(c.key, {
      key: c.key,
      industry: c.industry,
      name: c.name,
      role: c.role,
      description: c.description ?? "",
      keywords: c.keywords as string[],
      employees: c.employees as string[],
      monthlyPriceUsd: c.monthlyPriceUsd,
    });
  }
  return [...byKey.values()];
}

export interface Recommendation {
  template: EmployeeTemplateDef | null;
  matchedOn: string | null;
  employees: string[];
  suggestedMonthlyPriceUsd: number | null;
}

export function recommendEmployees(industryOrText: string | null | undefined, templates: EmployeeTemplateDef[]): Recommendation {
  const text = (industryOrText ?? "").toLowerCase();
  if (!text) return { template: null, matchedOn: null, employees: [], suggestedMonthlyPriceUsd: null };

  let best: { t: EmployeeTemplateDef; kw: string } | null = null;
  for (const t of templates) {
    const kw = [t.industry.toLowerCase(), ...t.keywords.map((k) => k.toLowerCase())].find((k) => new RegExp(`\\b${k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`).test(text));
    if (kw && (!best || kw.length > best.kw.length)) best = { t, kw };
  }
  if (!best) return { template: null, matchedOn: null, employees: [], suggestedMonthlyPriceUsd: null };
  return { template: best.t, matchedOn: best.kw, employees: best.t.employees, suggestedMonthlyPriceUsd: best.t.monthlyPriceUsd };
}
