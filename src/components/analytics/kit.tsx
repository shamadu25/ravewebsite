import Link from "next/link";
import { cn } from "@/lib/utils";
import { CHANNEL_LABEL } from "@/lib/analytics/classify";
import { PRESETS, PRESET_LABEL } from "@/lib/analytics/ranges";
import { filterQuery, type Filters } from "@/lib/analytics/filters";

/* RaveSoft Intelligence UI kit — brand: Deep Blue #060297, Amber #FFB200 (amber only for the single most important highlight per view). */
export const BLUE = "#060297";
export const AMBER = "#FFB200";

export const fmt = (n: number) => n.toLocaleString("en-US");
export const dur = (s: number) => (s >= 3600 ? `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m` : `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, "0")}`);
export const pct = (n: number) => `${n}%`;
export const chLabel = (k: string | null | undefined) => (k ? CHANNEL_LABEL[k] ?? k : "—");

export function Section({ title, subtitle, children, actions, className }: { title: string; subtitle?: string; children: React.ReactNode; actions?: React.ReactNode; className?: string }) {
  return (
    <section className={cn("rounded-2xl border border-gray-200 bg-white p-5 shadow-sm", className)}>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
        <div><h2 className="text-[15px] font-semibold text-gray-900">{title}</h2>{subtitle && <p className="mt-0.5 max-w-2xl text-xs text-gray-500">{subtitle}</p>}</div>
        {actions}
      </div>
      {children}
    </section>
  );
}

export function Empty({ title = "No data for this period yet", hint }: { title?: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 px-4 py-8 text-center">
      <p className="text-sm font-medium text-gray-700">{title}</p>
      <p className="mx-auto mt-1 max-w-md text-xs text-gray-500">{hint ?? "Numbers appear here as soon as real visitors are recorded. Nothing on this page is sample data."}</p>
    </div>
  );
}

export function Delta({ cur, prev, inverse, suffix = "" }: { cur: number; prev: number; inverse?: boolean; suffix?: string }) {
  if (prev === 0) return <span className="text-xs text-gray-400">{cur === 0 ? "no change" : "new vs prev. period"}</span>;
  const ch = Math.round(((cur - prev) / prev) * 1000) / 10;
  const good = inverse ? ch < 0 : ch > 0;
  return (
    <span className={cn("inline-flex items-center gap-1 text-xs font-medium", ch === 0 ? "text-gray-500" : good ? "text-emerald-700" : "text-red-700")}>
      <span aria-hidden>{ch > 0 ? "▲" : ch < 0 ? "▼" : "•"}</span>{Math.abs(ch)}%{suffix}
      <span className="sr-only">{ch > 0 ? " increase" : ch < 0 ? " decrease" : ""} versus previous period</span>
    </span>
  );
}

export function Kpi({ label, value, cur, prev, inverse, hint, accent }: { label: string; value: string; cur?: number; prev?: number; inverse?: boolean; hint?: string; accent?: boolean }) {
  return (
    <div className={cn("rounded-2xl border bg-white p-4 shadow-sm", accent ? "border-l-4 border-gray-200" : "border-gray-200")} style={accent ? { borderLeftColor: AMBER } : undefined}>
      <p className="text-xs font-medium text-gray-500">{label}</p>
      <p className="mt-1 text-[26px] font-semibold leading-tight tracking-tight tabular-nums" style={{ color: BLUE }}>{value}</p>
      <div className="mt-1 min-h-4">{cur !== undefined && prev !== undefined ? <Delta cur={cur} prev={prev} inverse={inverse} /> : hint && <span className="text-xs text-gray-400">{hint}</span>}</div>
    </div>
  );
}

export function KpiGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">{children}</div>;
}

export function BarList({ rows, valueLabel = (v: number) => fmt(v), emptyHint }: { rows: Array<{ label: string; value: number; sub?: string; href?: string }>; valueLabel?: (v: number) => string; emptyHint?: string }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  if (!rows.length) return <Empty hint={emptyHint} />;
  return (
    <ul className="space-y-2.5">
      {rows.map((r) => {
        const inner = (
          <>
            <div className="flex items-baseline justify-between gap-3 text-sm"><span className="truncate text-gray-800">{r.label}</span><span className="shrink-0 tabular-nums text-gray-600">{valueLabel(r.value)}{r.sub && <span className="ml-2 text-xs text-gray-400">{r.sub}</span>}</span></div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-gray-100" role="presentation"><div className="h-full rounded-full" style={{ width: `${Math.max(2, (r.value / max) * 100)}%`, background: BLUE }} /></div>
          </>
        );
        return <li key={r.label}>{r.href ? <Link href={r.href} className="block rounded-md hover:bg-gray-50">{inner}</Link> : inner}</li>;
      })}
    </ul>
  );
}

export interface Series { key: string; label: string; color: string; values: number[] }
export function LineChart({ days, series, height = 200 }: { days: string[]; series: Series[]; height?: number }) {
  const W = 720, H = height, P = { l: 36, r: 12, t: 12, b: 24 };
  const max = Math.max(1, ...series.flatMap((s) => s.values));
  const nice = Math.max(1, Math.ceil(max / 4) * 4);
  const x = (i: number) => P.l + (days.length <= 1 ? 0 : (i / (days.length - 1)) * (W - P.l - P.r));
  const y = (v: number) => P.t + (1 - v / nice) * (H - P.t - P.b);
  const total = series.map((s) => `${s.label}: ${fmt(s.values.reduce((a, b) => a + b, 0))}`).join(", ");
  return (
    <figure>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={`Trend chart. ${total}`}>
        {[0, 1, 2, 3, 4].map((t) => { const v = (nice / 4) * t; return <g key={t}><line x1={P.l} x2={W - P.r} y1={y(v)} y2={y(v)} stroke="#e5e7eb" strokeWidth="1" /><text x={P.l - 6} y={y(v) + 3} textAnchor="end" fontSize="10" fill="#6b7280">{fmt(Math.round(v))}</text></g>; })}
        {series.map((s) => {
          const pts = s.values.map((v, i) => `${x(i)},${y(v)}`).join(" ");
          return <g key={s.key}>
            <polygon points={`${x(0)},${y(0)} ${pts} ${x(days.length - 1)},${y(0)}`} fill={s.color} opacity="0.07" />
            <polyline points={pts} fill="none" stroke={s.color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
            {days.length <= 45 && s.values.map((v, i) => <circle key={i} cx={x(i)} cy={y(v)} r="2.2" fill={s.color}><title>{`${days[i]} — ${s.label}: ${fmt(v)}`}</title></circle>)}
          </g>;
        })}
        {[0, Math.floor((days.length - 1) / 2), days.length - 1].filter((i, k, a) => a.indexOf(i) === k && days[i]).map((i) => <text key={i} x={x(i)} y={H - 6} textAnchor={i === 0 ? "start" : i === days.length - 1 ? "end" : "middle"} fontSize="10" fill="#6b7280">{days[i].slice(5)}</text>)}
      </svg>
      <figcaption className="mt-2 flex flex-wrap gap-4 text-xs text-gray-600">{series.map((s) => <span key={s.key} className="inline-flex items-center gap-1.5"><span className="inline-block h-2 w-2 rounded-full" style={{ background: s.color }} />{s.label}</span>)}</figcaption>
    </figure>
  );
}

export function Table({ head, rows, empty }: { head: Array<{ label: string; right?: boolean }>; rows: React.ReactNode[][]; empty?: string }) {
  if (!rows.length) return <Empty hint={empty} />;
  return (
    <div className="-mx-1 overflow-x-auto">
      <table className="w-full min-w-[560px] text-left text-sm">
        <thead><tr className="border-b border-gray-200 text-xs text-gray-500">{head.map((h) => <th key={h.label} scope="col" className={cn("px-2 py-2 font-medium", h.right && "text-right")}>{h.label}</th>)}</tr></thead>
        <tbody>{rows.map((r, i) => <tr key={i} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">{r.map((c, j) => <td key={j} className={cn("px-2 py-2 align-top text-gray-800", head[j]?.right && "text-right tabular-nums")}>{c}</td>)}</tr>)}</tbody>
      </table>
    </div>
  );
}

export function Pager({ total, page, pageSize, base }: { total: number; page: number; pageSize: number; base: string }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1) return <p className="mt-3 text-xs text-gray-500">{fmt(total)} total</p>;
  const link = (p: number) => `?${base}&page=${p}`;
  return (
    <nav className="mt-3 flex items-center justify-between text-xs text-gray-600" aria-label="Pagination">
      <span>Page {page} of {pages} · {fmt(total)} total</span>
      <span className="flex gap-2">
        {page > 1 && <Link className="rounded-md border border-gray-200 px-2.5 py-1 hover:bg-gray-50" href={link(page - 1)}>Previous</Link>}
        {page < pages && <Link className="rounded-md border border-gray-200 px-2.5 py-1 hover:bg-gray-50" href={link(page + 1)}>Next</Link>}
      </span>
    </nav>
  );
}

export function Status({ children, tone }: { children: React.ReactNode; tone: "ok" | "warn" | "off" | "bad" }) {
  const c = { ok: "bg-emerald-50 text-emerald-700", warn: "bg-amber-50 text-amber-800", off: "bg-gray-100 text-gray-600", bad: "bg-red-50 text-red-700" }[tone];
  return <span className={cn("inline-block rounded-full px-2 py-0.5 text-[11px] font-medium", c)}>{children}</span>;
}

/** Server-rendered GET form: works without client JS and keeps every filter in the URL (shareable, exportable). */
export function FilterBar({ f, show = ["country", "channel", "device", "campaign"] }: { f: Filters; show?: Array<"country" | "channel" | "device" | "campaign"> }) {
  const input = "h-9 rounded-lg border border-gray-300 bg-white px-2.5 text-sm text-gray-900 focus:border-[#060297] focus:outline-none";
  return (
    <form method="get" className="mb-6 flex flex-wrap items-end gap-3 rounded-2xl border border-gray-200 bg-white p-3 shadow-sm">
      <label className="text-xs text-gray-500">Period
        <select name="range" defaultValue={f.preset} className={cn(input, "mt-1 block")}>{PRESETS.map((p) => <option key={p} value={p}>{PRESET_LABEL[p]}</option>)}</select>
      </label>
      <label className="text-xs text-gray-500">From<input type="date" name="from" defaultValue={f.preset === "custom" ? f.from.toISOString().slice(0, 10) : ""} className={cn(input, "mt-1 block")} /></label>
      <label className="text-xs text-gray-500">To<input type="date" name="to" defaultValue={f.preset === "custom" ? new Date(f.to.getTime() - 1).toISOString().slice(0, 10) : ""} className={cn(input, "mt-1 block")} /></label>
      {show.includes("country") && <label className="text-xs text-gray-500">Country (code)<input name="country" maxLength={2} placeholder="GH" defaultValue={f.country ?? ""} className={cn(input, "mt-1 block w-20 uppercase")} /></label>}
      {show.includes("channel") && <label className="text-xs text-gray-500">Source
        <select name="channel" defaultValue={f.channel ?? ""} className={cn(input, "mt-1 block")}><option value="">All sources</option>{Object.entries(CHANNEL_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
      </label>}
      {show.includes("device") && <label className="text-xs text-gray-500">Device
        <select name="device" defaultValue={f.device ?? ""} className={cn(input, "mt-1 block")}><option value="">All devices</option><option value="desktop">Desktop</option><option value="mobile">Mobile</option><option value="tablet">Tablet</option></select>
      </label>}
      {show.includes("campaign") && <label className="text-xs text-gray-500">Campaign<input name="campaign" placeholder="utm_campaign" defaultValue={f.campaign ?? ""} className={cn(input, "mt-1 block w-40")} /></label>}
      <button type="submit" className="h-9 rounded-lg px-4 text-sm font-semibold text-white" style={{ background: BLUE }}>Apply</button>
      <Link href="?" className="h-9 self-end py-2 text-sm text-gray-500 underline">Reset</Link>
      <p className="w-full text-xs text-gray-400">Showing {f.label} · compared with the previous {f.days} day{f.days === 1 ? "" : "s"} · times in UTC</p>
    </form>
  );
}

export function ExportLink({ report, f }: { report: string; f: Filters }) {
  return <a className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50" href={`/api/intel/export?${filterQuery(f, { report })}`}>Export CSV</a>;
}

export function PageTitle({ title, subtitle, children }: { title: string; subtitle?: string; children?: React.ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div><h1 className="text-2xl font-semibold tracking-tight" style={{ color: BLUE }}>{title}</h1>{subtitle && <p className="mt-1 max-w-3xl text-sm text-gray-500">{subtitle}</p>}</div>
      {children}
    </div>
  );
}

export function NoAccess() {
  return <div className="mx-auto max-w-lg rounded-2xl border border-gray-200 bg-white p-8 text-center"><h1 className="text-lg font-semibold text-gray-900">No access to RaveSoft Intelligence</h1><p className="mt-2 text-sm text-gray-500">Your role does not include analytics permissions. Ask a Super Admin to grant it.</p></div>;
}
