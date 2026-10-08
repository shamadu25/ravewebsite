import { prisma } from "@/lib/prisma";
import { ORG_ID } from "@/lib/os/constants";
import ApiButton from "@/components/os/ApiButton";
import ApiForm from "@/components/os/ApiForm";
import { Badge, Card, PageHeader, centsToUsd } from "@/components/os/ui";

export const dynamic = "force-dynamic";
const NEXT: Record<string, string | undefined> = { DRAFT: "REVIEW", REVIEW: "APPROVED", APPROVED: "PUBLISHED" };

export default async function MarketingPage() {
  const [campaigns, content] = await Promise.all([
    prisma.osCampaign.findMany({ where: { orgId: ORG_ID }, orderBy: { id: "desc" }, take: 50 }),
    prisma.osContent.findMany({ where: { orgId: ORG_ID }, orderBy: { id: "desc" }, take: 50 }),
  ]);
  return (
    <div className="space-y-6">
      <PageHeader title="Marketing" subtitle="Judged by revenue, not volume. Campaign figures are entered here — they are not synced from ad platforms (no ads integration is connected)." />
      <Card>
        <h2 className="mb-3 text-sm font-semibold">New campaign</h2>
        <ApiForm url="/api/os/campaigns" submitLabel="Create campaign" fields={[
          { name: "name", label: "Name", required: true }, { name: "channel", label: "Channel", type: "select", options: ["EMAIL", "WHATSAPP", "SMS", "LINKEDIN", "WEB_CHAT", "VOICE"] },
          { name: "goal", label: "Goal", required: true }, { name: "audience", label: "Audience", required: true }, { name: "offer", label: "Offer", required: true },
          { name: "budgetUsd", label: "Budget (USD)", type: "number", required: true }, { name: "expectedLeads", label: "Expected leads", type: "number" },
          { name: "expectedCustomers", label: "Expected customers", type: "number" }, { name: "expectedRevenueUsd", label: "Expected revenue (USD)", type: "number" },
        ]} />
      </Card>
      {campaigns.map((c) => {
        const roi = c.spendCents > 0 ? ((c.revenueCents - c.spendCents) / c.spendCents) * 100 : null;
        return (
          <Card key={c.id}>
            <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-semibold text-gray-900">{c.name}</h3><span className="flex gap-2"><Badge>{c.status === "ACTIVE" ? "ACTIVE" : c.status === "PAUSED" ? "PAUSED" : "DRAFT"}</Badge></span></div>
            <p className="text-xs text-gray-500">{c.channel} · {c.audience} · {c.offer}</p>
            <div className="mt-2 grid grid-cols-2 gap-2 text-sm sm:grid-cols-6">
              <span>Budget {centsToUsd(c.budgetCents)}</span><span>Spend {centsToUsd(c.spendCents)}</span><span>Leads {c.leads}/{c.expectedLeads}</span><span>Customers {c.customers}/{c.expectedCustomers}</span><span>Revenue {centsToUsd(c.revenueCents)}</span><span>ROI {roi == null ? "No data" : `${roi.toFixed(0)}%`}</span>
            </div>
            <div className="mt-2 flex gap-2">{c.status !== "ACTIVE" && <ApiButton label="Mark active" url={`/api/os/campaigns/${c.id}`} method="PATCH" body={{ status: "ACTIVE" }} />}{c.status === "ACTIVE" && <ApiButton label="Pause" url={`/api/os/campaigns/${c.id}`} method="PATCH" body={{ status: "PAUSED" }} />}</div>
          </Card>
        );
      })}
      <Card>
        <h2 className="mb-3 text-sm font-semibold">Content</h2>
        <ApiForm url="/api/os/content" submitLabel="Create" fields={[
          { name: "type", label: "Type", type: "select", options: ["LINKEDIN_POST", "ARTICLE", "CASE_STUDY", "NEWSLETTER", "LANDING_COPY", "AD", "SCRIPT"] }, { name: "title", label: "Title / topic", required: true },
          { name: "body", label: "Body (leave empty to generate with AI)", type: "textarea" },
        ]} />
        <p className="mt-2 text-xs text-gray-500">To generate with the Content Agent, tick below and leave the body empty.</p>
        <div className="mt-2"><ApiForm url="/api/os/content" submitLabel="Generate with AI" extra={{ generate: true }} fields={[{ name: "type", label: "Type", type: "select", options: ["LINKEDIN_POST", "ARTICLE", "CASE_STUDY", "NEWSLETTER", "LANDING_COPY", "AD", "SCRIPT"] }, { name: "title", label: "Topic", required: true }]} /></div>
        <ul className="mt-4 space-y-3">
          {content.map((c) => (
            <li key={c.id} className="rounded-xl border border-gray-200 p-3 text-sm">
              <div className="flex items-center justify-between gap-2"><b>{c.title}</b><Badge>{c.status === "PUBLISHED" ? "COMPLETED" : "DRAFT"}</Badge></div>
              <p className="text-xs text-gray-400">{c.type} · {c.status} · {c.generatedBy}</p>
              <p className="mt-1 line-clamp-3 whitespace-pre-wrap text-gray-600">{c.body}</p>
              {NEXT[c.status] && <div className="mt-2"><ApiButton label={`Move to ${NEXT[c.status]}`} url={`/api/os/content/${c.id}`} method="PATCH" body={{ status: NEXT[c.status] }} /></div>}
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
