import Link from "next/link";
import { prisma } from "@/lib/prisma";
import ApiForm from "@/components/os/ApiForm";
import ApiButton from "@/components/os/ApiButton";
import { Badge, Card, PageHeader, Stat, centsToUsd, ago } from "@/components/os/ui";
import { GROWTH_ORG, growthEnabled } from "@/lib/growth/config";
import { fmtRate, growthFunnel, lastDays, METRIC_DEFINITIONS } from "@/lib/growth/funnel";
import { snovStatus } from "@/lib/growth/enrich";

export const dynamic = "force-dynamic";
const n = (v: number | null) => (v === null ? "N/A" : String(v));

export default async function GrowthPage() {
  if (!growthEnabled()) return <div><PageHeader title="Growth Engine" subtitle="Disabled." /><Card><p className="text-sm text-gray-600">Set <code>GROWTH_ENGINE_ENABLED=true</code> in the environment to turn on research, enrichment, approvals and sending. Nothing runs while it is off.</p></Card></div>;
  const { from, to } = lastDays(30);
  const [f, companies, pendingDrafts, snov, queued] = await Promise.all([
    growthFunnel(from, to),
    prisma.grCompany.findMany({ where: { orgId: GROWTH_ORG }, orderBy: { updatedAt: "desc" }, take: 50 }),
    prisma.grDraft.count({ where: { status: "PENDING_APPROVAL" } }),
    Promise.resolve(snovStatus()),
    prisma.grOutbox.count({ where: { status: "SCHEDULED" } }),
  ]);
  const empty = f.researched === 0 && companies.length === 0;
  return (
    <div className="space-y-6">
      <PageHeader title="Growth Engine" subtitle="Last 30 days. Every figure is counted from stored records; “N/A” means the denominator is zero or the provider gives no signal." actions={<span className="flex gap-2"><Link href="/admin/growth/replies" className="rounded-lg border border-[var(--primary)] px-3 py-2 text-sm font-medium text-[var(--primary)]">Replies &amp; conversion</Link><Link href="/admin/growth/approvals" className="rounded-lg bg-[var(--primary)] px-3 py-2 text-sm font-medium text-white">Approval queue ({pendingDrafts})</Link></span>} />
      {!snov.configured && <Card><p className="text-sm text-amber-800">Snov.io: {snov.reason} Contact enrichment is unavailable until then.</p></Card>}
      {empty && <Card><p className="text-sm text-gray-600">No data yet. Run discovery below (needs GOOGLE_PLACES_API_KEY) or add businesses manually.</p></Card>}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Researched" value={String(f.researched)} hint={METRIC_DEFINITIONS.researched} />
        <Stat label="Qualified" value={String(f.qualified)} hint={`Qualification rate ${fmtRate(f.qualificationRate)}`} />
        <Stat label="Verified decision-makers" value={String(f.verifiedDecisionMakers)} />
        <Stat label="Provider-verified emails" value={String(f.verifiedContacts)} hint={`Contact coverage ${fmtRate(f.contactCoverage)}`} />
        <Stat label="Drafts / approved" value={`${f.draftsGenerated} / ${f.draftsApproved}`} />
        <Stat label="Sent" value={String(f.sent)} hint={`Queued: ${queued} · Delivered: N/A (SMTP has no receipts)`} />
        <Stat label="Replies / positive" value={`${f.replies} / ${f.positiveReplies}`} hint={`Positive reply rate ${fmtRate(f.positiveReplyRate)} of first-touch sent`} />
        <Stat label="Paying customers · cash" value={`${n(f.payingCustomers)} · ${centsToUsd(f.cashCollectedCents)}`} hint="Only revenue linked to a Growth prospect" />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card><h2 className="mb-3 text-base font-semibold">Run discovery (US HVAC)</h2><ApiForm url="/api/growth/discover" submitLabel="Discover & research" fields={[{ name: "area", label: "City / state", required: true, placeholder: "Austin, TX" }, { name: "limit", label: "Max businesses", type: "number", defaultValue: 10 }]} /></Card>
        <Card><h2 className="mb-3 text-base font-semibold">Add a business manually</h2><AddOne /></Card>
      </div>
      <Card>
        <div className="mb-3 flex items-center justify-between"><h2 className="text-base font-semibold">Companies</h2><ApiButton label="Process replies & dispatch now" url="/api/growth/run" variant="secondary" /></div>
        <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="text-xs uppercase text-gray-500"><tr><th className="py-2">Company</th><th>Status</th><th>Fit</th><th>Readiness</th><th>Conf.</th><th>Researched</th></tr></thead><tbody>
          {companies.map((c) => <tr key={c.id} className="border-t border-gray-100"><td className="py-2"><Link className="font-medium text-[var(--primary)]" href={`/admin/growth/${c.id}`}>{c.name}</Link><div className="text-xs text-gray-500">{c.domain}</div></td><td><Badge>{c.status}</Badge></td><td>{c.fitScore ?? "—"}</td><td>{c.readinessScore ?? "—"}</td><td>{c.confidence ?? "—"}</td><td>{ago(c.researchedAt)}</td></tr>)}
          {companies.length === 0 && <tr><td colSpan={6} className="py-4 text-gray-500">No companies yet.</td></tr>}
        </tbody></table></div>
      </Card>
    </div>
  );
}

function AddOne() {
  return <ApiForm url="/api/growth/candidates" submitLabel="Research this business" fields={[{ name: "name", label: "Business name", required: true }, { name: "website", label: "Official website", required: true, placeholder: "example-hvac.com" }]} />;
}
