import { loadIntel } from "@/components/analytics/load";
import { FilterBar, NoAccess, PageTitle, Section } from "@/components/analytics/kit";
import { REPORTS } from "@/lib/analytics/reports";
import { filterQuery } from "@/lib/analytics/filters";
import { can } from "@/lib/os/rbac";

export default async function ReportsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const ctx = await loadIntel(searchParams);
  if (!ctx) return <NoAccess />;
  const { f, caller } = ctx;
  const allowed = can(caller.role, "report.export");
  return (
    <div>
      <PageTitle title="Reports & Exports" subtitle="Set the period and filters first, then download. Exports are CSV (UTF-8) which Excel opens directly. Lead exports contain ids and marketing fields only — no names, emails or phone numbers. Every export is written to the audit log." />
      <FilterBar f={f} />
      <Section title="Available reports">
        {!allowed && <p className="mb-3 text-sm text-red-700">Your role cannot export data.</p>}
        <ul className="grid gap-3 sm:grid-cols-2">
          {REPORTS.map((r) => (
            <li key={r.id} className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 p-4">
              <span className="text-sm font-medium text-gray-900">{r.label}</span>
              {allowed ? <a className="rounded-lg bg-[#060297] px-3 py-1.5 text-xs font-semibold text-white" href={`/api/intel/export?${filterQuery(f, { report: r.id })}`}>Download CSV</a> : <span className="text-xs text-gray-400">Not permitted</span>}
            </li>))}
        </ul>
        <p className="mt-4 text-xs text-gray-500">Native .xlsx files are not generated (no spreadsheet library is installed, by design). In the “visitors” column of traffic reports, values are the sum of daily unique visitors, so a returning visitor counts once per day.</p>
      </Section>
    </div>
  );
}
