import { NextRequest, NextResponse } from "next/server";
import { getCaller } from "@/lib/os/http";
import { can } from "@/lib/os/rbac";
import { audit } from "@/lib/os/audit";
import { toCsv } from "@/lib/os/csv";
import { parseFilters } from "@/lib/analytics/filters";
import { buildReport, REPORTS, type ReportId } from "@/lib/analytics/reports";

export const maxDuration = 30;

/** GET /api/intel/export?report=pages&range=30d&country=GH … → CSV (UTF-8 with BOM so Excel opens it directly). Requires analytics.read + report.export. */
export async function GET(req: NextRequest) {
  const caller = await getCaller(req);
  if (!caller) return NextResponse.json({ error: "Unauthenticated." }, { status: 401 });
  if (!can(caller.role, "analytics.read") || !can(caller.role, "report.export")) return NextResponse.json({ error: "Not permitted." }, { status: 403 });
  const sp = Object.fromEntries(req.nextUrl.searchParams.entries());
  const id = REPORTS.find((r) => r.id === sp.report)?.id as ReportId | undefined;
  if (!id) return NextResponse.json({ error: "Unknown report." }, { status: 400 });
  const rows = await buildReport(id, parseFilters(sp));
  await audit({ actor: caller.name, actorType: "HUMAN", action: "analytics.export", resource: "report", resourceId: id, input: sp, output: { rows: rows.length }, ip: caller.ip });
  const csv = "﻿" + (rows.length ? toCsv(rows) : "no data for the selected filters");
  return new NextResponse(csv, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="ravesoft-${id}-${new Date().toISOString().slice(0, 10)}.csv"`, "Cache-Control": "no-store" } });
}
