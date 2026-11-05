import Link from "next/link";
import { Badge, Card, PageHeader } from "@/components/os/ui";
import { requireAdmin } from "@/lib/ai-automation/admin-auth";
import { first, fmtDate, human } from "@/lib/ai-automation/format";
import { PIPELINE_STATUSES } from "@/lib/ai-automation/types";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";
const PAGE = 25;

// A plain anchor on purpose: this is a CSV download from an API route, not a page navigation.
/* eslint-disable @next/next/no-html-link-for-pages */
const ExportLink = () => <a href="/api/ai-automation/admin/leads/export" className="rounded-lg border border-gray-300 bg-white px-3.5 py-2 text-sm font-medium hover:bg-gray-50">Export CSV</a>;
/* eslint-enable @next/next/no-html-link-for-pages */

export default async function AiLeads({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { allowed } = await requireAdmin("ai.read");
  if (!allowed) return <p>No access.</p>;
  const sp = await searchParams;
  const q = (first(sp.q) ?? "").trim().slice(0, 100);
  const industry = first(sp.industry) ?? "";
  const country = first(sp.country) ?? "";
  const status = first(sp.status) ?? "";
  const priority = first(sp.priority) ?? "";
  const page = Math.max(1, Number(first(sp.page) ?? 1) || 1);

  const where = {
    anonymisedAt: null,
    ...(industry ? { industrySlug: industry } : {}), ...(country ? { country } : {}), ...(status ? { status } : {}), ...(priority ? { priority } : {}),
    ...(q ? { OR: [{ company: { is: { name: { contains: q } } } }, { contact: { is: { email: { contains: q } } } }, { contact: { is: { firstName: { contains: q } } } }, { contact: { is: { lastName: { contains: q } } } }, { assignedTo: { contains: q } }] } : {}),
  };
  const [leads, total, industries, countries] = await Promise.all([
    prisma.aiLead.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * PAGE, take: PAGE, include: { contact: true, company: true, proposals: { select: { ref: true, status: true } } } }),
    prisma.aiLead.count({ where }),
    prisma.aiLead.findMany({ distinct: ["industrySlug"], select: { industrySlug: true } }),
    prisma.aiLead.findMany({ distinct: ["country"], select: { country: true } }),
  ]);
  const link = (patch: Record<string, string | number>) => { const p = new URLSearchParams(); for (const [k, v] of Object.entries({ q, industry, country, status, priority, page, ...patch })) if (v && !(k === "page" && Number(v) === 1)) p.set(k, String(v)); return `/admin/ai-automation/leads${p.size ? `?${p}` : ""}`; };
  const pages = Math.max(1, Math.ceil(total / PAGE));
  const sel = "rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-sm";
  return (
    <div>
      <PageHeader title="Leads" subtitle={`${total} lead${total === 1 ? "" : "s"}`} actions={<ExportLink />} />
      <form method="get" className="mb-4 flex flex-wrap items-end gap-2">
        <input name="q" defaultValue={q} placeholder="Search business, name, email, assignee" className={cn(sel, "w-64")} aria-label="Search" />
        <select name="industry" defaultValue={industry} className={sel} aria-label="Industry"><option value="">All industries</option>{industries.map((i) => i.industrySlug && <option key={i.industrySlug} value={i.industrySlug}>{human(i.industrySlug)}</option>)}</select>
        <select name="country" defaultValue={country} className={sel} aria-label="Country"><option value="">All countries</option>{countries.map((c) => c.country && <option key={c.country}>{c.country}</option>)}</select>
        <select name="status" defaultValue={status} className={sel} aria-label="Status"><option value="">All statuses</option>{PIPELINE_STATUSES.map((s) => <option key={s} value={s}>{human(s)}</option>)}</select>
        <select name="priority" defaultValue={priority} className={sel} aria-label="Priority"><option value="">All priorities</option>{["HIGH", "MEDIUM", "LOW", "MANUAL_REVIEW"].map((s) => <option key={s} value={s}>{human(s)}</option>)}</select>
        <button className="rounded-lg bg-[var(--primary)] px-3.5 py-1.5 text-sm font-medium text-white">Filter</button>
      </form>
      <Card className="overflow-x-auto !p-0">
        <table className="w-full min-w-[820px] text-sm">
          <thead className="bg-gray-50 text-left text-xs text-gray-500"><tr><th className="p-3">Business</th><th>Contact</th><th>Industry</th><th>Country</th><th>Status</th><th>Priority</th><th>Assigned</th><th>Created</th></tr></thead>
          <tbody>
            {leads.map((l) => (
              <tr key={l.id} className="border-t border-gray-100 hover:bg-gray-50">
                <td className="p-3"><Link className="font-medium text-[var(--primary)] hover:underline" href={`/admin/ai-automation/leads/${l.id}`}>{l.company?.name ?? "—"}</Link></td>
                <td>{[l.contact.firstName, l.contact.lastName].filter(Boolean).join(" ")}<br /><span className="text-xs text-gray-500">{l.contact.email}</span></td>
                <td>{human(l.industrySlug)}</td><td>{l.country ?? "—"}</td><td>{human(l.status)}</td><td>{l.priority ? <Badge>{l.priority}</Badge> : "—"}</td><td>{l.assignedTo ?? "—"}</td><td className="text-xs text-gray-500">{fmtDate(l.createdAt)}</td>
              </tr>
            ))}
            {leads.length === 0 && <tr><td colSpan={8} className="p-6 text-center text-gray-500">No leads match.</td></tr>}
          </tbody>
        </table>
      </Card>
      {pages > 1 && <div className="mt-4 flex items-center gap-3 text-sm">{page > 1 && <Link href={link({ page: page - 1 })}>← Previous</Link>}<span className="text-gray-500">Page {page} of {pages}</span>{page < pages && <Link href={link({ page: page + 1 })}>Next →</Link>}</div>}
    </div>
  );
}
