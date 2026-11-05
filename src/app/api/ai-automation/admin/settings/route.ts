import { z } from "zod";
import { api, jsonBody } from "@/lib/os/http";
import { prisma } from "@/lib/prisma";
import { setSetting } from "@/lib/ai-automation/settings";
import { logActivity } from "@/lib/ai-automation/crm";
import { STOP_CONDITIONS } from "@/lib/ai-automation/followup";

const Tpl = z.object({ subject: z.string().min(1).max(300), intro: z.string().max(1500).optional(), body: z.string().max(3000).optional(), outro: z.string().max(1500).optional() });
const Body = z.discriminatedUnion("key", [
  z.object({ key: z.literal("qualification"), value: z.object({
    weights: z.object({ size: z.number().min(0).max(100), readiness: z.number().min(0).max(100), urgency: z.number().min(0).max(100), budget: z.number().min(0).max(100), complexity: z.number().min(0).max(100), fit: z.number().min(0).max(100), availability: z.number().min(0).max(100) }),
    thresholds: z.object({ high: z.number().min(1).max(100), medium: z.number().min(1).max(100) }).refine((t) => t.medium < t.high, { message: "Medium threshold must be below high." }) }) }),
  z.object({ key: z.literal("proposal"), value: z.object({ validityDays: z.number().int().min(1).max(365), requireApproval: z.boolean(), acceptanceInstructions: z.string().min(1).max(1500), assumptions: z.array(z.string().max(500)).max(20), exclusions: z.array(z.string().max(500)).max(20), paymentTermsNote: z.string().min(1).max(1500) }) }),
  z.object({ key: z.literal("company"), value: z.object({ name: z.string().min(1).max(160), email: z.string().email(), phone: z.string().max(40), whatsapp: z.string().max(40), location: z.string().max(200), website: z.string().url(), salesNotificationEmail: z.string().email() }) }),
  z.object({ key: z.literal("email.templates"), value: z.record(z.enum(["customer_proposal", "internal_new_opportunity", "followup_check_in", "followup_benefits", "followup_invite"]), Tpl) }),
  z.object({ key: z.literal("followup"), value: z.object({ active: z.boolean(), maxAttempts: z.number().int().min(1).max(10), stopConditions: z.array(z.enum(STOP_CONDITIONS)).min(1), steps: z.array(z.object({ delayDays: z.number().int().min(1).max(60), templateKey: z.enum(["followup_check_in", "followup_benefits", "followup_invite"]), label: z.string().max(160).optional() })).min(1).max(6) }) }),
]);

export const PUT = api("ai.settings", async ({ request, caller }) => {
  const b = await jsonBody(request, Body);
  if (b.key === "followup") {
    await prisma.aiFollowupSequence.upsert({ where: { key: "default" }, create: { key: "default", name: "Default proposal follow-up", active: b.value.active, steps: b.value.steps as never, maxAttempts: b.value.maxAttempts, stopConditions: b.value.stopConditions as never }, update: { active: b.value.active, steps: b.value.steps as never, maxAttempts: b.value.maxAttempts, stopConditions: b.value.stopConditions as never } });
  } else await setSetting(b.key, b.value, caller.name);
  await logActivity({ actor: caller.name, action: "settings.saved", detail: { key: b.key } });
  return { saved: true };
});
