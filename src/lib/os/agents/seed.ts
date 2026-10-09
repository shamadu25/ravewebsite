import { prisma } from "@/lib/prisma";
import { ORG_ID } from "../constants";
import { audit } from "../audit";
import { DEFAULT_TEMPLATES } from "../recommend";
import { AGENT_ROSTER, buildSystemPrompt } from "./roster";
import { BRAIN_SECTIONS } from "../brain";
import { seedCompanyKnowledge } from "./knowledge";

export function agentDataFromSeed(a: (typeof AGENT_ROSTER)[number]) {
  return {
    orgId: ORG_ID, key: a.key, name: a.name, description: a.mission, department: a.department, role: a.role, parentKey: a.parentKey,
    isDirector: a.isDirector ?? false, handler: a.handler ?? null, systemPrompt: buildSystemPrompt(a),
    status: a.active ? "ACTIVE" : "DRAFT", autonomy: a.autonomy, modelTier: a.tier, tools: a.tools, knowledgeSources: a.sections,
    triggerTypes: a.handler ? ["SCHEDULE", "MANUAL", "AGENT_COMPLETED"] : ["MANUAL"], approvalRules: { alwaysFor: [] },
    budgetLimitUsd: a.budgetUsd ?? 25, heartbeatMinutes: a.heartbeatMinutes ?? null, owner: "ceo",
  };
}

/** Idempotent. Creates missing agents/templates/brain scaffolding; never overwrites admin edits to existing agents. */
export async function seedOperatingSystem() {
  let agentsCreated = 0;
  for (const a of AGENT_ROSTER) {
    const exists = await prisma.osAgent.findUnique({ where: { key: a.key } });
    if (exists) continue;
    const row = await prisma.osAgent.create({ data: agentDataFromSeed(a) });
    await prisma.osAgentVersion.create({ data: { agentId: row.id, version: 1, snapshot: agentDataFromSeed(a) as never, changedBy: "seed", note: "Initial version" } });
    agentsCreated++;
  }

  let templatesCreated = 0;
  for (const t of DEFAULT_TEMPLATES) {
    const exists = await prisma.osEmployeeTemplate.findUnique({ where: { orgId_key: { orgId: ORG_ID, key: t.key } } });
    if (exists) continue;
    await prisma.osEmployeeTemplate.create({ data: { orgId: ORG_ID, key: t.key, industry: t.industry, name: t.name, role: t.role, description: t.description, keywords: t.keywords, employees: t.employees, monthlyPriceUsd: t.monthlyPriceUsd } });
    templatesCreated++;
  }

  let brainCreated = 0;
  const core = [
    { section: "Mission", title: "RaveSoft mission", content: "RaveSoft is an AI-native company that builds AI Employees for businesses and uses AI Employees internally to run the company." },
    { section: "Revenue Goals", title: "Annual revenue target", content: "Grow RaveSoft to $500,000+ annual recurring revenue (configurable in Goals)." },
    { section: "Products", title: "Product portfolio", content: "CliqPOS (POS), KOVABOT (customer-facing AI Employee platform), HMS (hotel management), Restovax (restaurant), AI Employee implementation services, enterprise AI automation." },
    { section: "Policies", title: "Outreach policy", content: "No unsolicited messages without an approved channel. Always include an opt-out. Honour opt-outs immediately. Never make false claims." },
  ];
  for (const c of core) {
    const exists = await prisma.osBrainEntry.findFirst({ where: { orgId: ORG_ID, section: c.section, title: c.title } });
    if (exists) continue;
    await prisma.osBrainEntry.create({ data: { orgId: ORG_ID, ...c, tags: [], createdBy: "seed" } });
    brainCreated++;
  }
  void BRAIN_SECTIONS;

  const knowledgeCreated = await seedCompanyKnowledge();
  const { seedPlans } = await import("../payments");
  const plansCreated = await seedPlans();

  // Roster upgrade: agents that were seeded as placeholders and never edited by a human get their new capabilities.
  // An agent is "untouched" while it is still at version 1. Edited agents are never overwritten.
  let upgraded = 0;
  for (const a of AGENT_ROSTER) {
    const row = await prisma.osAgent.findUnique({ where: { key: a.key } });
    if (!row || row.version !== 1) continue;
    const wanted = agentDataFromSeed(a);
    // Never override a human decision: only never-activated placeholders (DRAFT) are switched on; PAUSED stays paused.
    const status = row.status === "DRAFT" ? wanted.status : row.status;
    const changed = row.handler !== wanted.handler || status !== row.status || JSON.stringify(row.tools) !== JSON.stringify(wanted.tools);
    if (!changed) continue;
    const u = await prisma.osAgent.update({ where: { id: row.id }, data: { handler: wanted.handler, status, tools: wanted.tools, knowledgeSources: wanted.knowledgeSources, description: wanted.description, autonomy: wanted.autonomy, modelTier: wanted.modelTier, systemPrompt: wanted.systemPrompt, triggerTypes: wanted.triggerTypes, version: 2 } });
    await prisma.osAgentVersion.create({ data: { agentId: row.id, version: 2, snapshot: u as never, changedBy: "seed", note: "Roster upgrade: new capabilities" } });
    upgraded++;
  }

  await audit({ actor: "seed", actorType: "SYSTEM", action: "os.seed", resource: "system", output: { agentsCreated, templatesCreated, brainCreated, knowledgeCreated, plansCreated, upgraded } });
  return { agentsCreated, templatesCreated, brainCreated, knowledgeCreated, plansCreated, upgraded };
}

/**
 * Demo sandbox (spec §75/§76). Every record is flagged isDemo and the demo prospect has NO email,
 * so nothing here can cause an external send.
 */
export async function seedDemoData() {
  const { createOpportunity } = await import("../crm");
  const { enqueueTask } = await import("../queue");
  const actor = { actor: "demo", actorType: "SYSTEM" as const };
  const { opportunity, created } = await createOpportunity(
    { companyName: "Accra Dental Clinic (DEMO)", industry: "Dental", website: undefined, country: "Ghana", contactName: "Demo Contact", businessUnit: "KOVABOT", source: "demo", isDemo: true, notes: "Demo record — no real contact details, so outreach cannot be sent." },
    actor
  );
  if (created) {
    await prisma.osOpportunity.update({ where: { id: opportunity.id }, data: { signals: { bookingFlow: true, phoneOnly: true } } });
    await enqueueTask({ agentKey: "prospecting-agent", title: "Research Accra Dental Clinic (DEMO)", input: { opportunityId: opportunity.id }, createdBy: "demo", idempotencyKey: `research:${opportunity.id}`, opportunityId: opportunity.id, isDemo: true });
  }
  return { opportunityId: opportunity.id, created };
}
