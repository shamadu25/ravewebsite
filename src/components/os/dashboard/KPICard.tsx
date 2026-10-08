import Sparkline from "./Sparkline";

interface Props {
  label: string;
  value: string;
  /** Percent change as a fraction (0.082 = +8.2%); null/undefined → explain why there is no trend. */
  change?: number | null;
  noTrendReason?: string;
  footnote?: string;
  progress?: number;
  spark?: Array<number | null>;
}

export default function KPICard({ label, value, change, noTrendReason, footnote, progress, spark }: Props) {
  const up = (change ?? 0) >= 0;
  return (
    <div className="os-card os-card-hover p-5">
      <p className="text-[13px] text-[var(--muted)]">{label}</p>
      <div className="mt-2 flex items-end justify-between gap-3">
        <p className="text-[32px] font-semibold leading-none tracking-tight tabular-nums">{value}</p>
        {spark && <Sparkline points={spark} label={`${label} trend`} />}
      </div>
      <div className="mt-3 min-h-[18px] text-[12px]">
        {change != null ? (
          <span className={up ? "text-[var(--success)]" : "text-[var(--danger)]"}><span aria-hidden>{up ? "↑" : "↓"}</span> {Math.abs(change * 100).toFixed(1)}%<span className="sr-only">{up ? " increase" : " decrease"}</span> <span className="text-[var(--muted)]">vs 30 days ago</span></span>
        ) : (
          <span className="text-[var(--muted)]">{noTrendReason ?? "No trend yet"}</span>
        )}
      </div>
      {progress != null && (
        <div className="mt-3" aria-label={`${(progress * 100).toFixed(1)}% of target`}>
          <div className="h-1.5 overflow-hidden rounded-full bg-[var(--primary-soft)]"><div className="h-full rounded-full bg-[var(--primary)] transition-[width] duration-500" style={{ width: `${Math.max(progress > 0 ? 2 : 0, Math.min(100, progress * 100))}%` }} /></div>
          {footnote && <p className="mt-1.5 text-[12px] text-[var(--muted)]">{footnote}</p>}
        </div>
      )}
      {progress == null && footnote && <p className="mt-1 text-[12px] text-[var(--muted)]">{footnote}</p>}
    </div>
  );
}
