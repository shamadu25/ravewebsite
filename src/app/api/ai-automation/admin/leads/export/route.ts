import { NextRequest, NextResponse } from "next/server";
import { getCaller } from "@/lib/os/http";
import { can } from "@/lib/os/rbac";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/os/audit";
import { csvCell } from "@/lib/ai-automation/csv";

export async function GET(request: NextRequest) {
  const caller = await getCaller(request);
  if (!caller) return NextResponse.json({ error: "Unauthenticated." }, { status: 401 });
  if (!can(caller.role, "ai.read") || !can(caller.role, "report.export")) return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  const leads = await prisma.aiLead.findMany({ where: { anonymisedAt: null }, include: { contact: true, company: true }, orderBy: { id: "desc" }, take: 5000 });
  const header = ["id", "created", "business", "contact", "email", "phone", "country", "industry", "status", "priority", "score", "assigned_to", "deal_value", "monthly_recurring", "currency"];
  const rows = leads.map((l) => [l.id, l.createdAt, l.company?.name, [l.contact.firstName, l.contact.lastName].filter(Boolean).join(" "), l.contact.email, l.contact.phone, l.country, l.industrySlug, l.status, l.priority, l.qualificationScore, l.assignedTo, l.dealValue?.toString(), l.monthlyRecurring?.toString(), l.currency]);
  await audit({ actor: caller.name, actorType: "HUMAN", action: "ai.leads.export", resource: "ai_leads", output: { rows: rows.length }, ip: caller.ip });
  return new NextResponse([header.map(csvCell).join(","), ...rows.map((r) => r.map(csvCell).join(","))].join("\n"), { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="ai-leads.csv"', "Cache-Control": "no-store" } });
}
