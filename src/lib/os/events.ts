import { prisma } from "@/lib/prisma";
import { ORG_ID } from "./constants";
import { enqueueTask } from "./queue";
import { audit } from "./audit";
import { raiseAlert } from "./alerts";

/** Domain events (spec §59). Emitting never throws into the caller: automation must not break the action that triggered it. */
export type OsEvent =
  | "opportunity.created" | "opportunity.stage_changed" | "lead.qualified" | "payment.received" | "customer.at_risk"
  | "approval.required" | "approval.completed" | "agent.failed" | "product.registered" | "product.activated" | "product.subscribed" | "product.churned";

export interface Condition { field: string; op: "eq" | "neq" | "gt" | "gte" | "lt" | "lte" | "contains"; value: unknown }

export function getPath(obj: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((o, k) => (o && typeof o === "object" ? (o as Record<string, unknown>)[k] : undefined), obj);
}

export function evalCondition(c: Condition | null | undefined, ctx: unknown): boolean {
  if (!c) return true;
  const v = getPath(ctx, c.field);
  switch (c.op) {
    case "eq": return v === c.value;
    case "neq": return v !== c.value;
    case "gt": return Number(v) > Number(c.value);
    case "gte": return Number(v) >= Number(c.value);
    case "lt": return Number(v) < Number(c.value);
    case "lte": return Number(v) <= Number(c.value);
    case "contains": return typeof v === "string" && v.toLowerCase().includes(String(c.value).toLowerCase());
  }
}

export type RuleAction =
  | { type: "enqueue_agent"; agentKey: string; title: string }
  | { type: "start_workflow"; key: string }
  | { type: "alert"; severity: string; title: string };

export async function emit(event: OsEvent, payload: Record<string, unknown>): Promise<void> {
  try {
    const rules = await prisma.osRule.findMany({ where: { orgId: ORG_ID, event, enabled: true } });
    for (const r of rules) {
      if (!evalCondition(r.condition as Condition | null, payload)) continue;
      const a = r.action as RuleAction;
      const idem = `rule:${r.id}:${event}:${String(payload.id ?? payload.opportunityId ?? payload.customerId ?? Date.now())}`;
      if (a.type === "enqueue_agent") await enqueueTask({ agentKey: a.agentKey, title: a.title, input: payload, createdBy: `rule:${r.name}`, idempotencyKey: idem, opportunityId: (payload.opportunityId as number) ?? null, customerId: (payload.customerId as number) ?? null });
      else if (a.type === "start_workflow") { const { startWorkflow } = await import("./workflows"); await startWorkflow(a.key, payload, `rule:${r.name}`); }
      else if (a.type === "alert") await raiseAlert({ severity: a.severity, category: "Automation", title: a.title, dedupeKey: idem });
      await prisma.osRule.update({ where: { id: r.id }, data: { fired: { increment: 1 } } });
      await audit({ actor: `rule:${r.name}`, actorType: "SYSTEM", action: "rule.fired", resource: "rule", resourceId: r.id, input: { event } });
    }
    const wfs = await prisma.osWorkflow.findMany({ where: { orgId: ORG_ID, trigger: event, enabled: true } });
    if (wfs.length) {
      const { startWorkflow } = await import("./workflows");
      for (const w of wfs) await startWorkflow(w.key, payload, `event:${event}`);
    }
  } catch (e) {
    console.error("[os.events] emit failed", event, e);
  }
}
