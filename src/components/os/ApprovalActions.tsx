"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type Decision = "APPROVE" | "REJECT" | "REQUEST_INFO";

export default function ApprovalActions({ id }: { id: number }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function decide(decision: Decision) {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/os/approvals/${id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ decision, note: note || undefined }) });
      const json = await res.json().catch(() => null);
      if (!res.ok || json?.ok === false) { setMsg({ ok: false, text: json?.error ?? `Failed (${res.status}).` }); return; }
      const exec = json.data?.executionResult;
      if (exec && exec.ok === false) setMsg({ ok: false, text: `Approved, but execution failed: ${exec.error ?? exec.reason ?? "unknown error"}` });
      else setMsg({ ok: true, text: decision === "APPROVE" ? (exec ? "Approved and executed." : "Approved.") : "Recorded." });
      startTransition(() => router.refresh());
    } catch {
      setMsg({ ok: false, text: "Network error — no decision was recorded." });
    } finally {
      setBusy(false);
    }
  }

  const b = "rounded-lg px-3 py-1.5 text-xs font-medium disabled:opacity-50";
  return (
    <div className="mt-4 space-y-2">
      <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional note (kept in the audit record)" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
      <div className="flex flex-wrap items-center gap-2">
        <button disabled={busy} onClick={() => decide("APPROVE")} className={`${b} bg-gray-900 text-white hover:bg-gray-700`}>Approve</button>
        <button disabled={busy} onClick={() => decide("REJECT")} className={`${b} border border-red-300 text-red-700 hover:bg-red-50`}>Reject</button>
        <button disabled={busy} onClick={() => decide("REQUEST_INFO")} className={`${b} border border-gray-300 text-gray-700 hover:bg-gray-50`}>Request info</button>
        {msg && <span className={msg.ok ? "text-xs text-emerald-700" : "text-xs text-red-700"}>{msg.text}</span>}
      </div>
    </div>
  );
}
