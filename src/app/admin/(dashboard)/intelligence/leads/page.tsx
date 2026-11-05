import Link from "next/link";
import { loadIntel, pageNo } from "@/components/analytics/load";
import { BarList, ExportLink, FilterBar, Kpi, KpiGrid, NoAccess, PageTitle, Pager, Section, Status, Table, chLabel, dur, fmt } from "@/components/analytics/kit";
import { leadAttribution } from "@/lib/analytics/queries";
import { filterQuery } from "@/lib/analytics/filters";
import { prisma } from "@/lib/prisma";

export default async function LeadAttributionPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const ctx = await loadIntel(searchParams);
  if (!ctx) return <NoAccess />;
  const { f, sp } = ctx;
  const page = pageNo(sp);
  const [d, leadRows] = await Promise.all([leadAttribution(f, page), prisma.lead.count({ where: { createdAt: { gte: f.from, lt: f.to } } })]);
  const unattributed = d.rows.filter((r) => !r.attributed).length;
  return (
    <div>
      <PageTitle title="Lead Attribution" subtitle="Each row is a lead the existing backend saved, linked to the visitor session that produced it. A conversion is written only after the lead is persisted, once per lead."><ExportLink report="lead-attribution" f={f} /></PageTitle>
      <FilterBar f={f} />
      <KpiGrid>
        <Kpi label="Leads saved in period" value={fmt(leadRows)} hint="From the leads table (all sources)" />
        <Kpi label="With analytics record" value={fmt(d.total)} hint="Website-form leads recorded by the hook" accent />
        <Kpi label="No tracked session (this page)" value={fmt(unattributed)} hint="Visitor blocked tracking, or no consent" />
      </KpiGrid>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Section title="First touch" subtitle="Channel of the visitor’s very first visit (never overwritten)"><BarList rows={d.firstTouch.map((r) => ({ label: r.key === "unattributed" ? "Unattributed" : chLabel(r.key), value: r.n }))} /></Section>
        <Section title="Last touch" subtitle={`Channel of the converting session, or the latest non-direct visit inside the attribution window`}><BarList rows={d.lastTouch.map((r) => ({ label: r.key === "unattributed" ? "Unattributed" : chLabel(r.key), value: r.n }))} /></Section>
      </div>
      <Section className="mt-6" title="Leads">
        <Table
          head={[{ label: "When" }, { label: "Lead" }, { label: "Service" }, { label: "First touch" }, { label: "Last touch" }, { label: "Landing → converted on" }, { label: "Country" }, { label: "Device" }, { label: "Pages", right: true }, { label: "Prior visits", right: true }, { label: "Engaged before", right: true }]}
          empty="No leads recorded for these filters."
          rows={d.rows.map((r) => [
            new Date(r.occurred_at as Date).toISOString().slice(0, 16).replace("T", " "),
            <Link key="l" className="text-[#060297] underline" href={`/admin/leads/${r.lead_id}`}>#{String(r.lead_id)}</Link>,
            String(r.service ?? "—"),
            chLabel(r.ft_channel as string | null), <span key="lt">{chLabel(r.lt_channel as string | null)}{r.lt_campaign ? ` · ${r.lt_campaign}` : ""}</span>,
            <span key="p" className="break-all text-xs">{String(r.landing_page ?? "—").split("?")[0]} → {String(r.conversion_page ?? "—")}</span>,
            String(r.country_code ?? "—"), String(r.device ?? "—"), Number(r.pages_visited), Number(r.previous_visits), r.attributed ? dur(Number(r.engaged_seconds_before)) : <Status key="s" tone="off">n/a</Status>,
          ])} />
        <Pager total={d.total} page={page} pageSize={d.pageSize} base={filterQuery(f)} />
      </Section>
    </div>
  );
}
