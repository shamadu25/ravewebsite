"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ActionButton, call, inputCls, primaryCls } from "./controls";

const STATUSES = ["NEW_LEAD", "ASSESSMENT_COMPLETED", "AI_ANALYSIS_COMPLETED", "QUALIFIED", "PROPOSAL_GENERATED", "AWAITING_APPROVAL", "PROPOSAL_SENT", "NEGOTIATION", "ACCEPTED", "IMPLEMENTATION", "ACTIVE_CUSTOMER", "COMPLETED", "LOST"];

export default function LeadActions({ leadId, status, assignedTo, nextActionAt, nextActionNote, followupsStopped, optedOut, canErase }: { leadId: number; status: string; assignedTo: string | null; nextActionAt: string | null; nextActionNote: string | null; followupsStopped: boolean; optedOut: boolean; canErase: boolean }) {
  const router = useRouter();
  const url = `/api/ai-automation/admin/leads/${leadId}`;
  const [st, setSt] = useState(status);
  const [lost, setLost] = useState("");
  const [who, setWho] = useState(assignedTo ?? "");
  const [note, setNote] = useState("");
  const [when, setWhen] = useState(nextActionAt ? nextActionAt.slice(0, 10) : "");
  const [what, setWhat] = useState(nextActionNote ?? "");
  const [msg, setMsg] = useState<string | null>(null);
  async function run(body: unknown, after?: () => void) {
    const r = await call(url, "POST", body);
    setMsg(r.ok ? "Saved." : r.text);
    if (r.ok) { after?.(); router.refresh(); }
  }
  const row = "flex flex-wrap items-end gap-2";
  return (
    <div className="space-y-5 text-sm">
      <div className={row}>
        <label className="min-w-[180px] flex-1"><span className="mb-1 block text-xs font-medium text-gray-600">Pipeline status</span><select value={st} onChange={(e) => setSt(e.target.value)} className={inputCls}>{STATUSES.map((s) => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}</select></label>
        {st === "LOST" && <label className="min-w-[200px] flex-1"><span className="mb-1 block text-xs font-medium text-gray-600">Lost reason (required)</span><input value={lost} onChange={(e) => setLost(e.target.value)} className={inputCls} /></label>}
        <button className={primaryCls} onClick={() => run({ action: "status", status: st, lostReason: lost || undefined })}>Update status</button>
      </div>
      <div className={row}>
        <label className="min-w-[180px] flex-1"><span className="mb-1 block text-xs font-medium text-gray-600">Assigned sales representative</span><input value={who} onChange={(e) => setWho(e.target.value)} placeholder="Name or email" className={inputCls} /></label>
        <button className={primaryCls} onClick={() => run({ action: "assign", assignee: who.trim() || null })}>Assign</button>
      </div>
      <div className={row}>
        <label><span className="mb-1 block text-xs font-medium text-gray-600">Next action date</span><input type="date" value={when} onChange={(e) => setWhen(e.target.value)} className={inputCls} /></label>
        <label className="min-w-[200px] flex-1"><span className="mb-1 block text-xs font-medium text-gray-600">Next action</span><input value={what} onChange={(e) => setWhat(e.target.value)} className={inputCls} /></label>
        <button className={primaryCls} onClick={() => run({ action: "next_action", at: when ? new Date(when).toISOString() : null, note: what.trim() || null })}>Save</button>
      </div>
      <div>
        <label className="block"><span className="mb-1 block text-xs font-medium text-gray-600">Internal note</span><textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} className={inputCls} /></label>
        <button className={`${primaryCls} mt-2`} disabled={!note.trim()} onClick={() => run({ action: "note", body: note }, () => setNote(""))}>Add note</button>
      </div>
      <div className="flex flex-wrap items-center gap-2 border-t border-gray-200 pt-4">
        <ActionButton label="Customer replied (stop follow-ups)" url={url} body={{ action: "customer_replied" }} />
        {followupsStopped && !optedOut ? <ActionButton label="Resume follow-ups" url={url} body={{ action: "resume_followups" }} /> : !followupsStopped && <ActionButton label="Stop follow-ups" url={url} body={{ action: "stop_followups" }} />}
        {optedOut && <span className="text-xs text-red-700">Customer opted out of emails.</span>}
        {canErase && <ActionButton label="Erase personal data" variant="danger" url={url} body={{ action: "anonymise", confirm: true }} confirm="Permanently remove this customer's personal data (name, email, phone, answers, notes, stored proposal PDFs)? This cannot be undone." />}
      </div>
      {msg && <p role="status" className="text-xs text-gray-600">{msg}</p>}
    </div>
  );
}
