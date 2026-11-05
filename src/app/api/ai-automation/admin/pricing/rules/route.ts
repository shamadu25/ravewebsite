import { z } from "zod";
import { api, jsonBody } from "@/lib/os/http";
import { RuleUpsertSchema, deletePricingRule, upsertPricingRule } from "@/lib/ai-automation/admin";

export const POST = api("ai.pricing", async ({ request, caller }) => upsertPricingRule(await jsonBody(request, RuleUpsertSchema), caller.name));
export const DELETE = api("ai.pricing", async ({ request, caller }) => { const { id } = await jsonBody(request, z.object({ id: z.number().int() })); await deletePricingRule(id, caller.name); return { deleted: true }; });
