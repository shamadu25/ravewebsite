import { prisma } from "@/lib/prisma";
import { COMPANY } from "@/lib/data";
import { BASE_CURRENCY, type Currency } from "./types";
import { DEFAULT_QUALIFICATION, type QualificationConfig } from "./qualification";
import type { FxConfig } from "./pricing";

export interface ProposalSettings {
  validityDays: number;
  /** When true every proposal needs a human approval before it can be sent. Strongly recommended; default true. */
  requireApproval: boolean;
  acceptanceInstructions: string;
  assumptions: string[];
  exclusions: string[];
  paymentTermsNote: string;
}
export interface CompanySettings { name: string; email: string; phone: string; whatsapp: string; location: string; website: string; salesNotificationEmail: string }
export interface AiSettings { enabled: boolean }

export const DEFAULT_PROPOSAL: ProposalSettings = {
  validityDays: 30,
  requireApproval: true,
  acceptanceInstructions: "To accept this proposal, reply to the email it was sent with (or contact us using the details below) confirming that you accept, and name the person authorised to sign for your business. We will then confirm the scope in writing and issue the first invoice per the payment schedule.",
  assumptions: [
    "Scope, integrations and timeline are as described in this proposal and confirmed during discovery.",
    "Your team supplies the business content the agents need (FAQs, policies, price lists) and keeps it current.",
    "A named representative on your side is available for approvals and testing.",
    "Third-party platforms (for example WhatsApp Business Platform) are subject to their own terms, approvals and charges.",
  ],
  exclusions: [
    "Charges levied directly by third-party providers unless itemised in this proposal.",
    "Work on systems or integrations not listed in this proposal.",
    "Changes to scope after acceptance, which are quoted separately.",
  ],
  paymentTermsNote: "Amounts are payable according to the payment schedule in this proposal.",
};

export const DEFAULT_SETTINGS = {
  "qualification": DEFAULT_QUALIFICATION,
  "pricing.fx": { base: BASE_CURRENCY, rates: {} } as FxConfig,
  "proposal": DEFAULT_PROPOSAL,
  "ai": { enabled: true } as AiSettings,
} as const;

export function defaultCompany(): CompanySettings {
  return {
    name: COMPANY.name, email: COMPANY.email, phone: COMPANY.phoneGhana, whatsapp: COMPANY.whatsapp, location: COMPANY.location, website: COMPANY.website,
    salesNotificationEmail: process.env.LEAD_NOTIFICATION_EMAIL ?? process.env.CONTACT_EMAIL ?? COMPANY.email,
  };
}

export async function getSetting<T>(key: string, fallback: T): Promise<T> {
  try {
    const row = await prisma.aiAutomationSetting.findUnique({ where: { key } });
    if (!row) return fallback;
    const v = row.value as unknown;
    if (v && typeof v === "object" && !Array.isArray(v) && fallback && typeof fallback === "object" && !Array.isArray(fallback)) return { ...(fallback as object), ...(v as object) } as T;
    return v as T;
  } catch { return fallback; }
}

export async function setSetting(key: string, value: unknown, actor: string): Promise<void> {
  await prisma.aiAutomationSetting.upsert({ where: { key }, create: { key, value: value as never, updatedBy: actor }, update: { value: value as never, updatedBy: actor } });
}

export const getQualificationConfig = () => getSetting<QualificationConfig>("qualification", DEFAULT_QUALIFICATION);
export const getFxConfig = () => getSetting<FxConfig>("pricing.fx", DEFAULT_SETTINGS["pricing.fx"]);
export const getProposalSettings = () => getSetting<ProposalSettings>("proposal", DEFAULT_PROPOSAL);
export const getCompany = () => getSetting<CompanySettings>("company", defaultCompany());

export const SUPPORTED_QUOTE_CURRENCIES = async (): Promise<Currency[]> => {
  const fx = await getFxConfig();
  return [fx.base, ...((Object.keys(fx.rates) as Currency[]).filter((c) => fx.rates[c]?.rate))];
};
