/** Pure proposal document builder + PDF renderer. No DB access: everything is derived from snapshots, so a version is reproducible. */
import { z } from "zod";
import { INTEGRATION_LABELS, type SolutionRecord } from "../types";
import type { BusinessAnalysis } from "../ai/schema";
import type { CompanySettings, ProposalSettings } from "../settings";
import { formatMoney, type QuoteResult } from "../pricing";
import type { ProposalQuoteInput } from "../analysis-service";
import { COLORS, PdfDoc } from "./pdf";

export interface ProposalSolution { key: string; name: string; description: string; problemAddressed: string; whyRecommended: string; workflow: string[]; capabilities: string[]; integrations: string[]; deliverables: string[]; expectedOutcome: string }

export interface ProposalContent {
  reference: string;
  preparedAt: string;
  validUntil: string | null;
  customer: { contactName: string; position: string; businessName: string; email: string; phone: string; city: string; country: string; industry: string };
  executiveSummary: string;
  understanding: string;
  challenges: string[];
  solutions: ProposalSolution[];
  integrations: string[];
  deliverables: string[];
  phases: Array<{ name: string; description: string }>;
  timeline: string;
  expectedOutcomes: string[];
  assumptions: string[];
  exclusions: string[];
  dependencies: string[];
  paymentTerms: string;
  validityText: string;
  acceptance: string;
  company: CompanySettings;
  quoteInput: ProposalQuoteInput;
  quote: QuoteResult;
  /** Free-text items shown to staff only (never in the customer PDF). */
  internalNotes: string[];
}

/** The text sections staff may edit before approval. Pricing is NOT editable as text — it is recalculated from quoteInput. */
export const EditableSectionsSchema = z.object({
  executiveSummary: z.string().min(1).max(3000),
  understanding: z.string().min(1).max(4000),
  challenges: z.array(z.string().min(1).max(400)).max(15),
  timeline: z.string().min(1).max(1500),
  expectedOutcomes: z.array(z.string().min(1).max(500)).max(12),
  assumptions: z.array(z.string().min(1).max(500)).max(15),
  exclusions: z.array(z.string().min(1).max(500)).max(15),
  dependencies: z.array(z.string().min(1).max(500)).max(15),
  paymentTerms: z.string().min(1).max(1500),
  acceptance: z.string().min(1).max(1500),
  phases: z.array(z.object({ name: z.string().min(1).max(120), description: z.string().min(1).max(600) })).max(10),
}).partial();
export type EditableSections = z.infer<typeof EditableSectionsSchema>;

const PHASES = [
  { name: "1. Discovery & scope confirmation", description: "Confirm workflows, volumes, systems and integrations with your team and agree the written scope." },
  { name: "2. Configuration & integration", description: "Configure the agents, load your approved business content and connect the integrations listed." },
  { name: "3. Testing & training", description: "Test with realistic scenarios, adjust, and train your staff on working alongside the agents." },
  { name: "4. Go-live & handover", description: "Launch with agreed monitoring, hand over documentation and confirm acceptance." },
  { name: "5. Ongoing support", description: "Monthly support and maintenance as itemised in the pricing section." },
];

export function proposalValidUntil(now: Date, days: number): Date { return new Date(now.getTime() + days * 86_400_000); }

export interface BuildInput {
  reference: string; now: Date; analysis: BusinessAnalysis; quote: QuoteResult; quoteInput: ProposalQuoteInput; solutions: SolutionRecord[];
  customer: ProposalContent["customer"]; company: CompanySettings; settings: ProposalSettings;
}

export function buildProposalContent(i: BuildInput): ProposalContent {
  const byKey = new Map(i.solutions.map((s) => [s.key, s]));
  const quoteKeys = new Set(i.quoteInput.items.map((x) => x.key));
  const recs = i.analysis.recommendations.filter((r) => quoteKeys.has(r.solutionKey));
  const solutions: ProposalSolution[] = recs.map((r) => {
    const s = byKey.get(r.solutionKey);
    return { key: r.solutionKey, name: s?.name ?? r.solutionKey, description: s?.description ?? r.howItWorks, problemAddressed: r.problemAddressed, whyRecommended: r.whyRecommended, workflow: r.workflow, capabilities: s?.capabilities ?? r.keyCapabilities, integrations: s?.integrations ?? r.requiredIntegrations, deliverables: s?.deliverables ?? [], expectedOutcome: r.expectedOutcome };
  });
  // Solutions added by staff that the AI did not recommend still need a section.
  for (const it of i.quoteInput.items) {
    if (solutions.some((s) => s.key === it.key)) continue;
    const s = byKey.get(it.key);
    if (s) solutions.push({ key: s.key, name: s.name, description: s.description, problemAddressed: s.problemsSolved[0] ?? "", whyRecommended: "Added by your RaveSoft consultant.", workflow: ["Rules and approved content agreed", "Agent handles the routine step", "Exceptions go to your team", "Activity is logged"], capabilities: s.capabilities, integrations: s.integrations, deliverables: s.deliverables, expectedOutcome: "Less manual effort on this process; benefit to be measured once baselines are known." });
  }
  const integ = [...new Set(solutions.flatMap((s) => s.integrations))].map((k) => INTEGRATION_LABELS[k] ?? k);
  const deliverables = [...new Set(solutions.flatMap((s) => s.deliverables))];
  const dependencies = [...new Set([...i.analysis.risks, ...solutions.flatMap((s) => byKey.get(s.key)?.dependencies ?? [])])];
  const names = solutions.map((s) => s.name);
  const c = i.customer;
  const weeks = i.quote.totalDeliveryWeeks;

  return {
    reference: i.reference, preparedAt: i.now.toISOString(),
    validUntil: proposalValidUntil(i.now, i.settings.validityDays).toISOString(),
    customer: c,
    executiveSummary: `RaveSoft reviewed the business assessment submitted by ${c.businessName}. Based on the information provided, we recommend ${names.length} AI solution${names.length === 1 ? "" : "s"}: ${names.join(", ")}. ${i.analysis.implementationScope} This proposal sets out the scope, integrations, investment and timeline for your review.`,
    understanding: `${i.analysis.businessOverview.summary}\n\nWhere we have inferred something rather than been told it, we have marked it as an assumption below so you can correct it.`,
    challenges: i.analysis.operationalProblems.map((p) => p.problem),
    solutions, integrations: integ, deliverables,
    phases: PHASES,
    timeline: weeks != null ? `Estimated delivery: up to ${weeks} week${weeks === 1 ? "" : "s"} from project kick-off, subject to timely access to systems and content. ${i.analysis.deliveryTimelineNote}` : `${i.analysis.deliveryTimelineNote} A firm timeline will be provided once scope and integrations are confirmed.`,
    expectedOutcomes: i.analysis.expectedOutcomes.map((o) => `${o.text} (${o.basis === "ESTIMATE" ? "our expectation" : o.basis === "CUSTOMER_PROVIDED" ? "as you described" : "our inference"})`),
    assumptions: [...i.settings.assumptions, ...i.analysis.informationGaps.map((g) => `Open question: ${g}`)],
    exclusions: i.settings.exclusions,
    dependencies,
    paymentTerms: i.settings.paymentTermsNote,
    validityText: `This proposal is valid until ${new Date(proposalValidUntil(i.now, i.settings.validityDays)).toDateString()}.`,
    acceptance: i.settings.acceptanceInstructions,
    company: i.company, quoteInput: i.quoteInput, quote: i.quote,
    internalNotes: i.quote.missing,
  };
}

export const PROPOSAL_TITLE = "AI BUSINESS AUTOMATION IMPLEMENTATION PROPOSAL";

export function renderProposalPdf(c: ProposalContent, o: { final: boolean }): Buffer {
  const q = c.quote;
  const complete = q.status === "COMPLETE";
  const doc = new PdfDoc({ title: `${PROPOSAL_TITLE} — ${c.customer.businessName}`, footerLeft: `${c.reference} · ${c.company.name} · Confidential` });
  doc.coverPage({
    eyebrow: PROPOSAL_TITLE,
    title: `Prepared for ${c.customer.businessName}`,
    subtitle: `${c.customer.industry} — personalised AI automation proposal`,
    meta: [["Proposal reference", c.reference], ["Prepared for", `${c.customer.contactName}${c.customer.position ? `, ${c.customer.position}` : ""}`], ["Date", new Date(c.preparedAt).toDateString()], ["Status", o.final && complete ? "Issued" : "DRAFT — not yet approved for release"]],
    footer: `${c.company.name} · ${c.company.location}`,
  });

  if (!o.final || !complete) doc.callout(!complete ? "DRAFT — pricing is pending RaveSoft review. This document is not a quotation and contains no binding prices." : "DRAFT — pending RaveSoft approval. Not yet a binding proposal.", "#FFF4D6");

  doc.heading("1. Customer details");
  doc.keyValues([["Business", c.customer.businessName], ["Contact", c.customer.contactName], ["Position", c.customer.position], ["Email", c.customer.email], ["Phone", c.customer.phone], ["Location", [c.customer.city, c.customer.country].filter(Boolean).join(", ")], ["Industry", c.customer.industry]]);
  doc.heading("2. Executive summary"); doc.paragraph(c.executiveSummary);
  doc.heading("3. Understanding of your business"); doc.paragraph(c.understanding);
  doc.heading("4. Identified challenges"); doc.bullets(c.challenges.length ? c.challenges : ["No specific challenges were selected."]);

  doc.heading("5. Recommended AI solutions");
  doc.bullets(c.solutions.map((s) => s.name));
  doc.heading("6. Solution descriptions & workflows");
  for (const s of c.solutions) {
    doc.heading(s.name, 2);
    doc.paragraph(s.description);
    doc.paragraph(`Problem addressed: ${s.problemAddressed}`, { color: COLORS.muted });
    doc.paragraph(`Why we recommend it: ${s.whyRecommended}`);
    doc.paragraph("How it works", { bold: true, after: 2 }); doc.bullets(s.workflow);
    doc.paragraph("Key capabilities", { bold: true, after: 2 }); doc.bullets(s.capabilities);
  }
  doc.heading("7. Technical integrations"); doc.bullets(c.integrations.length ? c.integrations : ["No external integrations required."]);
  doc.paragraph("Integration depends on each system offering an API or data export. Any limitation found during discovery will be raised with you before work proceeds.", { color: COLORS.muted });
  doc.heading("8. Deliverables"); doc.bullets(c.deliverables);
  doc.heading("9. Implementation phases"); doc.bullets(c.phases.map((p) => `${p.name} — ${p.description}`));
  doc.heading("10. Project timeline"); doc.paragraph(c.timeline);

  doc.heading("11. Itemised pricing");
  if (!complete) {
    doc.callout("Pricing for this proposal is being finalised by RaveSoft. Our team will confirm the investment before this proposal is released.", "#FFF4D6");
  } else {
    const cur = q.currency;
    const oneTime = q.lines.filter((l) => l.included && !l.recurring && l.kind !== "TAX" && l.kind !== "DISCOUNT");
    doc.table([{ header: "Item", width: 4 }, { header: "Qty", width: 0.6, align: "right" }, { header: "Unit", width: 1.4, align: "right" }, { header: "Total", width: 1.5, align: "right" }],
      oneTime.map((l) => [l.name + (l.complexity ? ` (${l.complexity.toLowerCase()} complexity)` : ""), String(l.quantity), formatMoney(l.unitPrice, cur), formatMoney(l.total, cur)]));
    const disc = q.lines.filter((l) => l.kind === "DISCOUNT");
    const taxInit = q.lines.filter((l) => l.kind === "TAX" && !l.recurring);
    doc.table([{ header: "Initial investment summary", width: 5 }, { header: "Amount", width: 1.5, align: "right" }], [
      ["Implementation subtotal", formatMoney(q.initialSubtotal, cur)],
      ...disc.map((l) => [l.name, formatMoney(l.total, cur)]),
      ...taxInit.map((l) => [l.name, formatMoney(l.total, cur)]),
      [`Initial investment (${cur})`, formatMoney(q.initialTotal, cur)],
    ], { boldLast: true });

    doc.heading("12. Monthly recurring costs");
    const rec = q.lines.filter((l) => l.included && l.recurring && l.kind !== "TAX");
    const taxRec = q.lines.filter((l) => l.kind === "TAX" && l.recurring);
    doc.table([{ header: "Recurring item", width: 5 }, { header: "Monthly", width: 1.5, align: "right" }], [
      ...rec.map((l) => [l.name + (l.quantity > 1 ? ` × ${l.quantity}` : ""), formatMoney(l.total, cur)]),
      ...taxRec.map((l) => [l.name, formatMoney(l.total, cur)]),
      [`Monthly total (${cur})`, formatMoney(q.monthlyTotal, cur)],
    ], { boldLast: true });
    const optional = q.lines.filter((l) => !l.included);
    if (optional.length) { doc.paragraph("Optional services (not included in the totals above)", { bold: true, after: 2 }); doc.bullets(optional.map((l) => `${l.name} — ${formatMoney(l.total, cur)}${l.recurring ? " per month" : ""}`)); }
    if (q.fx) doc.paragraph(`Amounts shown in ${cur}, converted from ${q.baseCurrency} at ${q.fx.rate} (${q.fx.source}, ${new Date(q.fx.asOf).toDateString()}).`, { color: COLORS.muted });
  }

  doc.heading("13. Expected business outcomes"); doc.bullets(c.expectedOutcomes);
  doc.paragraph("Outcomes are expectations, not guarantees. We have not assumed any revenue, savings or conversion figures; benefits are measured against the baselines we agree with you.", { color: COLORS.muted });
  doc.heading("14. Assumptions"); doc.bullets(c.assumptions);
  doc.heading("15. Exclusions"); doc.bullets(c.exclusions);
  doc.heading("16. Dependencies"); doc.bullets(c.dependencies);
  doc.heading("17. Payment terms");
  doc.paragraph(c.paymentTerms);
  if (complete && q.paymentSchedule.length) doc.table([{ header: "Milestone", width: 4 }, { header: "%", width: 0.8, align: "right" }, { header: "Amount", width: 1.6, align: "right" }], q.paymentSchedule.map((m) => [m.label, `${m.percent}%`, formatMoney(m.amount, q.currency)]));
  doc.heading("18. Proposal validity"); doc.paragraph(c.validityText);
  doc.heading("19. Acceptance instructions"); doc.paragraph(c.acceptance);
  doc.heading("20. About RaveSoft");
  doc.keyValues([["Company", c.company.name], ["Location", c.company.location], ["Email", c.company.email], ["Phone / WhatsApp", `${c.company.phone} / ${c.company.whatsapp}`], ["Website", c.company.website]]);
  return doc.build();
}
