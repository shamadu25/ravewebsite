"use client";

import { useState } from "react";

interface TestRow { provider: string; tier: string; model: string; ok: boolean; latencyMs: number; costUsd: number; error: string | null }
interface CompareRow { provider: string; model: string; answered: number; errors: number; accuracy: number | null; avgLatencyMs: number | null; costPer1000: number | null; misses: Array<{ text: string; expected: string; got: string }> }

async function post<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const j = await res.json().catch(() => null);
  if (!res.ok || !j?.ok) throw new Error(j?.error ?? `Request failed (${res.status})`);
  return j.data as T;
}

export default function ModelLab({ configured }: { configured: boolean }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [test, setTest] = useState<TestRow[] | null>(null);
  const [cmp, setCmp] = useState<{ tier: string; size: number; results: CompareRow[] } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run(kind: string, fn: () => Promise<void>) {
    setBusy(kind); setError(null);
    try { await fn(); } catch (e) { setError(e instanceof Error ? e.message : "Failed"); } finally { setBusy(null); }
  }
  const btn = "rounded-[10px] px-4 py-2 text-[13px] font-medium disabled:opacity-50";
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        <button disabled={!configured || !!busy} onClick={() => run("test", async () => setTest((await post<{ rows: TestRow[] }>("/api/os/llm/test", {})).rows))} className={`${btn} bg-[var(--primary)] text-white`}>{busy === "test" ? "Testing…" : "Test every model"}</button>
        {(["fast", "standard"] as const).map((t) => <button key={t} disabled={!configured || !!busy} onClick={() => run(t, async () => setCmp(await post("/api/os/llm/compare", { tier: t })))} className={`${btn} border border-[var(--border)] bg-white`}>{busy === t ? "Comparing…" : `Compare on reply understanding (${t})`}</button>)}
      </div>
      {error && <p role="alert" className="text-[13px] text-[var(--danger)]">{error}</p>}
      {test && (
        <div className="os-card overflow-x-auto"><table className="w-full text-[13px]">
          <thead><tr className="border-b border-[var(--border)] text-left text-[12px] text-[var(--muted)]">{["Provider", "Tier", "Model", "Result", "Latency", "Cost"].map((h) => <th key={h} className="px-4 py-2 font-medium">{h}</th>)}</tr></thead>
          <tbody>{test.map((r) => <tr key={r.provider + r.tier} className="border-b border-[var(--border)]/60 last:border-0"><td className="px-4 py-2">{r.provider}</td><td className="px-4 py-2">{r.tier}</td><td className="px-4 py-2 font-mono text-[12px]">{r.model}</td><td className="px-4 py-2">{r.ok ? <span className="text-emerald-700">✓ works</span> : <span className="text-red-700">✗ {r.error ?? "unexpected answer"}</span>}</td><td className="px-4 py-2">{r.ok ? `${r.latencyMs} ms` : "—"}</td><td className="px-4 py-2">{r.ok ? `$${r.costUsd.toFixed(5)}` : "—"}</td></tr>)}</tbody>
        </table></div>
      )}
      {cmp && (
        <div className="space-y-3">
          <p className="text-[13px] text-[var(--muted)]">Reply understanding, {cmp.size} labelled replies, <b>{cmp.tier}</b> tier. Pick the cheapest model whose accuracy you are happy with.</p>
          <div className="os-card overflow-x-auto"><table className="w-full text-[13px]">
            <thead><tr className="border-b border-[var(--border)] text-left text-[12px] text-[var(--muted)]">{["Provider", "Model", "Accuracy", "Avg latency", "Cost / 1,000 replies", "Errors"].map((h) => <th key={h} className="px-4 py-2 font-medium">{h}</th>)}</tr></thead>
            <tbody>{cmp.results.map((r) => <tr key={r.provider} className="border-b border-[var(--border)]/60 last:border-0"><td className="px-4 py-2 font-medium">{r.provider}</td><td className="px-4 py-2 font-mono text-[12px]">{r.model}</td><td className="px-4 py-2 font-semibold">{r.accuracy == null ? "—" : `${Math.round(r.accuracy * 100)}%`}</td><td className="px-4 py-2">{r.avgLatencyMs == null ? "—" : `${r.avgLatencyMs} ms`}</td><td className="px-4 py-2">{r.costPer1000 == null ? "—" : `$${r.costPer1000.toFixed(3)}`}</td><td className="px-4 py-2">{r.errors}</td></tr>)}</tbody>
          </table></div>
          {cmp.results.filter((r) => r.misses.length).map((r) => <details key={r.provider} className="os-card p-4 text-[13px]"><summary className="cursor-pointer font-medium">{r.provider}: {r.misses.length} wrong answer(s)</summary><ul className="mt-2 space-y-1 text-[12px] text-[var(--muted)]">{r.misses.map((m, i) => <li key={i}>“{m.text}” — expected <b>{m.expected}</b>, got <b>{m.got}</b></li>)}</ul></details>)}
        </div>
      )}
    </div>
  );
}
