import { prisma } from "@/lib/prisma";
import { ORG_ID } from "../constants";
import { audit } from "../audit";
import { DEFAULT_TEMPLATES } from "../recommend";
import { AGENT_ROSTER, buildSystemPrompt } from "./roster";
import { BRAIN_SECTIONS } from "../brain";

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

  await audit({ actor: "seed", actorType: "SYSTEM", action: "os.seed", resource: "system", output: { agentsCreated, templatesCreated, brainCreated } });
  return { agentsCreated, templatesCreated, brainCreated };
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
