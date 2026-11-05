"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { chLabel, dur } from "./kit";

interface Row { sessionId: string; visitorId: string; country: string | null; countryCode: string | null; city: string | null; device: string; browser: string | null; os: string | null; currentPage: string | null; landingPage: string; channel: string; source: string | null; campaign: string | null; durationSeconds: number; engagedSeconds: number; pageViews: number; status: "active" | "idle"; converted: boolean }

const INTERVAL = 10_000;

/** Lightweight polling (one indexed query every 10 s, paused while the tab is hidden). No websockets or background workers needed. */
export default function LiveBoard({ initial }: { initial: { count: number; sessions: Row[] } }) {
  const [data, setData] = useState(initial);
  const [err, setErr] = useState(false);
  useEffect(() => {
    let stop = false, timer: ReturnType<typeof setTimeout>;
    const tick = async () => {
      if (!stop && document.visibilityState === "visible") {
        try {
          const r = await fetch("/api/intel/live", { cache: "no-store" });
          const j = await r.json();
          if (j.ok) { setData(j.data); setErr(false); } else setErr(true);
        } catch { setErr(true); }
      }
      if (!stop) timer = setTimeout(tick, INTERVAL);
    };
    timer = setTimeout(tick, INTERVAL);
    return () => { stop = true; clearTimeout(timer); };
  }, []);
  return (
    <div>
      <p className="mb-3 text-sm text-gray-600" aria-live="polite"><span className="font-semibold text-[#060297]">{data.count}</span> visitor{data.count === 1 ? "" : "s"} active in the last 5 minutes · refreshes every 10 s{err && <span className="ml-2 text-red-700">· connection problem, retrying</span>}</p>
      {data.sessions.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 px-4 py-8 text-center text-sm text-gray-600">No one is on the website right now.</div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead><tr className="border-b border-gray-200 text-xs text-gray-500">{["Visitor", "Location", "Device", "Current page", "Landing", "Source", "Time", "Engaged", "Pages", "Status"].map((h) => <th key={h} scope="col" className="px-3 py-2 font-medium">{h}</th>)}</tr></thead>
            <tbody>{data.sessions.map((s) => (
              <tr key={s.sessionId} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                <td className="px-3 py-2"><Link className="font-mono text-xs text-[#060297] underline" href={`/admin/intelligence/visitors/${s.sessionId}`}>{s.visitorId.slice(0, 8)}</Link></td>
                <td className="px-3 py-2">{[s.city, s.country].filter(Boolean).join(", ") || "Unknown"}</td>
                <td className="px-3 py-2">{s.device} · {s.browser ?? "?"} · {s.os ?? "?"}</td>
                <td className="max-w-[200px] truncate px-3 py-2" title={s.currentPage ?? ""}>{s.currentPage ?? "—"}</td>
                <td className="max-w-[160px] truncate px-3 py-2" title={s.landingPage}>{s.landingPage}</td>
                <td className="px-3 py-2">{chLabel(s.channel)}{s.source ? ` · ${s.source}` : ""}{s.campaign ? ` · ${s.campaign}` : ""}</td>
                <td className="px-3 py-2 tabular-nums">{dur(s.durationSeconds)}</td>
                <td className="px-3 py-2 tabular-nums">{dur(s.engagedSeconds)}</td>
                <td className="px-3 py-2 tabular-nums">{s.pageViews}</td>
                <td className="px-3 py-2"><span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${s.converted ? "bg-amber-100 text-amber-900" : s.status === "active" ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-600"}`}>{s.converted ? "Lead submitted" : s.status}</span></td>
              </tr>))}</tbody>
          </table>
        </div>
      )}
    </div>
  );
}
