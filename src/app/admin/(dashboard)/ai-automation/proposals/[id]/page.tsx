import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge, Card, PageHeader } from "@/components/os/ui";
import ProposalEditor from "@/components/admin-ai/ProposalEditor";
import { requireAdmin } from "@/lib/ai-automation/admin-auth";
import { fmtDate, human } from "@/lib/ai-automation/format";
import { formatMoney } from "@/lib/ai-automation/pricing";
import { getPricingRules, getSolutions } from "@/lib/ai-automation/repo";
import { SUPPORTED_QUOTE_CURRENCIES } from "@/lib/ai-automation/settings";
import type { ProposalContent } from "@/lib/ai-automation/proposal/content";
import { can } from "@/lib/os/rbac";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AiProposalDetail({ params }: { params: Promise<{ id: string }> }) {
  const { user, allowed } = await requireAdmin("ai.read");
  if (!allowed) return <p>No access.</p>;
  const id = Number((await params).id);
  const p = await prisma.aiProposal.findUnique({ where: { id }, include: { lead: { include: { company: true } }, versions: { orderBy: { version: "desc" }, select: { id: true, version: true, changeNote: true, createdBy: true, createdAt: true, pdfBytes: true } }, emails: { orderBy: { createdAt: "desc" } }, followups: { orderBy: { stepIndex: "asc" } }, project: true } });
  if (!p) notFound();
  const row = await prisma.aiProposalVersion.findFirst({ where: { proposalId: id, version: p.currentVersion } });
  const c = row?.content as unknown as ProposalContent;
  if (!c) notFound();
  const q = c.quote;
  const [solutions, rules, currencies] = await Promise.all([getSolutions({ includeInactive: true }), getPricingRules(), SUPPORTED_QUOTE_CURRENCIES()]);
  const writable = can(user.role, "ai.write");

  return (
    <div>
      <PageHeader title={p.ref} subtitle={`${p.lead.company?.name ?? ""} · version ${p.currentVersion} · valid until ${p.validUntil ? fmtDate(p.validUntil) : "—"}`} actions={<><Badge>{p.status}</Badge><Link href={`/admin/ai-automation/leads/${p.leadId}`} className="rounded-lg border border-gray-300 bg-white px-3.5 py-2 text-sm font-medium hover:bg-gray-50">Open lead</Link></>} />
      {(q.status !== "COMPLETE" || q.approval.required) && (
        <Card className="mb-6 !border-amber-300 !bg-amber-50">
          <h2 className="text-base font-semibold text-amber-900">{q.status !== "COMPLETE" ? "Manual pricing review required" : "Approval needed from a manager"}</h2>
          <ul className="mt-2 list-disc pl-5 text-sm text-amber-900">{(q.status !== "COMPLETE" ? q.missing : q.approval.reasons).map((m, i) => <li key={i}>{m}</li>)}</ul>
        </Card>
      )}
      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <div className="space-y-6">
          <Card>
            <h2 className="mb-3 text-base font-semibold">Itemised pricing {q.fx && <span className="text-xs font-normal text-gray-500">· converted at {q.fx.rate} ({q.fx.source}, {fmtDate(q.fx.asOf)})</span>}</h2>
            <div className="overflow-x-auto"><table className="w-full min-w-[520px] text-sm"><thead><tr className="text-left text-xs text-gray-500"><th>Item</th><th>Qty</th><th className="text-right">Unit</th><th className="text-right">Total</th></tr></thead><tbody>
              {q.lines.map((l, i) => <tr key={i} className={`border-t border-gray-100 ${l.included ? "" : "text-gray-400"}`}><td className="py-1.5">{l.name}{l.recurring ? " (monthly)" : ""}{!l.included ? " — optional" : ""}</td><td>{l.quantity}</td><td className="text-right">{formatMoney(l.unitPrice, q.currency)}</td><td className="text-right">{formatMoney(l.total, q.currency)}</td></tr>)}
            </tbody></table></div>
            {q.status === "COMPLETE" ? (
              <dl className="mt-4 grid gap-3 border-t border-gray-200 pt-4 text-sm sm:grid-cols-2"><div><dt className="text-xs text-gray-500">Initial investment</dt><dd className="text-xl font-semibold">{formatMoney(q.initialTotal, q.currency)}</dd></div><div><dt className="text-xs text-gray-500">Monthly recurring</dt><dd className="text-xl font-semibold">{formatMoney(q.monthlyTotal, q.currency)}</dd></div>
                <div className="sm:col-span-2"><dt className="text-xs text-gray-500">Payment schedule</dt><dd>{q.paymentSchedule.map((m) => `${m.label}: ${m.percent}% (${formatMoney(m.amount, q.currency)})`).join(" · ")}</dd></div></dl>
            ) : <p className="mt-4 text-sm text-amber-800">No totals are shown while pricing is incomplete.</p>}
            {q.notes.length > 0 && <p className="mt-3 text-xs text-gray-500">{q.notes.join(" ")}</p>}
          </Card>
          {writable && <Card><ProposalEditor proposalId={p.id} status={p.status} quoteComplete={q.status === "COMPLETE"} quoteInput={c.quoteInput} currencies={currencies}
            catalogue={solutions.filter((s) => s.active || c.quoteInput.items.some((i) => i.key === s.key)).map((s) => ({ key: s.key, name: s.name, priced: s.basePrice != null }))}
            optionalServices={rules.filter((r) => r.kind === "OPTIONAL_SERVICE" && r.active).map((r) => ({ key: r.key, name: String(r.params.name ?? r.key) }))}
            can={{ approve: can(user.role, "ai.approve"), pricing: can(user.role, "ai.pricing") }}
            sections={{ executiveSummary: c.executiveSummary, understanding: c.understanding, challenges: c.challenges, timeline: c.timeline, expectedOutcomes: c.expectedOutcomes, assumptions: c.assumptions, exclusions: c.exclusions, dependencies: c.dependencies, paymentTerms: c.paymentTerms, acceptance: c.acceptance }} /></Card>}
        </div>
        <div className="space-y-6">
          <Card><h2 className="mb-3 text-base font-semibold">Version history</h2><ul className="space-y-2 text-sm">{p.versions.map((v) => <li key={v.id} className="flex flex-wrap items-center justify-between gap-2"><span><span className="font-medium">v{v.version}</span> · {v.changeNote} <span className="text-xs text-gray-500">— {v.createdBy}, {fmtDate(v.createdAt)}</span></span>{v.pdfBytes ? <a className="text-xs text-[var(--primary)] hover:underline" href={`/api/ai-automation/admin/proposals/${p.id}/pdf?version=${v.version}`}>PDF</a> : <span className="text-xs text-gray-400">PDF pending</span>}</li>)}</ul></Card>
          <Card><h2 className="mb-3 text-base font-semibold">Emails</h2>{p.emails.length === 0 ? <p className="text-sm text-gray-500">None yet.</p> : <ul className="space-y-2 text-sm">{p.emails.map((e) => <li key={e.id}><span className="font-medium">{e.subject}</span><br /><span className="text-xs text-gray-500">{human(e.kind)} → {e.toEmail} · {e.status === "ACCEPTED" ? "Accepted by mail server — delivery not confirmed" : human(e.status)} · {fmtDate(e.createdAt)}{e.error ? ` · ${e.error}` : ""}</span></li>)}</ul>}</Card>
          <Card><h2 className="mb-3 text-base font-semibold">Follow-ups</h2>{p.followups.length === 0 ? <p className="text-sm text-gray-500">None scheduled (they start when the proposal is sent, for customers who agreed to follow-up).</p> : <ul className="space-y-1.5 text-sm">{p.followups.map((f) => <li key={f.id}>Step {f.stepIndex + 1} · {f.status.toLowerCase()} · due {fmtDate(f.dueAt)}{f.reason ? ` · ${human(f.reason)}` : ""}</li>)}</ul>}</Card>
          {p.project && <Card><h2 className="mb-2 text-base font-semibold">Implementation</h2><p className="text-sm">Status: {human(p.project.status)} · provider: {p.project.provider}</p></Card>}
        </div>
      </div>
    </div>
  );
}
