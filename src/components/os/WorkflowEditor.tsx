"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export default function WorkflowEditor({ sample, agentKeys }: { sample: string; agentKeys: string[] }) {
  const router = useRouter();
  const [, start] = useTransition();
  const [text, setText] = useState(sample);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function save() {
    let body: unknown;
    try { body = JSON.parse(text); } catch (e) { setMsg({ ok: false, text: `Invalid JSON: ${(e as Error).message}` }); return; }
    setBusy(true); setMsg(null);
    try {
      const res = await fetch("/api/os/workflows", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const j = await res.json().catch(() => null);
      if (!res.ok || j?.ok === false) setMsg({ ok: false, text: j?.error ?? `Failed (${res.status}).` });
      else { setMsg({ ok: true, text: "Workflow saved." }); start(() => router.refresh()); }
    } catch { setMsg({ ok: false, text: "Network error — nothing was saved." }); } finally { setBusy(false); }
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-gray-500">Node types: AGENT, CONDITION, DELAY, APPROVAL, NOTIFICATION, HTTP, CRM_STAGE, HUMAN_HANDOFF, END. Agents: {agentKeys.slice(0, 12).join(", ")}…</p>
      <textarea value={text} onChange={(e) => setText(e.target.value)} rows={18} spellCheck={false} className="w-full rounded-lg border border-gray-300 p-3 font-mono text-xs" />
      <div className="flex items-center gap-3">
        <button onClick={save} disabled={busy} className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">{busy ? "Validating…" : "Validate & save"}</button>
        {msg && <span className={msg.ok ? "text-xs text-emerald-700" : "text-xs text-red-700"}>{msg.text}</span>}
      </div>
    </div>
  );
}
