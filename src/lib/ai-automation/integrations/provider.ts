/**
 * Agent-deployment abstraction. The assessment/proposal platform never depends on a specific execution vendor.
 *
 * KOVABOT: RaveSoft intends to use Kovabot as its AI-workforce execution layer, but its deployment API contract has NOT been
 * verified, so no Kovabot calls are implemented. KovabotProvider therefore reports itself as unavailable and never fabricates a
 * deployment. Until the contract is verified (see docs/kovabot-integration.md), the ManualProvider records the hand-off for a human.
 */
import { prisma } from "@/lib/prisma";

export interface DeploymentRequest {
  projectId: number; proposalRef: string; customer: { businessName: string; contactEmail: string };
  agents: Array<{ solutionKey: string; name: string; complexity?: string }>; integrations: string[];
}
export type DeploymentResult =
  | { ok: true; externalRef: string; status: "PROVISIONING" | "TESTING" | "LIVE" }
  | { ok: false; status: "NOT_CONFIGURED" | "SKIPPED" | "FAILED"; reason: string };

export interface DeploymentProvider {
  id: string;
  /** True only when credentials exist AND the API contract is verified. */
  isAvailable(): boolean;
  provision(req: DeploymentRequest): Promise<DeploymentResult>;
}

export const manualProvider: DeploymentProvider = {
  id: "manual",
  isAvailable: () => true,
  async provision() { return { ok: false, status: "SKIPPED", reason: "Manual provisioning: a RaveSoft engineer deploys the agents; no automated deployment was attempted." }; },
};

export const kovabotProvider: DeploymentProvider = {
  id: "kovabot",
  isAvailable: () => Boolean(process.env.KOVABOT_API_URL && process.env.KOVABOT_API_KEY && process.env.KOVABOT_CONTRACT_VERIFIED === "true") && false, // contract unverified → never available until implemented against the real API
  async provision() { return { ok: false, status: "NOT_CONFIGURED", reason: "Kovabot deployment API contract is not verified; no deployment was created." }; },
};

const registry: DeploymentProvider[] = [kovabotProvider, manualProvider];
export const selectProvider = (providers: DeploymentProvider[] = registry): DeploymentProvider => providers.find((p) => p.isAvailable()) ?? manualProvider;

export async function createImplementationProject(proposalId: number, _actor?: string) { // eslint-disable-line @typescript-eslint/no-unused-vars
  const existing = await prisma.aiImplementationProject.findUnique({ where: { proposalId } });
  if (existing) return existing;
  const p = await prisma.aiProposal.findUniqueOrThrow({ where: { id: proposalId }, include: { items: true } });
  const scope = { agents: p.items.filter((i) => i.kind === "IMPLEMENTATION").map((i) => ({ solutionKey: i.solutionKey, name: i.name, complexity: i.complexity })), proposalRef: p.ref };
  return prisma.aiImplementationProject.create({ data: { proposalId, status: "PENDING_KICKOFF", provider: selectProvider().id, scope: scope as never } });
}

/** PROVISION job: asks the selected provider; every outcome (including 'not configured') is logged — nothing is faked. */
export async function provisionProject(projectId: number, providers: DeploymentProvider[] = registry) {
  const project = await prisma.aiImplementationProject.findUniqueOrThrow({ where: { id: projectId }, include: { proposal: { include: { lead: { include: { contact: true, company: true } } } } } });
  const provider = selectProvider(providers);
  const scope = project.scope as { agents: Array<{ solutionKey: string; name: string; complexity?: string }> };
  const req: DeploymentRequest = { projectId, proposalRef: project.proposal.ref, customer: { businessName: project.proposal.lead.company?.name ?? "", contactEmail: project.proposal.lead.contact.email ?? "" }, agents: scope.agents, integrations: [] };
  const res = await provider.provision(req);
  await prisma.aiIntegrationLog.create({ data: { projectId, provider: provider.id, action: "provision", status: res.ok ? "OK" : res.status, request: { projectId, agents: req.agents.length } as never, response: (res.ok ? { externalRef: res.externalRef } : { reason: res.reason }) as never, error: res.ok ? null : res.reason.slice(0, 580) } });
  await prisma.aiImplementationProject.update({ where: { id: projectId }, data: res.ok ? { status: res.status, externalRef: res.externalRef, provider: provider.id } : { status: "AWAITING_PROVISIONING", provider: provider.id } });
  return res;
}
