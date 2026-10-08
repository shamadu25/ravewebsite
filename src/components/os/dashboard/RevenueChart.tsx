import type { ArrPoint } from "@/lib/os/dashboard-data";

const W = 640, H = 230, L = 44, R = 12, T = 12, B = 28;
const k = (n: number) => (n === 0 ? "0" : n >= 1_000_000 ? `${n / 1_000_000}M` : `${Math.round(n / 1000)}K`);

/** Actual ARR by month (area), target (dashed) and, only when growth is measurable, a projected trajectory. */
export default function RevenueChart({ series, targetUsd, monthlyGrowth, currentMonth }: { series: ArrPoint[]; targetUsd: number; monthlyGrowth: number | null; currentMonth: number }) {
  const step = Math.max(50_000, Math.ceil((targetUsd * 1.2) / 3 / 50_000) * 50_000);
  const yMax = step * 3;
  const x = (i: number) => L + (i / 11) * (W - L - R);
  const y = (v: number) => T + (1 - Math.min(v, yMax) / yMax) * (H - T - B);
  const actual = series.filter((p) => p.arrUsd != null) as Array<ArrPoint & { arrUsd: number }>;
  const line = actual.map((p, i) => `${i ? "L" : "M"}${x(p.month).toFixed(1)},${y(p.arrUsd).toFixed(1)}`).join(" ");
  const area = actual.length ? `${line} L${x(actual[actual.length - 1].month).toFixed(1)},${y(0)} L${x(actual[0].month).toFixed(1)},${y(0)} Z` : "";
  const last = actual[actual.length - 1];
  let proj = "";
  if (last && last.arrUsd > 0 && monthlyGrowth != null && monthlyGrowth > 0) {
    let v = last.arrUsd; proj = `M${x(last.month).toFixed(1)},${y(v).toFixed(1)}`;
    for (let m = last.month + 1; m <= 11; m++) { v *= 1 + monthlyGrowth; proj += ` L${x(m).toFixed(1)},${y(v).toFixed(1)}`; }
  }
  const summary = last ? `ARR is $${Math.round(last.arrUsd).toLocaleString()} against a $${targetUsd.toLocaleString()} target.` : "No revenue recorded yet.";
  return (
    <figure className="w-full">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={`Revenue chart. ${summary}`}>
        {[0, 1, 2, 3].map((i) => (
          <g key={i}><text x={L - 8} y={y(i * step) + 4} textAnchor="end" className="fill-[var(--muted)]" fontSize="11">{k(i * step)}</text>{i > 0 && <line x1={L} x2={W - R} y1={y(i * step)} y2={y(i * step)} stroke="var(--border)" strokeWidth="0.75" opacity="0.6" />}</g>
        ))}
        {series.map((p) => <text key={p.month} x={x(p.month)} y={H - 8} textAnchor="middle" fontSize="11" className={p.month === currentMonth ? "fill-[var(--foreground)]" : "fill-[var(--muted)]"}>{p.label}</text>)}
        <line x1={L} x2={W - R} y1={y(targetUsd)} y2={y(targetUsd)} stroke="var(--primary)" strokeDasharray="5 4" strokeWidth="1.25" />
        <text x={W - R} y={y(targetUsd) - 6} textAnchor="end" fontSize="11" className="fill-[var(--primary)]">Target {k(targetUsd)}</text>
        {area && <path d={area} fill="var(--primary-soft)" opacity="0.7" />}
        {line && <path d={line} fill="none" stroke="var(--primary)" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" pathLength={1} className="os-draw" style={{ ["--len" as string]: 1 }} />}
        {proj && <path d={proj} fill="none" stroke="var(--primary-bright)" strokeDasharray="2 4" strokeWidth="1.75" strokeLinecap="round" />}
        {last && <circle cx={x(last.month)} cy={y(last.arrUsd)} r="4" fill="var(--primary)" stroke="white" strokeWidth="2" />}
      </svg>
      <figcaption className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-[var(--muted)]">
        <span><span aria-hidden className="mr-1 inline-block h-0.5 w-4 bg-[var(--primary)] align-middle" />Actual ARR</span>
        <span><span aria-hidden className="mr-1 inline-block w-4 border-t border-dashed border-[var(--primary)] align-middle" />Target</span>
        <span>{proj ? "Dotted: projected at current growth" : "Projection needs 30 days of recurring revenue history"}</span>
      </figcaption>
    </figure>
  );
}
