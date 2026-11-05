import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Download } from "lucide-react";
import { Container } from "@/components/ai-automation/ui";
import { verifyToken } from "@/lib/ai-automation/tokens";
import { prisma } from "@/lib/prisma";
import { getProposalContent } from "@/lib/ai-automation/proposal/service";
import { formatMoney } from "@/lib/ai-automation/pricing";
import { buildMetadata } from "@/lib/ai-automation/seo";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { ...buildMetadata({ title: "Your proposal | RaveSoft", description: "Your personalised RaveSoft AI automation proposal.", path: "/ai-automation/proposal", keywords: [], noindex: true }), other: { referrer: "no-referrer" } };

/** Private customer view of an approved proposal, reached only through the signed link in the email. */
export default async function ProposalView({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const t = verifyToken(token, "proposal");
  if (!t) notFound();
  const p = await prisma.aiProposal.findUnique({ where: { id: t.id } });
  if (!p || !["APPROVED", "SENT", "ACCEPTED"].includes(p.status)) notFound();
  if (!p.viewedAt) await prisma.aiProposal.update({ where: { id: p.id }, data: { viewedAt: new Date() } }).catch(() => undefined);
  const { content: c } = await getProposalContent(p.id);
  const q = c.quote;
  return (
    <main className="bg-[#F7F9FC] pb-16 pt-28 text-[#172033]">
      <Container className="max-w-3xl">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#060297]">AI business automation proposal</p>
        <h1 className="mt-2 text-3xl font-bold text-[#071536]">Prepared for {c.customer.businessName}</h1>
        <p className="mt-1 text-sm text-[#64748B]">Reference {c.reference} · {c.validityText}</p>
        <a href={`/api/ai-automation/proposals/${token}/pdf`} className="mt-5 inline-flex min-h-[48px] items-center gap-2 rounded-lg bg-[#FFB200] px-5 font-bold text-[#071536] hover:bg-[#ffc233]"><Download className="h-4 w-4" aria-hidden="true" />Download the full PDF</a>
        <section className="mt-8 rounded-lg border border-slate-200 bg-white p-6"><h2 className="font-bold text-[#071536]">Summary</h2><p className="mt-2 whitespace-pre-line text-[15px] leading-relaxed">{c.executiveSummary}</p></section>
        <section className="mt-5 rounded-lg border border-slate-200 bg-white p-6"><h2 className="font-bold text-[#071536]">Recommended solutions</h2><ul className="mt-2 list-disc space-y-1 pl-5 text-[15px]">{c.solutions.map((s) => <li key={s.key}>{s.name}</li>)}</ul></section>
        {q.status === "COMPLETE" && (
          <section className="mt-5 rounded-lg border border-slate-200 bg-white p-6">
            <h2 className="font-bold text-[#071536]">Investment</h2>
            <dl className="mt-3 grid gap-4 sm:grid-cols-2"><div><dt className="text-sm text-[#64748B]">Initial investment</dt><dd className="text-2xl font-bold text-[#071536]">{formatMoney(q.initialTotal, q.currency)}</dd></div><div><dt className="text-sm text-[#64748B]">Monthly recurring</dt><dd className="text-2xl font-bold text-[#071536]">{formatMoney(q.monthlyTotal, q.currency)}</dd></div></dl>
          </section>
        )}
        <section className="mt-5 rounded-lg border border-slate-200 bg-white p-6"><h2 className="font-bold text-[#071536]">How to accept</h2><p className="mt-2 text-[15px] leading-relaxed">{c.acceptance}</p><p className="mt-3 text-sm text-[#64748B]">{c.company.name} · {c.company.email} · {c.company.phone}</p></section>
      </Container>
    </main>
  );
}
