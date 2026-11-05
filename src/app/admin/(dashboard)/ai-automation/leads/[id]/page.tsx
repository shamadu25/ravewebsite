import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge, Card, PageHeader } from "@/components/os/ui";
import LeadActions from "@/components/admin-ai/LeadActions";
import { ActionButton } from "@/components/admin-ai/controls";
import ApiForm from "@/components/os/ApiForm";
import { requireAdmin } from "@/lib/ai-automation/admin-auth";
import { displayAnswer } from "@/lib/ai-automation/analysis-service";
import { getQuestionSet } from "@/lib/ai-automation/repo";
import { fmtDate, human } from "@/lib/ai-automation/format";
import { formatMoney } from "@/lib/ai-automation/pricing";
import type { BusinessAnalysis } from "@/lib/ai-automation/ai/schema";
import { can } from "@/lib/os/rbac";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AiLeadDetail({ params }: { params: Promise<{ id: string }> }) {
  const { user, allowed } = await requireAdmin("ai.read");
  if (!allowed) return <p>No access.</p>;
  const id = Number((await params).id);
  const lead = await prisma.aiLead.findUnique({
    where: { id },
    include: { contact: true, company: true, notes: { orderBy: { createdAt: "desc" } }, activity: { orderBy: { createdAt: "desc" }, take: 60 }, emails: { orderBy: { createdAt: "desc" }, take: 20 }, proposals: true, assessments: { orderBy: { submittedAt: "desc" }, include: { responses: true, analyses: { orderBy: { version: "desc" } } } } },
  });
  if (!lead) notFound();
  const a = lead.assessments[0];
  const questions = a ? await getQuestionSet(a.industrySlug) : [];
  const qBy = new Map(questions.map((q) => [q.key, q]));
  const analysis = a?.analyses[0];
  const out = analysis?.output as unknown as BusinessAnalysis | undefined;
  const qual = lead.qualificationReasons as { summary?: string; reasons?: Array<{ criterion: string; score: number; weight: number; note: string }> } | null;
  const answers = (a?.responses ?? []).filter((r) => !["consentProcessing", "consentMarketing"].includes(r.questionKey)).sort((x, y) => x.stage - y.stage);
  const name = [lead.contact.firstName, lead.contact.lastName].filter(Boolean).join(" ");

  return (
    <div>
      <PageHeader title={lead.company?.name ?? "Lead"} subtitle={`${name}${lead.contact.jobTitle ? `, ${lead.contact.jobTitle}` : ""} · ${human(lead.industrySlug)} · ${lead.country ?? ""}`} actions={<><Badge>{lead.status}</Badge>{lead.priority && <Badge>{lead.priority}</Badge>}</>} />
      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-6">
          <Card>
            <h2 className="mb-3 text-base font-semibold">Customer</h2>
            <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
              <div><dt className="text-xs text-gray-500">Email</dt><dd>{lead.contact.email ?? "—"}</dd></div><div><dt className="text-xs text-gray-500">Phone / WhatsApp</dt><dd>{lead.contact.phone ?? "—"}</dd></div>
              <div><dt className="text-xs text-gray-500">Deal value</dt><dd>{lead.dealValue != null ? formatMoney(Number(lead.dealValue), lead.currency) : "Not priced"}</dd></div><div><dt className="text-xs text-gray-500">Monthly recurring</dt><dd>{lead.monthlyRecurring != null ? formatMoney(Number(lead.monthlyRecurring), lead.currency) : "—"}</dd></div>
              <div><dt className="text-xs text-gray-500">Next action</dt><dd>{lead.nextActionAt ? `${fmtDate(lead.nextActionAt)} — ${lead.nextActionNote ?? ""}` : "—"}</dd></div><div><dt className="text-xs text-gray-500">Lost reason</dt><dd>{lead.lostReason ?? "—"}</dd></div>
            </dl>
            {lead.proposals.map((p) => <p key={p.id} className="mt-3 text-sm">Proposal <Link className="font-medium text-[var(--primary)] hover:underline" href={`/admin/ai-automation/proposals/${p.id}`}>{p.ref}</Link> · <Badge>{p.status}</Badge></p>)}
          </Card>

          {qual && (
            <Card>
              <h2 className="mb-1 text-base font-semibold">Qualification</h2><p className="mb-3 text-sm text-gray-600">{qual.summary}</p>
              <table className="w-full text-sm"><thead><tr className="text-left text-xs text-gray-500"><th>Criterion</th><th>Score</th><th>Weight</th><th>Why</th></tr></thead><tbody>{qual.reasons?.map((r) => <tr key={r.criterion} className="border-t border-gray-100"><td className="py-1.5 capitalize">{r.criterion}</td><td>{r.score}</td><td>{r.weight}</td><td className="text-gray-600">{r.note}</td></tr>)}</tbody></table>
            </Card>
          )}

          <Card>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><h2 className="text-base font-semibold">AI analysis {analysis && <span className="text-xs font-normal text-gray-500">v{analysis.version} · {analysis.provider}{analysis.status === "FALLBACK" ? " (rules-based fallback)" : ""} · {fmtDate(analysis.createdAt)}</span>}</h2>{a && can(user.role, "ai.write") && <ActionButton label="Regenerate analysis" url={`/api/ai-automation/admin/assessments/${a.id}`} body={{ action: "regenerate" }} confirm="Run the analysis again? A new version is added; the old one is kept." />}</div>
            {out ? (
              <div className="space-y-4 text-sm">
                {analysis?.note && <p className="rounded-md bg-amber-50 p-2 text-xs text-amber-900">{analysis.note}</p>}
                <p>{out.businessOverview.summary}</p>
                <div><h3 className="font-semibold">Problems</h3><ul className="list-disc pl-5">{out.operationalProblems.map((p, i) => <li key={i}>{p.problem} <span className="text-xs text-gray-500">({human(p.basis)})</span></li>)}</ul></div>
                <div><h3 className="font-semibold">Recommended solutions</h3><ul className="space-y-2">{out.recommendations.map((r) => <li key={r.solutionKey} className="rounded-md border border-gray-200 p-3"><p className="font-medium">{r.solutionKey} <Badge>{r.priority}</Badge> <span className="text-xs text-gray-500">{r.complexity.toLowerCase()} complexity</span></p><p className="text-gray-600">{r.whyRecommended}</p></li>)}</ul></div>
                <div><h3 className="font-semibold">Information gaps</h3><ul className="list-disc pl-5">{out.informationGaps.map((g, i) => <li key={i}>{g}</li>)}</ul></div>
                <div><h3 className="font-semibold">Risks &amp; dependencies</h3><ul className="list-disc pl-5">{out.risks.map((g, i) => <li key={i}>{g}</li>)}</ul></div>
                {a && a.analyses.length > 1 && <p className="text-xs text-gray-500">Analysis history: {a.analyses.map((x) => `v${x.version} (${x.provider}, ${fmtDate(x.createdAt)})`).join(" · ")}</p>}
              </div>
            ) : <p className="text-sm text-gray-500">No analysis yet — it runs in the background after submission.</p>}
          </Card>

          <Card>
            <h2 className="mb-3 text-base font-semibold">Assessment answers</h2>
            <dl className="space-y-3 text-sm">{answers.map((r) => <div key={r.id}><dt className="text-xs text-gray-500">{r.questionLabel}</dt><dd className="whitespace-pre-line">{displayAnswer(qBy.get(r.questionKey), r.value) || "—"}</dd></div>)}</dl>
            {a && can(user.role, "ai.write") && <details className="mt-4"><summary className="cursor-pointer text-sm font-medium text-[var(--primary)]">Request additional information from the customer</summary><div className="mt-3"><ApiForm url={`/api/ai-automation/admin/assessments/${a.id}`} extra={{ action: "request_info" }} submitLabel="Email the customer" fields={[{ name: "message", label: "Your questions (sent by email, 10+ characters)", type: "textarea", required: true }]} /></div></details>}
          </Card>
        </div>

        <div className="space-y-6">
          <Card><h2 className="mb-3 text-base font-semibold">Manage lead</h2>{can(user.role, "ai.write") ? <LeadActions leadId={lead.id} status={lead.status} assignedTo={lead.assignedTo} nextActionAt={lead.nextActionAt?.toISOString() ?? null} nextActionNote={lead.nextActionNote} followupsStopped={lead.followupsStopped} optedOut={lead.emailOptOut} canErase={can(user.role, "ai.settings")} /> : <p className="text-sm text-gray-500">Read-only access.</p>}</Card>
          <Card><h2 className="mb-3 text-base font-semibold">Internal notes</h2>{lead.notes.length === 0 ? <p className="text-sm text-gray-500">No notes.</p> : <ul className="space-y-3 text-sm">{lead.notes.map((n) => <li key={n.id}><p className="whitespace-pre-line">{n.body}</p><p className="text-xs text-gray-500">{n.author} · {fmtDate(n.createdAt)}</p></li>)}</ul>}</Card>
          <Card><h2 className="mb-3 text-base font-semibold">Communication history</h2>{lead.emails.length === 0 ? <p className="text-sm text-gray-500">No emails yet.</p> : <ul className="space-y-2 text-sm">{lead.emails.map((e) => <li key={e.id}><span className="font-medium">{e.subject}</span><br /><span className="text-xs text-gray-500">{human(e.kind)} · {e.status === "ACCEPTED" ? "Accepted by mail server (delivery unconfirmed)" : human(e.status)} · {fmtDate(e.createdAt)}{e.error ? ` · ${e.error}` : ""}</span></li>)}</ul>}</Card>
          <Card><h2 className="mb-3 text-base font-semibold">Activity</h2><ul className="space-y-2 text-xs text-gray-600">{lead.activity.map((x) => <li key={x.id}><span className="font-medium text-gray-800">{human(x.action.replace(".", " "))}</span> · {x.actor} · {fmtDate(x.createdAt)}</li>)}</ul></Card>
        </div>
      </div>
    </div>
  );
}
