import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { guardForm, POLICIES } from "@/lib/antispam/guard";
import { createDataRequest } from "@/lib/ai-automation/privacy";
import { getCompany } from "@/lib/ai-automation/settings";
import { sendEmail } from "@/lib/ai-automation/email/send";
import { esc } from "@/lib/ai-automation/email/render";
import { clientIp } from "@/app/api/ai/_shared";

const Schema = z.object({ email: z.string().email().max(254), kind: z.enum(["CORRECTION", "DELETION", "OPT_OUT"]), details: z.string().max(1000).optional(), formToken: z.string().max(200).nullish(), website: z.string().max(200).optional() });

/** Correction / deletion / opt-out requests. Always answers the same way so it can't be used to discover who is on file. */
export async function POST(request: NextRequest) {
  const parsed = Schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Please enter a valid email and choose a request type." }, { status: 422 });
  const d = parsed.data;
  const guard = await guardForm({ ...POLICIES.contact, form: "ai_data_request", minAgeMs: 2000 }, { ip: clientIp(request), email: d.email, message: d.details, honeypot: d.website, formToken: d.formToken });
  if (!guard.ok && !guard.silent) return NextResponse.json({ error: guard.error }, { status: guard.status });
  if (guard.ok) {
    await createDataRequest(d.email, d.kind, d.details);
    const company = await getCompany();
    await sendEmail({ dedupeKey: `datareq:${d.kind}:${d.email.toLowerCase()}:${Math.floor(Date.now() / 3_600_000)}`, kind: "data_request", to: company.salesNotificationEmail, email: { subject: `Data request (${d.kind}) — AI Automation`, text: `${d.kind} request from ${d.email}\n\n${d.details ?? ""}`, html: `<p><strong>${esc(d.kind)}</strong> request from ${esc(d.email)}</p><p>${esc(d.details ?? "").replace(/\n/g, "<br>")}</p>` } }).catch(() => undefined);
  }
  return NextResponse.json({ ok: true });
}
