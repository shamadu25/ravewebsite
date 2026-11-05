import Link from "next/link";
import { loadIntel } from "@/components/analytics/load";
import { BarList, FilterBar, NoAccess, PageTitle, Section, Table, chLabel, fmt } from "@/components/analytics/kit";
import { behaviour } from "@/lib/analytics/queries";

export default async function BehaviourPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const ctx = await loadIntel(searchParams);
  if (!ctx) return <NoAccess />;
  const { f } = ctx;
  const b = await behaviour(f);
  return (
    <div>
      <PageTitle title="Visitor Behaviour" subtitle="Anonymised navigation: where visitors enter, where they go next, where they leave, and what converting journeys look like." />
      <FilterBar f={f} />
      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="Entry pages"><BarList rows={b.entries.map((e) => ({ label: String(e.p), value: e.n }))} /></Section>
        <Section title="Exit pages"><BarList rows={b.exits.map((e) => ({ label: String(e.p), value: e.n }))} /></Section>
        <Section title="Most common next steps" subtitle="Page → next page within a session"><BarList rows={b.transitions.map((t) => ({ label: `${t.a} → ${t.b}`, value: t.n }))} /></Section>
        <Section title="Pages per session"><BarList rows={b.depth.map((d) => ({ label: `${d.pv} page${Number(d.pv) === 1 ? "" : "s"}`, value: d.n }))} /></Section>
      </div>
      <Section className="mt-6" title="Recent converting journeys" subtitle="Page sequences of sessions that ended in a confirmed enquiry. Open one for the full timeline.">
        <Table head={[{ label: "Started" }, { label: "Source" }, { label: "Journey" }]} empty="No converting sessions in this period."
          rows={b.journeys.map((j) => [<Link key="s" className="text-[#060297] underline" href={`/admin/intelligence/visitors/${j.sid}`}>{new Date(j.started_at as Date).toISOString().slice(0, 16).replace("T", " ")}</Link>, `${chLabel(String(j.channel))}${j.cc ? ` · ${j.cc}` : ""}`, <span key="p" className="break-all text-xs">{String(j.path)}</span>])} />
        <p className="mt-2 text-xs text-gray-400">{fmt(b.journeys.length)} shown.</p>
      </Section>
    </div>
  );
}
