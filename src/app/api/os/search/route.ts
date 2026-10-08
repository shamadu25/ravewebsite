import { api } from "@/lib/os/http";
import { prisma } from "@/lib/prisma";
import { ORG_ID } from "@/lib/os/constants";
import { can } from "@/lib/os/rbac";

/** Global search (spec §61). Each source is only searched if the caller holds its read permission. */
export const GET = api("os.read", async ({ request, caller }) => {
  const q = (request.nextUrl.searchParams.get("q") ?? "").trim();
  if (q.length < 2) return { results: [] };
  const like = { contains: q };
  const out: Array<{ type: string; title: string; subtitle: string; href: string }> = [];
  const REPORT_NAMES = [["Revenue report", "revenue"], ["Sales report", "sales"], ["Customer report", "customers"], ["Agent performance report", "agents"], ["Task report", "tasks"], ["Audit report", "audit"]] as const;
  const [opps, custs, agents, tasks, brain, apprs, audits, workflows] = await Promise.all([
    can(caller.role, "opportunity.read") ? prisma.osOpportunity.findMany({ where: { orgId: ORG_ID, OR: [{ companyName: like }, { contactEmail: like }, { industry: like }] }, take: 8 }) : [],
    can(caller.role, "customer.read") ? prisma.osCustomer.findMany({ where: { orgId: ORG_ID, name: like }, take: 8 }) : [],
    can(caller.role, "agent.read") ? prisma.osAgent.findMany({ where: { orgId: ORG_ID, OR: [{ name: like }, { key: like }, { role: like }] }, take: 8 }) : [],
    can(caller.role, "task.read") ? prisma.osTask.findMany({ where: { orgId: ORG_ID, title: like }, take: 8, orderBy: { id: "desc" } }) : [],
    can(caller.role, "brain.read") ? prisma.osBrainEntry.findMany({ where: { orgId: ORG_ID, OR: [{ title: like }, { content: like }] }, take: 8 }) : [],
    can(caller.role, "approval.read") ? prisma.osApproval.findMany({ where: { orgId: ORG_ID, OR: [{ title: like }, { objective: like }] }, take: 8, orderBy: { id: "desc" } }) : [],
    can(caller.role, "audit.read") ? prisma.osAuditLog.findMany({ where: { orgId: ORG_ID, OR: [{ action: like }, { actor: like }, { resourceId: like }] }, take: 8, orderBy: { id: "desc" } }) : [],
    can(caller.role, "agent.read") ? prisma.osWorkflow.findMany({ where: { orgId: ORG_ID, OR: [{ name: like }, { key: like }] }, take: 8 }) : [],
  ]);
  workflows.forEach((w) => out.push({ type: "Workflow", title: w.name, subtitle: `${w.trigger} · ${w.enabled ? "enabled" : "disabled"}`, href: "/admin/workflows" }));
  if (can(caller.role, "report.export")) REPORT_NAMES.filter(([label]) => label.toLowerCase().includes(q.toLowerCase())).forEach(([label]) => out.push({ type: "Report", title: label, subtitle: "CSV export", href: "/admin/reports" }));
  opps.forEach((o) => out.push({ type: "Opportunity", title: o.companyName, subtitle: `${o.stage} · ${o.industry ?? ""}`, href: `/admin/revenue/${o.id}` }));
  custs.forEach((c) => out.push({ type: "Customer", title: c.name, subtitle: `${c.status} · ${c.businessUnit}`, href: "/admin/customers" }));
  agents.forEach((a) => out.push({ type: "Agent", title: a.name, subtitle: a.role, href: `/admin/agents/${a.key}` }));
  tasks.forEach((t) => out.push({ type: "Task", title: `#${t.id} ${t.title}`, subtitle: t.status, href: `/admin/tasks/${t.id}` }));
  brain.forEach((b) => out.push({ type: "Brain", title: b.title, subtitle: b.section, href: "/admin/brain" }));
  apprs.forEach((a) => out.push({ type: "Decision", title: a.title, subtitle: a.status, href: "/admin/approvals" }));
  audits.forEach((a) => out.push({ type: "Audit", title: a.action, subtitle: `${a.actor} · ${a.resource}`, href: "/admin/audit" }));
  return { results: out };
});
