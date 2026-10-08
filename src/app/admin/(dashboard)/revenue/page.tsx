import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { ORG_ID } from "@/lib/os/constants";
import ApiForm from "@/components/os/ApiForm";
import AutoRefresh from "@/components/os/AutoRefresh";
import { Badge, Card, PageHeader, centsToUsd } from "@/components/os/ui";

export const dynamic = "force-dynamic";

// Spec §52 board columns mapped onto the pipeline stages.
const COLUMNS: Array<{ title: string; stages: string[] }> = [
  { title: "Discovered", stages: ["NEW", "RESEARCHED"] },
  { title: "Outreach", stages: ["CONTACTED"] },
  { title: "Engaged", stages: ["ENGAGED"] },
  { title: "Qualified", stages: ["QUALIFIED"] },
  { title: "Demo", stages: ["DEMO"] },
  { title: "Proposal", stages: ["PROPOSAL"] },
  { title: "Negotiation", stages: ["NEGOTIATION", "VERBAL_COMMITMENT"] },
  { title: "Won", stages: ["WON"] },
  { title: "Lost / Nurture", stages: ["LOST", "NURTURE"] },
];

export default async function RevenuePage() {
  const opps = await prisma.osOpportunity.findMany({ where: { orgId: ORG_ID }, orderBy: [{ score: "desc" }, { id: "desc" }], take: 300 });

  return (
    <div className="space-y-6">
      <AutoRefresh seconds={30} />
      <PageHeader title="Revenue opportunities" subtitle="Adding a prospect queues the Prospecting Agent, which analyses the website, scores the fit and recommends an AI employee." />
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
                    {o.nextAction && <p className="mt-1 truncate text-xs text-blue-700">Next: {o.nextAction}</p>}
                  </Link>
                ))}
                {items.length === 0 && <p className="rounded-xl border border-dashed border-gray-200 p-3 text-xs text-gray-400">Empty</p>}
              </div>
            </div>
          );
        })}
      </div>
      <p className="text-xs text-gray-400">Stage <Badge>NEW</Badge> and RESEARCHED share the Discovered column.</p>
    </div>
  );
}
