import { z } from "zod";
import { api, jsonBody } from "@/lib/os/http";
import { prisma } from "@/lib/prisma";
import { ORG_ID } from "@/lib/os/constants";
import { audit } from "@/lib/os/audit";

/** AI Product Factory: turns a short brief into a reusable employee template (no code change needed). */
export const POST = api("agent.create", async ({ request, caller }) => {
  const b = await jsonBody(request, z.object({
    industry: z.string().min(2).max(60), role: z.string().min(2).max(80), problem: z.string().min(5).max(500),
    tools: z.array(z.string()).default([]), monthlyPriceUsd: z.number().int().nonnegative().default(99),
  }));
  const key = `${b.industry}-${b.role}`.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const name = `AI ${b.industry} ${b.role}`;
  const definition = {
    systemPrompt: `You are ${name} for a ${b.industry} business. Problem you solve: ${b.problem}. Answer only from the business's approved knowledge; escalate to a human when unsure.`,
    workflow: ["Receive enquiry", "Retrieve approved knowledge", "Answer or collect details", "Take permitted action", "Escalate if unsure", "Log outcome"],
    toolPermissions: b.tools,
    knowledgeRequirements: ["Services & pricing", "Opening hours", "FAQs", "Escalation contacts"],
    onboardingFlow: ["Collect business info", "Upload FAQs/pricing", "Connect channels", "Test conversations", "Go live"],
    pricing: { monthlyUsd: b.monthlyPriceUsd },
    salesPitch: `${name}: ${b.problem} Handles it 24/7 for $${b.monthlyPriceUsd}/month.`,
    landingPageDraft: { headline: `${name} — never miss another customer`, subhead: b.problem },
  };
  const row = await prisma.osEmployeeTemplate.upsert({
    where: { orgId_key: { orgId: ORG_ID, key } },
    create: { orgId: ORG_ID, key, industry: b.industry, name, role: b.role, description: b.problem, keywords: [b.industry.toLowerCase()], employees: [name], monthlyPriceUsd: b.monthlyPriceUsd, definition: definition as never },
    update: { description: b.problem, monthlyPriceUsd: b.monthlyPriceUsd, definition: definition as never },
  });
  await audit({ actor: caller.name, actorType: "HUMAN", action: "factory.create_template", resource: "employee_template", resourceId: row.id, input: b, ip: caller.ip });
  return row;
});
