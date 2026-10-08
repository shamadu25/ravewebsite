import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { ORG_ID } from "@/lib/os/constants";
import ApiForm from "@/components/os/ApiForm";
import AutoRefresh from "@/components/os/AutoRefresh";
import { Card, PageHeader, Stat, centsToUsd, usd } from "@/components/os/ui";
import { goalState, priorities } from "@/lib/os/dashboard-data";
import { daysAgo } from "@/lib/os/time";

export const dynamic = "force-dynamic";

// Spec §52 board columns mapped onto the pipeline stages.
const COLUMNS: Array<{ title: string; stages: string[] }> = [
  { title: "Research", stages: ["NEW", "RESEARCHED"] },
  { title: "Contacted", stages: ["CONTACTED"] },
  { title: "Engaged", stages: ["ENGAGED"] },
  { title: "Qualified", stages: ["QUALIFIED"] },
  { title: "Demo", stages: ["DEMO"] },
  { title: "Proposal", stages: ["PROPOSAL"] },
  { title: "Negotiation", stages: ["NEGOTIATION", "VERBAL_COMMITMENT"] },
  { title: "Won", stages: ["WON"] },
  { title: "Lost / Nurture", stages: ["LOST", "NURTURE"] },
];

export default async function RevenuePage() {
  const [opps, { pipeline }, ranked] = await Promise.all([
    prisma.osOpportunity.findMany({ where: { orgId: ORG_ID }, orderBy: [{ score: "desc" }, { id: "desc" }], take: 300 }),
    goalState(), priorities(),
  ]);
  const since = daysAgo(30);
  const newLeads = opps.filter((o) => o.createdAt >= since && !["WON", "LOST"].includes(o.stage)).length;
  const qualified = opps.filter((o) => ["QUALIFIED", "DEMO", "PROPOSAL", "NEGOTIATION", "VERBAL_COMMITMENT"].includes(o.stage)).length;
  const won = opps.filter((o) => o.stage === "WON"), lost = opps.filter((o) => o.stage === "LOST").length;
  const wonRevenue = won.reduce((n, o) => n + o.dealValueCents, 0);
  const conversion = won.length + lost >= 3 ? Math.round((won.length / (won.length + lost)) * 100) : null;
  const nextActions = opps.filter((o) => o.nextAction && !["WON", "LOST", "NURTURE"].includes(o.stage)).slice(0, 4);

  return (
    <div className="space-y-6">
      <AutoRefresh seconds={30} />
      <PageHeader title="Leads & Sales" subtitle="Adding a prospect queues the Prospecting Agent, which analyses the website, scores the fit and recommends an AI employee." />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <Stat label="New leads (30d)" value={String(newLeads)} />
        <Stat label="Qualified leads" value={String(qualified)} />
        <Stat label="Pipeline" value={usd(pipeline.openValueUsd)} hint={`${usd(pipeline.weightedValueUsd)} weighted`} />
        <Stat label="Conversion rate" value={conversion == null ? "No data" : `${conversion}%`} hint={conversion == null ? "Needs 3+ closed deals" : undefined} />
        <Stat label="Won revenue" value={centsToUsd(wonRevenue)} />
      </div>
      <Card>
        <h2 className="mb-3 text-[16px] font-semibold">Recommended next actions</h2>
        {nextActions.length === 0 && ranked.length === 0 ? <p className="text-[14px] text-[var(--muted)]">Add a prospect and the AI will recommend what to do next.</p> : (
          <ul className="space-y-2 text-[14px]">
            {ranked.slice(0, 2).map((r) => <li key={r.title}><b>{r.title}</b> <span className="text-[var(--muted)]">— {r.why}</span></li>)}
            {nextActions.map((o) => <li key={o.id}><Link className="font-medium hover:underline" href={`/admin/revenue/${o.id}`}>{o.companyName}</Link> <span className="text-[var(--muted)]">— {o.nextAction}</span></li>)}
          </ul>
        )}
      </Card>
      <Card>
        <h2 className="mb-3 text-sm font-semibold text-gray-900">Add prospect</h2>
        <ApiForm
          url="/api/os/opportunities" submitLabel="Add and research"
          fields={[
            { name: "companyName", label: "Company", required: true },
            { name: "industry", label: "Industry", placeholder: "Dental, Hotel, Real Estate…" },
            { name: "website", label: "Website" },
            { name: "contactName", label: "Contact name" },
            { name: "contactEmail", label: "Contact email", type: "email" },
            { name: "contactPhone", label: "Contact phone" },
          ]}
        />
      </Card>
      <div className="flex gap-3 overflow-x-auto pb-2">
        {COLUMNS.map((col) => {
          const items = opps.filter((o) => col.stages.includes(o.stage));
          return (
            <div key={col.title} className="w-64 shrink-0">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">{col.title} <span className="text-gray-400">({items.length})</span></p>
              <div className="space-y-2">
                {items.map((o) => (
                  <Link key={o.id} href={`/admin/revenue/${o.id}`} className="block rounded-xl border border-gray-200 bg-white p-3 hover:border-gray-400">
                    <p className="truncate text-sm font-medium text-gray-900">{o.companyName}</p>
                    <p className="text-xs text-gray-500">{o.industry ?? "Industry unknown"}{o.isDemo ? " · DEMO" : ""}</p>
                    <div className="mt-2 flex items-center justify-between text-xs">
                      <span className="text-gray-700">{o.score != null ? `Score ${o.score}` : "Unscored"}</span>
                      <span className="text-gray-700">{centsToUsd(o.dealValueCents)}</span>
                    </div>
                    {(o.recommendedEmployees as string[] | null)?.[0] && <p className="mt-1 truncate text-xs text-gray-500">{(o.recommendedEmployees as string[])[0]}</p>}
                    {o.nextAction && <p className="mt-1 truncate text-xs text-[var(--primary)]">Next: {o.nextAction}</p>}
                  </Link>
                ))}
                {items.length === 0 && <p className="rounded-xl border border-dashed border-gray-200 p-3 text-xs text-gray-400">Empty</p>}
              </div>
            </div>
          );
        })}
      </div>
      <p className="text-[12px] text-[var(--muted)]">NEW and RESEARCHED prospects share the Research column.</p>
    </div>
  );
}
