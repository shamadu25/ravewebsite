/** Tiny inline trend. Renders nothing unless there are at least two real points. */
export default function Sparkline({ points, className = "", label }: { points: Array<number | null>; className?: string; label?: string }) {
  const v = points.filter((p): p is number => p != null);
  if (v.length < 2 || v.every((x) => x === 0)) return null; // nothing to show until there is real movement
  const w = 80, h = 28, min = Math.min(...v), max = Math.max(...v), span = max - min || 1;
  const xy = v.map((p, i) => [(i / (v.length - 1)) * w, h - 3 - ((p - min) / span) * (h - 6)] as const);
  const d = xy.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className={`h-7 w-20 ${className}`} role="img" aria-label={label ?? "Trend"} preserveAspectRatio="none">
      <path d={d} fill="none" stroke="var(--primary-bright)" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" pathLength={1} className="os-draw" style={{ ["--len" as string]: 1 }} />
    </svg>
  );
}
