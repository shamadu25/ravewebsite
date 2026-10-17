import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/os/audit";
import { GROWTH_ORG } from "../config";
import { processGrowthReplies } from "../replies";
import { growthFunnel, lastDays } from "../funnel";
import { runScout } from "./scout-agent";
import { runOutreachAgent } from "./outreach-agent";
import { runReplyAgent } from "./reply-agent";
import { runConversionAgent } from "./conversion-agent";

export const AGENT_NAMES = ["scout", "outreach", "reply", "conversion"] as const;
export type AgentName = (typeof AGENT_NAMES)[number];

export interface AgentRunOptions { agents?: AgentName[]; areas?: string[]; profileKeys?: string[]; limits?: { scout?: number; outreach?: number; reply?: number } }

/** What only a human can do next. This is the daily "founder inbox". */
export async function humanQueue() {
  const [drafts, replyDrafts, escalated, needReview, needPerson] = await Promise.all([
    prisma.grDraft.count({ where: { status: "PENDING_APPROVAL" } }),
    prisma.grReplyDraft.count({ where: { status: "PENDING_APPROVAL" } }),
    prisma.grReply.count({ where: { reviewStatus: "ESCALATED" } }),
    prisma.grReply.count({ where: { reviewStatus: "NEEDS_REVIEW" } }),
    prisma.grCompany.count({ where: { orgId: GROWTH_ORG, status: "QUALIFIED", outreachDisabled: false, people: { none: { verified: true } } } }),
  ]);
  return { outreachDraftsToApprove: drafts, replyDraftsToApprove: replyDrafts, escalatedToFounder: escalated, repliesNeedingReview: needReview, qualifiedCompaniesNeedingDecisionMaker: needPerson };
}

/** Order matters: replies are classified before anything is drafted, so no follow-up is prepared for someone who has answered. */
export async function runMarketingAgent(o: AgentRunOptions = {}) {
  const which = new Set(o.agents?.length ? o.agents : AGENT_NAMES);
  const report: Record<string, unknown> = {};
  const step = async (name: string, fn: () => Promise<unknown>) => {
    try { report[name] = await fn(); } catch (e) { report[name] = { error: e instanceof Error ? e.message : "failed" }; }
  };
  await step("replies", () => processGrowthReplies());
  if (which.has("scout") && o.areas?.length) await step("scout", () => runScout({ areas: o.areas as string[], profileKeys: o.profileKeys, limitPerQuery: o.limits?.scout }));
  else if (which.has("scout")) report.scout = { skipped: "No service areas given." };
  if (which.has("reply")) await step("reply", () => runReplyAgent(o.limits?.reply));
  if (which.has("conversion")) await step("conversion", () => runConversionAgent());
  if (which.has("outreach")) await step("outreach", () => runOutreachAgent(o.limits?.outreach));
  await step("funnel7d", async () => { const { from, to } = lastDays(7); return growthFunnel(from, to); });
  report.humanQueue = await humanQueue();
  await audit({ actor: "agent:marketing", actorType: "AI_AGENT", action: "growth.agent.run", resource: "growth_agent", output: { agents: [...which], humanQueue: report.humanQueue } });
  return report;
}
