import { after } from "next/server";
import { z } from "zod";
import { api, jsonBody } from "@/lib/os/http";
import { parseCsv } from "@/lib/os/csv";
import { createOpportunity } from "@/lib/os/crm";
import { enqueueTask } from "@/lib/os/queue";
import { processQueue } from "@/lib/os/runtime";
import { audit } from "@/lib/os/audit";

export const maxDuration = 60;
const COLS = ["company", "industry", "website", "email", "phone", "contact", "country"] as const;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Bulk-import prospects from pasted CSV. Header row optional (company, industry, website, email, phone, contact, country). */
export const POST = api("opportunity.write", async ({ request, caller }) => {
  const { csv, businessUnit } = await jsonBody(request, z.object({ csv: z.string().min(3).max(200_000), businessUnit: z.enum(["RAVESOFT", "CLIQPOS", "KOVABOT", "HMS", "RESTOVAX"]).optional() }));
  let rows = parseCsv(csv);
  const header = rows[0]?.map((h) => h.toLowerCase());
  const named = !!header && header.includes("company");
  const idx = (name: (typeof COLS)[number], pos: number) => (named ? (header as string[]).indexOf(name) : pos);
  if (named) rows = rows.slice(1);
  if (rows.length > 300) throw new Error("Import at most 300 rows at a time.");

  let created = 0, existing = 0;
  const skipped: string[] = [];
  for (const [n, r] of rows.entries()) {
    const get = (c: (typeof COLS)[number], pos: number) => { const i = idx(c, pos); return i >= 0 ? (r[i] ?? "").trim() : ""; };
    const company = get("company", 0);
    const email = get("email", 3);
    if (company.length < 2) { skipped.push(`row ${n + 1}: missing company`); continue; }
    if (email && !EMAIL.test(email)) { skipped.push(`row ${n + 1} (${company}): invalid email "${email}"`); continue; }
    const { opportunity, created: isNew } = await createOpportunity(
      { companyName: company.slice(0, 200), industry: get("industry", 1).slice(0, 100) || null, website: get("website", 2).slice(0, 300) || null, contactEmail: email || null, contactPhone: get("phone", 4).slice(0, 40) || null, contactName: get("contact", 5).slice(0, 120) || null, country: get("country", 6).slice(0, 80) || null, businessUnit, source: "import" },
      { actor: caller.name, actorType: "HUMAN" }
    );
    if (isNew) { created++; await enqueueTask({ agentKey: "prospecting-agent", title: `Research ${company}`, input: { opportunityId: opportunity.id }, createdBy: caller.name, priority: "MEDIUM", idempotencyKey: `research:${opportunity.id}`, opportunityId: opportunity.id }); }
    else existing++;
  }
  await audit({ actor: caller.name, actorType: "HUMAN", action: "opportunity.import", resource: "opportunity", output: { created, existing, skipped: skipped.length }, ip: caller.ip });
  if (created) after(() => processQueue({ maxTasks: 10, budgetMs: 45_000 }).catch(() => undefined));
  return { created, existing, skipped, message: `Imported ${created} new prospect(s); ${existing} already existed${skipped.length ? `; ${skipped.length} skipped (${skipped.slice(0, 2).join("; ")}${skipped.length > 2 ? "…" : ""})` : ""}. Research is running.` };
});
