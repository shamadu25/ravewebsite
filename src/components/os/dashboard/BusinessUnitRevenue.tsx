import { revenueSegments } from "@/lib/os/dashboard-data";

const usd = (n: number) => `$${Math.round(n).toLocaleString()}`;

export default async function BusinessUnitRevenue() {
  const rows = await revenueSegments();
  const total = rows.reduce((n, r) => n + r.arrUsd, 0);
  const max = Math.max(...rows.map((r) => r.arrUsd), 1);
  return (
    <section className="os-card p-6" aria-labelledby="bu-rev">
      <div className="mb-4 flex items-baseline justify-between"><h2 id="bu-rev" className="text-[18px] font-semibold tracking-tight">Revenue by Business Unit</h2><span className="text-[12px] text-[var(--muted)]">Annualised</span></div>
      <ul className="space-y-4">
        {rows.map((r) => (
          <li key={r.key}>
            <div className="mb-1.5 flex items-baseline justify-between text-[13px]"><span className="font-medium">{r.label}</span><span className="tabular-nums text-[var(--muted)]"><span className="font-medium text-[var(--foreground)]">{usd(r.arrUsd)}</span> · {Math.round(r.share * 100)}%</span></div>
            <div className="h-2 overflow-hidden rounded-full bg-[var(--background)]" role="img" aria-label={`${r.label}: ${usd(r.arrUsd)}, ${Math.round(r.share * 100)} percent of total`}>
              <div className="h-full rounded-full bg-[var(--primary-bright)] opacity-80 transition-[width] duration-500" style={{ width: `${r.arrUsd > 0 ? Math.max(3, (r.arrUsd / max) * 100) : 0}%` }} />
            </div>
          </li>
        ))}
      </ul>
      {total === 0 && <p className="mt-4 text-[12px] text-[var(--muted)]">No recurring revenue recorded for any business unit yet.</p>}
    </section>
  );
}
