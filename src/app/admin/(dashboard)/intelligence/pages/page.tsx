import { loadIntel } from "@/components/analytics/load";
import { BarList, ExportLink, FilterBar, NoAccess, PageTitle, Section, Table, dur, fmt, pct } from "@/components/analytics/kit";
import { pageStats } from "@/lib/analytics/queries";

export default async function PagesPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const ctx = await loadIntel(searchParams);
  if (!ctx) return <NoAccess />;
  const { f } = ctx;
  const pages = await pageStats(f, 150);
  const big = pages.filter((p) => p.views >= 20);
  const noLeads = big.filter((p) => p.leadsAssisted === 0).sort((a, b) => b.uniqueVisitors - a.uniqueVisitors).slice(0, 6);
  return (
    <div>
      <PageTitle title="Page Analytics" subtitle="Every public page is tracked automatically. Engagement is active time (tab visible and recently interacted); elapsed is visible time. Conversion = sessions that viewed the page and later submitted a lead ÷ sessions that viewed it."><ExportLink report="pages" f={f} /></PageTitle>
      <FilterBar f={f} />
      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="Most visited"><BarList rows={pages.slice(0, 8).map((p) => ({ label: p.path, value: p.views }))} /></Section>
        <Section title="Highest engagement" subtitle="Avg. active seconds · pages with ≥20 views"><BarList valueLabel={dur} rows={[...big].sort((a, b) => b.avgEngagement - a.avgEngagement).slice(0, 8).map((p) => ({ label: p.path, value: p.avgEngagement }))} /></Section>
        <Section title="Highest lead-generating" subtitle="Converting sessions that viewed the page"><BarList rows={[...pages].sort((a, b) => b.leadsAssisted - a.leadsAssisted).filter((p) => p.leadsAssisted > 0).slice(0, 8).map((p) => ({ label: p.path, value: p.leadsAssisted, sub: pct(p.conversionRate) }))} emptyHint="No lead has been linked to a tracked session yet." /></Section>
        <Section title="Traffic without enquiries" subtitle="Pages with ≥20 views and no converting session"><BarList rows={noLeads.map((p) => ({ label: p.path, value: p.uniqueVisitors, sub: "visitors" }))} emptyHint="Every well-visited page has produced at least one enquiry — or there is not enough data yet." /></Section>
        <Section title="High exit rate" subtitle="Share of views that were the last page of the session"><BarList valueLabel={pct} rows={[...big].sort((a, b) => b.exitRate - a.exitRate).slice(0, 8).map((p) => ({ label: p.path, value: p.exitRate }))} /></Section>
        <Section title="Poor engagement" subtitle="Lowest average active time · ≥20 views"><BarList valueLabel={dur} rows={[...big].sort((a, b) => a.avgEngagement - b.avgEngagement).slice(0, 8).map((p) => ({ label: p.path, value: p.avgEngagement }))} /></Section>
      </div>
      <Section className="mt-6" title="All pages">
        <Table head={[{ label: "Page" }, { label: "Views", right: true }, { label: "Visitors", right: true }, { label: "Sessions", right: true }, { label: "Engaged", right: true }, { label: "Elapsed", right: true }, { label: "Scroll avg", right: true }, { label: "≥50%", right: true }, { label: "≥90%", right: true }, { label: "CTA", right: true }, { label: "Form starts", right: true }, { label: "Leads", right: true }, { label: "Exit", right: true }, { label: "Conv.", right: true }]}
          rows={pages.map((p) => [<span key="p" className="break-all" title={p.title ?? ""}>{p.path}</span>, fmt(p.views), fmt(p.uniqueVisitors), fmt(p.sessions), dur(p.avgEngagement), dur(p.avgElapsed), pct(p.avgScroll), pct(p.scroll50), pct(p.scroll90), p.ctaClicks, p.formStarts, p.leadsAssisted, pct(p.exitRate), pct(p.conversionRate)])} />
      </Section>
    </div>
  );
}
