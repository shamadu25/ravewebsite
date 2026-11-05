import type { AnalysisContext } from "./context";
import type { BusinessAnalysis } from "./schema";
import { CHALLENGE_OPTIONS, INTEGRATION_LABELS } from "../types";

const challengeLabel = (v: string) => CHALLENGE_OPTIONS.find((c) => c.value === v)?.label ?? v;

/** Rules-based analysis built only from customer facts and catalogue content. Used when no AI provider is available or its output fails validation. */
export function buildRulesAnalysis(ctx: AnalysisContext): BusinessAnalysis {
  const p = ctx.profile as Record<string, string | undefined>;
  const name = p.businessName ?? "The business";
  const problems = ctx.challenges.map((c) => ({ problem: challengeLabel(c), basis: "CUSTOMER_PROVIDED" as const }));
  const recs = ctx.candidates.slice(0, 6).map((c, i) => ({
    solutionKey: c.key,
    problemAddressed: c.problemsSolved[0] ?? "Repetitive manual work",
    whyRecommended: c.matchReasons.join(" "),
    howItWorks: c.description,
    workflow: ["Agreed rules and approved business content are loaded", "The agent handles the routine step automatically", "Anything outside its rules is handed to your team with the context attached", "Activity is logged for review"],
    requiredIntegrations: c.integrations,
    keyCapabilities: c.capabilities.slice(0, 6),
    expectedOutcome: `Less manual effort on this process and a more consistent result; the size of the benefit will be agreed once current volumes and response times are measured.`,
    priority: (i < 2 ? "HIGH" : i < 4 ? "MEDIUM" : "LOW") as "HIGH" | "MEDIUM" | "LOW",
    complexity: (["LOW", "MEDIUM", "HIGH"].includes(c.defaultComplexity) ? c.defaultComplexity : "MEDIUM") as "LOW" | "MEDIUM" | "HIGH",
  }));
  const integ = [...new Set(ctx.candidates.flatMap((c) => c.integrations))].map((k) => INTEGRATION_LABELS[k] ?? k);

  const gaps: string[] = [];
  if (!ctx.profile.website) gaps.push("No website provided — we cannot review how customers currently reach the business online.");
  if (!ctx.profile.existingSoftware) gaps.push("Existing software is not described — integration requirements are unconfirmed.");
  if (!ctx.profile.budget || ctx.profile.budget === "Prefer not to say" || ctx.profile.budget === "Not sure yet") gaps.push("Budget was not disclosed; this does not affect the recommendation.");
  gaps.push("Current volumes, response times and costs are needed to quantify benefits; none have been estimated here.");

  return {
    businessOverview: {
      summary: `${name} operates in ${ctx.industry.name}${p.country ? ` in ${p.city ? p.city + ", " : ""}${p.country}` : ""}${p.employees ? ` with ${p.employees} employees` : ""}. ${p.description ?? ""}`.trim(),
      claims: [{ text: `Industry: ${ctx.industry.name}.`, basis: "CUSTOMER_PROVIDED" }],
    },
    operationalProblems: problems.length ? problems : [{ problem: "No specific challenges were selected.", basis: "UNKNOWN" }],
    rootCauses: [],
    opportunities: recs.map((r, i) => ({ title: ctx.candidates[i].name, description: r.problemAddressed, basis: "INFERENCE" as const })),
    recommendations: recs.length ? recs : [{
      solutionKey: "none", problemAddressed: "Not determined", whyRecommended: "No catalogue solution matched; manual review required.", howItWorks: "A RaveSoft consultant will review the assessment.", workflow: ["Manual review"], requiredIntegrations: [], keyCapabilities: ["Manual consultation"], expectedOutcome: "To be determined.", priority: "MEDIUM" as const, complexity: "MEDIUM" as const,
    }],
    implementationScope: `Implementation of ${recs.length || 0} AI agent(s)${integ.length ? ` with integration to: ${integ.join(", ")}` : ""}. Final scope, integrations and timeline are confirmed in the proposal after discovery.`,
    implementationComplexity: recs.some((r) => r.complexity === "HIGH") ? "HIGH" : "MEDIUM",
    deliveryTimelineNote: "Delivery timeline is confirmed in the proposal once scope and integrations are agreed.",
    expectedOutcomes: [{ text: "More consistent handling of the processes automated, with staff time redirected to higher-value work. Benefits are not quantified until baseline data is available.", basis: "ESTIMATE" }],
    risks: ["Integration feasibility depends on the APIs or exports offered by your existing systems.", "Business content (FAQs, policies, price lists) must be supplied and kept current.", "A named owner on your side is needed for approvals and testing."],
    informationGaps: gaps,
    nextSteps: ["A RaveSoft consultant reviews this assessment and the proposed solutions", "We confirm integration details and any open questions with you", "You receive a priced proposal for review"],
    needsMoreInfo: ctx.candidates.length === 0,
  };
}
