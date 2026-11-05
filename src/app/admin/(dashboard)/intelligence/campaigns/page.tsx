import Link from "next/link";
import { loadIntel } from "@/components/analytics/load";
import { Empty, ExportLink, FilterBar, Kpi, KpiGrid, NoAccess, PageTitle, Section, Status, Table, chLabel, fmt, pct } from "@/components/analytics/kit";
import { adSpendByChannel, byChannel, campaignMatrix } from "@/lib/analytics/queries";
import { integrationStatuses } from "@/lib/analytics/integrations";

const usd = (c: number | null) => (c == null ? "—" : `$${(c / 100).toLocaleString("en-US", { maximumFractionDigits: 2 })}`);

export default async function CampaignsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const ctx = await loadIntel(searchParams);
  if (!ctx) return <NoAccess />;
  const { f } = ctx;
  const [camps, channels, spend] = await Promise.all([campaignMatrix(f), byChannel(f), adSpendByChannel(f)]);
  const totalSpend = [...spend.values()].reduce((a, b) => a + b, 0);
  const paidLeads = channels.filter((c) => spend.has(c.key)).reduce((n, c) => n + c.leads, 0);
  return (
    <div>
      <PageTitle title="Campaign Analytics" subtitle="First-party campaign results from UTM tags and ad click ids. Spend is only what an administrator has entered — nothing is estimated or imported automatically."><ExportLink report="campaigns" f={f} /></PageTitle>
      <FilterBar f={f} />
      <KpiGrid>
        <Kpi label="Campaigns with traffic" value={fmt(camps.length)} />
        <Kpi label="Campaign leads" value={fmt(camps.reduce((n, c) => n + c.leads, 0))} />
        <Kpi label="Entered ad spend" value={totalSpend ? usd(totalSpend) : "None entered"} hint="USD, manual entries only" />
        <Kpi label="Cost per lead (entered spend)" value={totalSpend && paidLeads ? usd(totalSpend / paidLeads) : "No data"} hint={totalSpend ? "Spend ÷ leads from channels with spend" : "Needs spend entries"} />
      </KpiGrid>
      <Section className="mt-6" title="Campaign performance" subtitle="Only sessions tagged with utm_campaign. Untagged paid traffic cannot be assigned to a campaign.">
        {camps.length === 0 ? <Empty title="No tagged campaign traffic in this period" hint="Add utm_source, utm_medium and utm_campaign to ad links, e.g. ?utm_source=facebook&utm_medium=paid_social&utm_campaign=cliqpos_launch." /> : (
          <Table head={[{ label: "Campaign" }, { label: "Source / medium" }, { label: "Channel" }, { label: "Sessions", right: true }, { label: "Leads", right: true }, { label: "Conv.", right: true }, { label: "Spend", right: true }, { label: "Cost / lead", right: true }]}
            rows={camps.map((c) => [<Link key="c" className="text-[#060297] underline" href={`?range=${f.preset}&campaign=${encodeURIComponent(c.campaign)}`}>{c.campaign}</Link>, `${c.source || "—"} / ${c.medium || "—"}`, chLabel(c.channel), fmt(c.sessions), c.leads, pct(c.conversionRate), usd(c.spendCents), usd(c.costPerLeadCents)])} />
        )}
      </Section>
      <Section className="mt-6" title="Channel economics" subtitle="Cost per lead = entered spend ÷ backend-confirmed leads (last touch). Shown only where spend exists.">
        <Table head={[{ label: "Channel" }, { label: "Leads", right: true }, { label: "Spend", right: true }, { label: "Cost / lead", right: true }]}
          rows={channels.map((c) => [chLabel(c.key), c.leads, usd(spend.get(c.key) ?? null), spend.get(c.key) && c.leads ? usd((spend.get(c.key) as number) / c.leads) : "—"])} />
        <p className="mt-3 text-xs text-gray-500"><b>Revenue attribution:</b> not available — RaveSoft records revenue against customers, not against website leads, so there is no verified link from a lead to a payment. It is deliberately not guessed.</p>
      </Section>
      <Section className="mt-6" title="Imported third-party reporting" subtitle="Kept separate from first-party tracking.">
        <ul className="space-y-2 text-sm">{integrationStatuses().map((i) => <li key={i.id} className="flex flex-wrap items-start gap-2"><Status tone={i.state === "connected" ? "ok" : i.state === "partial" ? "warn" : "off"}>{i.state === "connected" ? "Connected" : i.state === "partial" ? "Tag only" : "Not configured"}</Status><span><b>{i.name}</b> — {i.detail}</span></li>)}</ul>
      </Section>
    </div>
  );
}
