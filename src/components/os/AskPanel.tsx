"use client";

import { useState } from "react";
import ApiButton from "./ApiButton";

interface Turn {
  q: string;
  a?: string;
  grounded?: string;
  error?: string;
  pending?: { approvalId: number; description: string };
}

const SUGGESTIONS = [
  "What is preventing us from reaching $500K?",
  "Find our biggest revenue opportunity.",
  "Show me every customer at risk.",
  "What is the highest-value action today?",
  "Pause all outbound campaigns.",
];

export default function AskPanel() {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  async function ask(q: string) {
    if (!q.trim() || busy) return;
    setBusy(true);
    setText("");
    const idx = turns.length;
    setTurns((t) => [...t, { q }]);
    try {
      const res = await fetch("/api/os/ask", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ question: q }) });
      const json = await res.json().catch(() => null);
      setTurns((t) => t.map((x, i) => (i === idx ? (res.ok && json?.ok ? { q, a: json.data.answer, grounded: json.data.grounded, pending: json.data.pendingConfirmation } : { q, error: json?.error ?? `Failed (${res.status}).` }) : x)));
    } catch {
      setTurns((t) => t.map((x, i) => (i === idx ? { q, error: "Network error." } : x)));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {SUGGESTIONS.map((s) => (
          <button key={s} onClick={() => ask(s)} className="rounded-full border border-gray-300 bg-white px-3 py-1 text-xs text-gray-700 hover:bg-gray-50">{s}</button>
        ))}
      </div>
      <div className="space-y-4">
        {turns.map((t, i) => (
          <div key={i} className="rounded-2xl border border-gray-200 bg-white p-4">
            <p className="text-sm font-medium text-gray-900">{t.q}</p>
            {t.a && <p className="mt-2 whitespace-pre-wrap text-sm text-gray-700">{t.a}</p>}
            {t.grounded && <p className="mt-2 text-[11px] uppercase tracking-wide text-gray-400">{t.grounded === "llm" ? "Model analysis over live data" : "Deterministic data readout"}</p>}
            {t.error && <p className="mt-2 text-sm text-red-700">{t.error}</p>}
            {t.pending && (
              <div className="mt-3 flex flex-wrap gap-2">
                <ApiButton label="Confirm" variant="primary" url={`/api/os/approvals/${t.pending.approvalId}`} body={{ decision: "APPROVE", note: "Confirmed from Ask RaveSoft AI" }} result="execution" />
                <ApiButton label="Cancel" url={`/api/os/approvals/${t.pending.approvalId}`} body={{ decision: "REJECT", note: "Cancelled from chat" }} />
              </div>
            )}
          </div>
        ))}
      </div>
      <form onSubmit={(e) => { e.preventDefault(); ask(text); }} className="flex gap-2">
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Ask about revenue, risks, opportunities — or give a command" className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm" />
        <button disabled={busy} className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">{busy ? "Thinking…" : "Ask"}</button>
      </form>
    </div>
  );
}
