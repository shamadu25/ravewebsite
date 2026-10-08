import { z } from "zod";
import { api, jsonBody } from "@/lib/os/http";
import { prisma } from "@/lib/prisma";
import { ORG_ID } from "@/lib/os/constants";
import { complete, LlmUnavailableError } from "@/lib/os/llm";
import { retrieveForAgent } from "@/lib/os/brain";
import { audit } from "@/lib/os/audit";

export const maxDuration = 60;
export const GET = api("campaign.read", async () => prisma.osContent.findMany({ where: { orgId: ORG_ID }, orderBy: { id: "desc" }, take: 100 }));

export const POST = api("campaign.create", async ({ request, caller }) => {
  const b = await jsonBody(request, z.object({ type: z.enum(["LINKEDIN_POST", "ARTICLE", "CASE_STUDY", "NEWSLETTER", "LANDING_COPY", "AD", "SCRIPT"]), title: z.string().min(2).max(200), body: z.string().max(20000).optional(), generate: z.boolean().optional(), channel: z.string().optional() }));
  let body = b.body ?? "";
  let generatedBy = caller.name;
  if (b.generate) {
    const brand = await retrieveForAgent({ department: "MARKETING", sections: ["Brand", "Products", "Marketing"], query: b.title });
    try {
      const r = await complete({ tier: "standard", temperature: 0.7, system: "You write marketing content for RaveSoft, which builds AI Employees for businesses. Use only facts in BRAND CONTEXT; make no unverifiable claims or invented statistics.", user: `BRAND CONTEXT:\n${JSON.stringify(brand)}\n\nWrite a ${b.type.replace(/_/g, " ").toLowerCase()} titled: ${b.title}` });
      body = r.text; generatedBy = `${r.provider}:${r.model}`;
    } catch (e) {
      if (e instanceof LlmUnavailableError) throw new Error("No LLM provider is configured, so content cannot be generated. Write the draft manually or add OPENAI_API_KEY / ANTHROPIC_API_KEY.");
      throw e;
    }
  }
  if (!body) throw new Error("Provide a body or use generate.");
  const row = await prisma.osContent.create({ data: { orgId: ORG_ID, type: b.type, title: b.title, body, channel: b.channel, generatedBy } });
  await audit({ actor: caller.name, actorType: "HUMAN", action: "content.create", resource: "content", resourceId: row.id, input: { type: b.type, generated: !!b.generate }, ip: caller.ip });
  return row;
});
