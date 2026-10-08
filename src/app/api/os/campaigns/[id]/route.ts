import { z } from "zod";
import { api, jsonBody } from "@/lib/os/http";
import { prisma } from "@/lib/prisma";
import { ORG_ID } from "@/lib/os/constants";
import { audit } from "@/lib/os/audit";
import { requestApproval, registerApprovalAction } from "@/lib/os/approvals";

/** Spend/budget increases above this need CEO approval (spec §21). Campaign records are tracked here, not synced to ad platforms. */
const THRESHOLD_KEY = `os:${ORG_ID}:ad_spend_threshold_usd`;
registerApprovalAction("campaign.set_budget", async (a) => {
  await prisma.osCampaign.update({ where: { id: Number(a.campaignId) }, data: { budgetCents: Number(a.budgetCents) } });
  return { ok: true };
});

export const PATCH = api<{ id: string }>("campaign.launch", async ({ request, caller, params }) => {
  const b = await jsonBody(request, z.object({
    status: z.enum(["PLANNED", "ACTIVE", "PAUSED", "COMPLETED"]).optional(), budgetUsd: z.number().nonnegative().optional(),
    spendUsd: z.number().nonnegative().optional(), impressions: z.number().int().nonnegative().optional(), clicks: z.number().int().nonnegative().optional(),
    leads: z.number().int().nonnegative().optional(), customers: z.number().int().nonnegative().optional(), revenueUsd: z.number().nonnegative().optional(),
  }));
  const id = Number(params.id);
  const c = await prisma.osCampaign.findFirstOrThrow({ where: { id, orgId: ORG_ID } });
  const setting = await prisma.systemSetting.findUnique({ where: { key: THRESHOLD_KEY } });
  const threshold = typeof setting?.value === "number" ? setting.value : 1000;
  let approvalId: number | null = null;

  const data: Record<string, number | string> = {};
  if (b.status) data.status = b.status;
  for (const [k, col] of [["spendUsd", "spendCents"], ["revenueUsd", "revenueCents"]] as const) if (b[k] != null) data[col] = Math.round((b[k] as number) * 100);
  for (const k of ["impressions", "clicks", "leads", "customers"] as const) if (b[k] != null) data[k] = b[k] as number;
  if (b.budgetUsd != null) {
    const cents = Math.round(b.budgetUsd * 100);
    if (cents > c.budgetCents && b.budgetUsd >= threshold) {
      const a = await requestApproval({ kind: "AD_SPEND", title: `Raise "${c.name}" budget to $${b.budgetUsd}`, objective: `Budget $${c.budgetCents / 100} → $${b.budgetUsd} (threshold $${threshold}).`, recommendation: "Approve only if ROI to date justifies it.", expectedImpact: `Current ROI: ${c.spendCents ? (((c.revenueCents - c.spendCents) / c.spendCents) * 100).toFixed(0) + "%" : "INSUFFICIENT DATA (no spend recorded)"}`, requiredRole: "CEO", action: { type: "campaign.set_budget", campaignId: id, budgetCents: cents }, requestedBy: `user:${caller.name}` });
      approvalId = a.id;
    } else data.budgetCents = cents;
  }
  if (Object.keys(data).length) await prisma.osCampaign.update({ where: { id }, data });
  await audit({ actor: caller.name, actorType: "HUMAN", action: "campaign.update", resource: "campaign", resourceId: id, input: b, ip: caller.ip });
  return { updated: Object.keys(data), approvalId };
});
