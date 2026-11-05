"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

async function call(url: string, method: string, body?: unknown): Promise<{ ok: boolean; text: string; data?: unknown }> {
  try {
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
    const json = await res.json().catch(() => null);
    if (!res.ok || json?.ok === false) {
      const issues = json?.issues ? ` ${JSON.stringify(json.issues).slice(0, 400)}` : "";
      return { ok: false, text: `${json?.error ?? `Request failed (${res.status}).`}${issues}` };
    }
    return { ok: true, text: "Done.", data: json?.data };
  } catch { return { ok: false, text: "Network error — nothing was saved." }; }
}

const btn = "rounded-lg px-3.5 py-2 text-sm font-medium disabled:opacity-50";
const primary = `${btn} bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)]`;
const secondary = `${btn} border border-gray-300 bg-white text-gray-800 hover:bg-gray-50`;
const danger = `${btn} border border-red-300 bg-white text-red-700 hover:bg-red-50`;
export const inputCls = "w-full rounded-[10px] border border-[var(--border)] bg-white px-3 py-2 text-[14px] focus:border-[var(--primary-bright)] focus:outline-none";

/** POST/PUT/DELETE a JSON body, show the server's real answer, refresh the page. */
export function ActionButton({ label, url, method = "POST", body, confirm, variant = "secondary" }: { label: string; url: string; method?: "POST" | "PUT" | "DELETE"; body?: unknown; confirm?: string; variant?: "primary" | "secondary" | "danger" }) {
  const router = useRouter();
  const [, start] = useTransition();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  async function go() {
    if (confirm && !window.confirm(confirm)) return;
    setBusy(true); setMsg(null);
    const r = await call(url, method, body);
    setMsg(r); setBusy(false);
    if (r.ok) start(() => router.refresh());
  }
  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <button type="button" onClick={go} disabled={busy} className={variant === "primary" ? primary : variant === "danger" ? danger : secondary}>{busy ? "Working…" : label}</button>
      {msg && <span role="status" className={msg.ok ? "text-xs text-emerald-700" : "text-xs text-red-700"}>{msg.text}</span>}
    </span>
  );
}

/** Edit any JSON document with server-side schema validation (the server is the validator; errors are shown verbatim). */
export function JsonEditor({ url, method = "PUT", initial, label, rows = 12, wrapKey, field, submitLabel = "Save" }: { url: string; method?: "POST" | "PUT"; initial: unknown; label?: string; rows?: number; wrapKey?: string; field?: string; submitLabel?: string }) {
  const router = useRouter();
  const [, start] = useTransition();
  const [text, setText] = useState(JSON.stringify(initial, null, 2));
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  async function save() {
    let parsed: unknown;
    try { parsed = JSON.parse(text); } catch (e) { setMsg({ ok: false, text: `Not valid JSON: ${(e as Error).message}` }); return; }
    setBusy(true); setMsg(null);
    const r = await call(url, method, wrapKey ? { key: wrapKey, value: parsed } : field ? { [field]: parsed } : parsed);
    setMsg(r.ok ? { ok: true, text: "Saved." } : r); setBusy(false);
    if (r.ok) start(() => router.refresh());
  }
  return (
    <div>
      {label && <label className="mb-1 block text-xs font-medium text-gray-600">{label}</label>}
      <textarea value={text} onChange={(e) => setText(e.target.value)} rows={rows} spellCheck={false} className={`${inputCls} font-mono text-[12px] leading-relaxed`} aria-label={label ?? "JSON"} />
      <div className="mt-2 flex flex-wrap items-center gap-3"><button type="button" onClick={save} disabled={busy} className={primary}>{busy ? "Saving…" : submitLabel}</button>{msg && <span role="status" className={msg.ok ? "text-xs text-emerald-700" : "text-xs text-red-700 break-all"}>{msg.text}</span>}</div>
    </div>
  );
}

export { call, primary as primaryCls, secondary as secondaryCls };
