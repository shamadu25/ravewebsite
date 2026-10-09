import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PIPELINE_STAGES } from "@/lib/os/constants";
import ApiButton from "@/components/os/ApiButton";
import ApiForm from "@/components/os/ApiForm";
import MediaNote from "@/components/os/MediaNote";
import { waLink, whatsappText } from "@/lib/os/whatsapp-link";
import { hasWhatsappConsent } from "@/lib/os/outreach";
import { Badge, Card, PageHeader, ago, centsToUsd } from "@/components/os/ui";
import type { ScoreFactor } from "@/lib/os/scoring";

export const dynamic = "force-dynamic";

export default async function OpportunityPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const opp = await prisma.osOpportunity.findUnique({ where: { id: Number(id) }, include: { activities: { orderBy: { createdAt: "desc" }, take: 40 }, outreach: { orderBy: { id: "desc" } }, customer: true } });
  if (!opp) notFound();
  const plans = await prisma.osPlan.findMany({ where: { orgId: "ravesoft", active: true }, orderBy: { id: "asc" } });
  const url = `/api/os/opportunities/${opp.id}`;
  const waText = whatsappText(opp);
  const wa = waLink(opp.contactPhone, waText, opp.country);
  const waConsent = await hasWhatsappConsent(opp.id);
  const factors = ((opp.scoreBreakdown as { factors?: ScoreFactor[] } | null)?.factors ?? []).filter((f) => f.max > 0);
  const pains = (opp.painPoints as string[] | null) ?? [];
  const employees = (opp.recommendedEmployees as string[] | null) ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title={opp.companyName}
        subtitle={`${opp.industry ?? "Industry unknown"} · ${opp.website ?? "no website"} · source: ${opp.source ?? "—"}${opp.isDemo ? " · DEMO RECORD" : ""}`}
        actions={<><ApiButton label="Re-research" url={url} body={{ action: "research" }} /><Badge>{opp.stage}</Badge></>}
      />
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <h2 className="mb-3 text-sm font-semibold text-gray-900">Opportunity analysis</h2>
          {opp.score == null ? <p className="text-sm text-gray-500">Not researched yet. The Prospecting Agent task is queued or has not run.</p> : (
            <>
              <p className="text-3xl font-semibold text-gray-900">{opp.score}<span className="text-base text-gray-400">/100</span> <span className="text-sm text-gray-500">confidence {Math.round((opp.confidence ?? 0) * 100)}%</span></p>
              <div className="mt-3 space-y-1.5">
                {factors.map((f) => (
                  <div key={f.key} className="flex items-center gap-3 text-xs">
                    <span className="w-44 text-gray-600">{f.label}</span>
                    <div className="h-1.5 flex-1 rounded bg-gray-100"><div className="h-full rounded bg-gray-800" style={{ width: `${(f.points / f.max) * 100}%` }} /></div>
                    <span className="w-10 text-right text-gray-700">{f.points}/{f.max}</span>
                  </div>
                ))}
              </div>
            </>
          )}
          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
            <div><dt className="text-xs text-gray-500">Recommended AI employees</dt><dd className="text-gray-900">{employees.join(" · ") || "No match (INSUFFICIENT DATA on industry)"}</dd></div>
            <div><dt className="text-xs text-gray-500">Suggested offer</dt><dd className="text-gray-900">{opp.suggestedOffer ?? "—"}</dd></div>
            <div><dt className="text-xs text-gray-500">Deal value (annual)</dt><dd className="text-gray-900">{centsToUsd(opp.dealValueCents)}</dd></div>
            <div><dt className="text-xs text-gray-500">Probability</dt><dd className="text-gray-900">{Math.round(opp.probability * 100)}%</dd></div>
            <div className="sm:col-span-2"><dt className="text-xs text-gray-500">Pain points detected</dt><dd className="text-gray-900">{pains.length ? pains.join("; ") : "None detected from available evidence"}</dd></div>
            <div><dt className="text-xs text-gray-500">Contact</dt><dd className="text-gray-900">{[opp.contactName, opp.contactEmail, opp.contactPhone].filter(Boolean).join(" · ") || "None on file"}</dd></div>
            <div><dt className="text-xs text-gray-500">Qualification</dt><dd className="text-gray-900">{(opp.qualification as { level?: string; total?: number } | null)?.level ?? "—"}</dd></div>
          </dl>
        </Card>

        <Card>
          <h2 className="mb-3 text-sm font-semibold text-gray-900">Actions</h2>
          <div className="flex flex-col items-start gap-3">
            <div className="flex flex-wrap gap-2">
              {PIPELINE_STAGES.filter((s) => s !== opp.stage).slice(0, 12).map((s) => <ApiButton key={s} label={s.replace(/_/g, " ")} url={url} body={{ action: "set_stage", stage: s }} />)}
            </div>
            <ApiButton label="Draft email outreach" variant="primary" url={url} body={{ action: "draft_outreach", channel: "EMAIL" }} result="draft" />
          </div>
          <div className="mt-5 border-t border-gray-100 pt-4">
            <h3 className="mb-2 text-xs font-semibold uppercase text-gray-500">WhatsApp (you send it yourself)</h3>
            {wa ? (
              <div className="space-y-2">
                {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
                <a href={wa} target="_blank" rel="noopener noreferrer" className="inline-block rounded-lg bg-[#16a34a] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#15803d]">Open in WhatsApp</a>
                <p className="text-xs text-gray-500">Opens your own WhatsApp with this message ready — you tap send. Nothing is automated.</p>
                <p className="rounded-lg bg-gray-50 p-2 text-xs text-gray-600">{waText}</p>
                <ApiForm url={url} extra={{ action: "whatsapp_log", text: waText }} submitLabel="I sent it — log it" fields={[]} />
              </div>
            ) : <p className="text-xs text-gray-500">No usable phone number on this prospect (use international format, e.g. +233 24 123 4567, or set the country).</p>}
            <p className="mt-2 text-xs text-amber-700">Only message people who expect to hear from you. Unsolicited WhatsApp messages get reported and can get your number blocked — use email for first contact.</p>
            <div className="mt-2 flex items-center gap-2 text-xs text-gray-600"><span>Consent to WhatsApp: <b>{waConsent ? "yes" : "no"}</b></span>
              <ApiButton label={waConsent ? "Remove opt-in" : "Record that they opted in"} url={url} body={{ action: "whatsapp_optin", optedIn: !waConsent }} /></div>
          </div>
          <div className="mt-5 border-t border-gray-100 pt-4">
            <h3 className="mb-2 text-xs font-semibold uppercase text-gray-500">Read a voice note or photo</h3>
            <MediaNote opportunityId={opp.id} />
          </div>
          <div className="mt-5 border-t border-gray-100 pt-4">
            <h3 className="mb-2 text-xs font-semibold uppercase text-gray-500">Create a pay-now link</h3>
            {plans.length === 0 ? <p className="text-xs text-gray-500">No plans yet. Add one under Finance → Plans.</p> : (
              <ApiForm url={url} extra={{ action: "payment_link" }} submitLabel="Create link" fields={[{ name: "planKey", label: "Plan", type: "select", options: plans.map((p) => p.key), defaultValue: plans.find((p) => (opp.recommendedEmployees as string[] | null)?.includes(p.name))?.key ?? plans[0].key }]} />
            )}
            <p className="mt-2 text-xs text-gray-500">Send it by email or WhatsApp. Payment marks the deal won and starts onboarding automatically.</p>
          </div>
          <div className="mt-5 border-t border-gray-100 pt-4">
            <h3 className="mb-2 text-xs font-semibold uppercase text-gray-500">Record a payment</h3>
            <ApiForm url={url} extra={{ action: "record_payment" }} submitLabel="Record payment" fields={[{ name: "amountUsd", label: "Amount (USD)", type: "number", required: true }, { name: "externalRef", label: "Payment reference", required: true }, { name: "recurring", label: "Recurring (monthly)", type: "checkbox", defaultValue: true }]} />
            <p className="mt-2 text-xs text-gray-500">Marks the deal WON, creates the customer, books revenue and launches onboarding.</p>
          </div>
          <div className="mt-5 border-t border-gray-100 pt-4">
            <h3 className="mb-2 text-xs font-semibold uppercase text-gray-500">Record a reply</h3>
            <ApiForm url={url} extra={{ action: "record_response" }} submitLabel="Log reply" fields={[{ name: "text", label: "What they said", type: "textarea", required: true }]} />
          </div>
        </Card>
      </div>

      <Card>
        <h2 className="mb-3 text-sm font-semibold text-gray-900">Outreach</h2>
        {opp.outreach.length === 0 ? <p className="text-sm text-gray-500">No messages yet.</p> : opp.outreach.map((m) => (
          <div key={m.id} className="mb-4 rounded-xl border border-gray-200 p-3 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-2"><span className="font-medium">{m.channel} → {m.toAddress ?? "no address"}</span><Badge>{m.status}</Badge></div>
            {m.subject && <p className="mt-1 text-gray-800">{m.subject}</p>}
            <p className="mt-1 whitespace-pre-wrap text-gray-600">{m.body}</p>
            <p className="mt-1 text-xs text-gray-400">Generated by {m.generatedBy}{m.error ? ` · ${m.error}` : ""}</p>
            {m.status === "DRAFT" && <div className="mt-2"><ApiButton label="Submit for approval" variant="primary" url={url} body={{ action: "submit_outreach", outreachId: m.id }} result="submitted" /></div>}
          </div>
        ))}
      </Card>

      <Card>
        <h2 className="mb-3 text-sm font-semibold text-gray-900">Activity</h2>
        <ul className="space-y-2 text-sm">
          {opp.activities.map((a) => <li key={a.id} className="flex gap-3"><span className="w-16 shrink-0 text-xs text-gray-400">{ago(a.createdAt)}</span><span className="text-gray-700"><b className="text-xs uppercase text-gray-500">{a.type}</b> {a.summary} <span className="text-xs text-gray-400">— {a.actor}</span></span></li>)}
        </ul>
      </Card>
    </div>
  );
}
