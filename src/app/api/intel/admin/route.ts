import { z } from "zod";
import { api, jsonBody } from "@/lib/os/http";
import { audit } from "@/lib/os/audit";
import { prisma } from "@/lib/prisma";
import { getSettings, saveSettings } from "@/lib/analytics/settings";
import { deleteFunnel, saveFunnel, sanitizeFunnel } from "@/lib/analytics/funnels";
import { deleteVisitorData, evaluateAlerts, runRetention } from "@/lib/analytics/maintenance";

const Body = z.discriminatedUnion("action", [
  z.object({ action: z.literal("settings"), enabled: z.boolean().optional(), rawRetentionDays: z.number().optional(), attributionWindowDays: z.number().optional(), consentMode: z.enum(["opt_in", "opt_out"]).optional(), excludedPaths: z.string().max(2000).optional(), alertTrafficDropPct: z.number().optional(), alertTrafficSpikePct: z.number().optional(), alertFormFailurePct: z.number().optional(), alertConversionDropPct: z.number().optional() }),
  z.object({ action: z.literal("funnel_create"), name: z.string(), steps: z.array(z.object({ label: z.string().optional(), kind: z.string(), value: z.string().optional() })) }),
  z.object({ action: z.literal("funnel_delete"), id: z.string().max(40) }),
  z.object({ action: z.literal("spend"), day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), channel: z.string().regex(/^[a-z_]{3,20}$/), campaign: z.string().max(150).optional(), amountUsd: z.number().min(0).max(10_000_000) }),
  z.object({ action: z.literal("delete_visitor"), visitorId: z.string().regex(/^[A-Za-z0-9_-]{8,40}$/) }),
  z.object({ action: z.literal("run_retention") }),
  z.object({ action: z.literal("check_alerts") }),
]);

/** All state-changing Intelligence admin actions. Requires analytics.manage; every action is written to the tamper-evident audit log. */
export const POST = api("analytics.manage", async ({ request, caller }) => {
  const body = await jsonBody(request, Body);
  const log = (action: string, resourceId: string | null, input?: unknown) => audit({ actor: caller.name, actorType: "HUMAN", action: `analytics.${action}`, resource: "analytics", resourceId, input, ip: caller.ip });
  switch (body.action) {
    case "settings": {
      const { action, excludedPaths, ...rest } = body; void action;
      const next = await saveSettings({ ...rest, ...(excludedPaths !== undefined ? { excludedPaths: excludedPaths.split(/[\s,]+/).filter(Boolean) } : {}) });
      await log("settings.update", null, next);
      return next;
    }
    case "funnel_create": { const f = await saveFunnel(sanitizeFunnel(body)); await log("funnel.create", f.id, { name: f.name }); return f; }
    case "funnel_delete": await deleteFunnel(body.id); await log("funnel.delete", body.id); return { deleted: true };
    case "spend": {
      const day = new Date(`${body.day}T00:00:00.000Z`), campaign = (body.campaign ?? "").trim(), cents = Math.round(body.amountUsd * 100);
      await prisma.analyticsAdSpend.upsert({
        where: { day_channel_campaign_source: { day, channel: body.channel, campaign, source: "manual" } },
        create: { day, channel: body.channel, campaign, amountCents: cents, source: "manual", createdBy: caller.name }, update: { amountCents: cents, createdBy: caller.name },
      });
      await log("spend.upsert", `${body.day}:${body.channel}`, { campaign, cents });
      return { saved: true };
    }
    case "delete_visitor": return deleteVisitorData(body.visitorId, caller.name, caller.ip);
    case "run_retention": { const r = await runRetention(); await log("retention.run", null, { deleted: r.deleted }); return { deleted: r.deleted, cutoff: r.cutoff }; }
    case "check_alerts": return evaluateAlerts();
  }
});
export const GET = api("analytics.read", async () => getSettings(true));
