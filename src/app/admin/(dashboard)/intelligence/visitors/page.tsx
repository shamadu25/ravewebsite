import Link from "next/link";
import { loadIntel, pageNo } from "@/components/analytics/load";
import { FilterBar, NoAccess, PageTitle, Pager, Section, Status, Table, chLabel, dur } from "@/components/analytics/kit";
import { sessionList } from "@/lib/analytics/queries";
import { filterQuery } from "@/lib/analytics/filters";

export default async function VisitorsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const ctx = await loadIntel(searchParams);
  if (!ctx) return <NoAccess />;
  const { f, sp } = ctx;
  const page = pageNo(sp);
  const { rows, total, pageSize } = await sessionList(f, page);
  return (
    <div>
      <PageTitle title="Visitors & Sessions" subtitle="Every session is a visit that ends after 30 minutes of inactivity. Click a session to read its timeline." />
      <FilterBar f={f} />
      <Section title="Sessions">
        <Table
          head={[{ label: "Started" }, { label: "Visitor" }, { label: "Location" }, { label: "Device" }, { label: "Source" }, { label: "Landing → exit" }, { label: "Pages", right: true }, { label: "Engaged", right: true }, { label: "Result" }]}
          rows={rows.map((r) => [
            new Date(r.started_at as Date).toISOString().replace("T", " ").slice(0, 16),
            <span key="v"><Link className="font-mono text-xs text-[#060297] underline" href={`/admin/intelligence/visitors/${r.session_id}`}>{String(r.visitor_id).slice(0, 8)}</Link> <Status tone={r.is_new_visitor ? "ok" : "off"}>{r.is_new_visitor ? "new" : `visit #${r.visit_number}`}</Status></span>,
            [r.city, r.country].filter(Boolean).join(", ") || "Unknown", `${r.device} · ${r.browser ?? "?"}`,
            <span key="c">{chLabel(String(r.channel))}{r.utm_campaign ? ` · ${r.utm_campaign}` : ""}</span>,
            <span key="p" className="break-all">{String(r.landing_page).split("?")[0]} → {String(r.exit_page ?? "—")}</span>,
            Number(r.page_views), dur(Number(r.engaged_seconds)), r.converted ? <Status key="l" tone="warn">Lead</Status> : "—",
          ])} />
        <Pager total={total} page={page} pageSize={pageSize} base={filterQuery(f)} />
      </Section>
    </div>
  );
}
