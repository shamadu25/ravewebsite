"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export interface OutreachPreview { id: number; to: string | null; subject: string | null; body: string; touch: number; purpose: string; channel: string }

/** Review, optionally edit, then approve & send. Edits are saved to the message first, so what you approve is exactly what is sent. */
export default function OutreachApproval({ approvalId, msg }: { approvalId: number; msg: OutreachPreview }) {
  const router = useRouter();
  const [, start] = useTransition();
  const [subject, setSubject] = useState(msg.subject ?? "");
  const [body, setBody] = useState(msg.body);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [out, setOut] = useState<{ ok: boolean; text: string } | null>(null);
  const dirty = subject !== (msg.subject ?? "") || body !== msg.body;

  async function decide(decision: "APPROVE" | "REJECT") {
    setBusy(true); setOut(null);
    try {
      if (decision === "APPROVE" && dirty) {
        const e = await fetch(`/api/os/outreach/${msg.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ subject, body }) });
        const ej = await e.json().catch(() => null);
        if (!e.ok || ej?.ok === false) { setOut({ ok: false, text: ej?.error ?? "Could not save your edits — nothing was sent." }); return; }
      }
      const res = await fetch(`/api/os/approvals/${approvalId}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ decision, note: note || (dirty ? "Approved with edits" : undefined) }) });
      const j = await res.json().catch(() => null);
      if (!res.ok || j?.ok === false) { setOut({ ok: false, text: j?.error ?? `Failed (${res.status}).` }); return; }
      const ex = j.data?.executionResult;
      if (decision === "REJECT") setOut({ ok: true, text: "Rejected. Nothing was sent." });
      else if (ex && ex.ok === false) setOut({ ok: false, text: `Approved, but the email was NOT sent: ${ex.error ?? ex.reason}` });
      else setOut({ ok: true, text: "Approved and sent." });
      start(() => router.refresh());
    } catch { setOut({ ok: false, text: "Network error — nothing was sent." }); } finally { setBusy(false); }
  }

  const field = "w-full rounded-[10px] border border-[var(--border)] bg-white px-3 py-2 text-[14px] focus:border-[var(--primary-bright)] focus:outline-none";
  return (
    <div className="mt-4 space-y-3">
      <p className="text-[12px] text-[var(--muted)]">{msg.channel} · {msg.purpose === "PROPOSAL" ? "Proposal" : `Touch ${msg.touch}`} · To <b className="text-[var(--foreground)]">{msg.to ?? "no address"}</b></p>
      <label className="block"><span className="mb-1 block text-[12px] font-medium text-[var(--muted)]">Subject</span><input value={subject} onChange={(e) => setSubject(e.target.value)} className={field} /></label>
      <label className="block"><span className="mb-1 block text-[12px] font-medium text-[var(--muted)]">Message {dirty && <span className="text-[var(--primary)]">· edited</span>}</span><textarea value={body} onChange={(e) => setBody(e.target.value)} rows={Math.min(14, Math.max(6, body.split("\n").length + 1))} className={field} /></label>
      <p className="text-[11px] text-[var(--muted)]">A one-click unsubscribe link is added automatically when this is sent.</p>
      <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional note (kept in the audit record)" className={field} />
      <div className="flex flex-wrap items-center gap-2">
        <button disabled={busy || !msg.to} onClick={() => decide("APPROVE")} className="rounded-[10px] bg-[var(--primary)] px-4 py-2 text-[13px] font-medium text-white hover:bg-[var(--primary-hover)] disabled:opacity-50">{busy ? "Working…" : dirty ? "Save edits & send" : "Approve & send"}</button>
        <button disabled={busy} onClick={() => decide("REJECT")} className="rounded-[10px] border border-red-300 bg-white px-4 py-2 text-[13px] font-medium text-red-700 hover:bg-red-50 disabled:opacity-50">Reject</button>
        {!msg.to && <span className="text-[12px] text-red-700">No email address on this prospect — add one first.</span>}
        {out && <span role="status" className={out.ok ? "text-[12px] text-emerald-700" : "text-[12px] text-red-700"}>{out.text}</span>}
      </div>
    </div>
  );
}
