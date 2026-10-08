import { NextRequest, NextResponse } from "next/server";
import { getCaller } from "@/lib/os/http";
import { can } from "@/lib/os/rbac";
import { prisma } from "@/lib/prisma";
import { ORG_ID } from "@/lib/os/constants";
import { toCsv } from "@/lib/os/csv";
import { getAgentPerformance } from "@/lib/os/performance";
import { audit } from "@/lib/os/audit";

const REPORTS: Record<string, { perm: Parameters<typeof can>[1]; rows: () => Promise<Array<Record<string, unknown>>> }> = {
  revenue: { perm: "finance.read", rows: async () => (await prisma.osRevenueEntry.findMany({ where: { orgId: ORG_ID }, orderBy: { occurredAt: "desc" } })).map((r) => ({ date: r.occurredAt, customerId: r.customerId, businessUnit: r.businessUnit, engine: r.revenueEngine, kind: r.kind, amountUsd: r.amountCents / 100, source: r.source, ref: r.externalRef, demo: r.isDemo })) },
  sales: { perm: "opportunity.read", rows: async () => (await prisma.osOpportunity.findMany({ where: { orgId: ORG_ID }, orderBy: { id: "desc" } })).map((o) => ({ company: o.companyName, industry: o.industry, stage: o.stage, score: o.score, dealValueUsd: o.dealValueCents / 100, probability: o.probability, source: o.source, nextAction: o.nextAction, demo: o.isDemo })) },
  customers: { perm: "customer.read", rows: async () => (await prisma.osCustomer.findMany({ where: { orgId: ORG_ID } })).map((c) => ({ name: c.name, unit: c.businessUnit, status: c.status, health: c.health, mrrUsd: c.mrrCents / 100, demo: c.isDemo })) },
  agents: { perm: "agent.read", rows: async () => (await getAgentPerformance()) as unknown as Array<Record<string, unknown>> },
  tasks: { perm: "task.read", rows: async () => (await prisma.osTask.findMany({ where: { orgId: ORG_ID }, orderBy: { id: "desc" }, take: 5000, include: { agent: { select: { key: true } } } })).map((t) => ({ id: t.id, agent: t.agent.key, title: t.title, status: t.status, priority: t.priority, costUsd: t.costUsd, retries: t.retryCount, created: t.createdAt, error: t.error })) },
  audit: { perm: "audit.read", rows: async () => (await prisma.osAuditLog.findMany({ where: { orgId: ORG_ID }, orderBy: { id: "desc" }, take: 5000 })).map((a) => ({ id: a.id, when: a.createdAt, actor: a.actor, actorType: a.actorType, action: a.action, resource: a.resource, resourceId: a.resourceId, result: a.result })) },
};

export async function GET(request: NextRequest, ctx: { params: Promise<{ name: string }> }) {
  const caller = await getCaller(request);
  if (!caller) return NextResponse.json({ error: "Unauthenticated." }, { status: 401 });
  const { name } = await ctx.params;
  const report = REPORTS[name];
  if (!report) return NextResponse.json({ error: "Unknown report." }, { status: 404 });
  if (!can(caller.role, "report.export") || !can(caller.role, report.perm)) return NextResponse.json({ error: "Not permitted." }, { status: 403 });
  const rows = await report.rows();
  await audit({ actor: caller.name, actorType: "HUMAN", action: "report.export", resource: "report", resourceId: name, output: { rows: rows.length }, ip: caller.ip });
  return new NextResponse(toCsv(rows) || "no data\n", { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="ravesoft-${name}-${new Date().toISOString().slice(0, 10)}.csv"`, "Cache-Control": "no-store" } });
}
