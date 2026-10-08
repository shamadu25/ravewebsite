"use client";

import Link from "next/link";
import { useState } from "react";
import { X } from "lucide-react";

export interface CommanderInfo {
  state: "ACTIVE" | "PAUSED" | "NOT_SET_UP" | "ERROR";
  lastLoop: string | null;
  queued: number;
  running: number;
  waitingApproval: number;
  llm: string;
  outboundPaused: boolean;
  activeAgents: number;
}

const COPY: Record<CommanderInfo["state"], { label: string; dot: string; line: string }> = {
  ACTIVE: { label: "AI CEO is active", dot: "bg-[var(--success)]", line: "Monitoring systems, identifying opportunities and executing tasks." },
  PAUSED: { label: "AI CEO is paused", dot: "bg-[var(--warning)]", line: "No autonomous work is running. Activate the Commander to resume." },
  ERROR: { label: "AI CEO needs attention", dot: "bg-[var(--danger)]", line: "The Commander is in an error state." },
  NOT_SET_UP: { label: "AI CEO is not set up", dot: "bg-slate-400", line: "Set up your AI Employees to start." },
};

export default function AIStatus({ info, lastLoopLabel }: { info: CommanderInfo; lastLoopLabel: string }) {
  const [open, setOpen] = useState(false);
  const c = COPY[info.state];
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="os-card os-card-hover w-full px-4 py-3 text-left sm:w-72" aria-haspopup="dialog">
        <span className="flex items-center justify-between">
          <span className="flex items-center gap-2 text-[14px] font-medium"><span aria-hidden className={`h-2 w-2 rounded-full ${c.dot} ${info.state === "ACTIVE" ? "os-pulse" : ""}`} />{c.label}</span>
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide ${info.state === "ACTIVE" ? "bg-green-50 text-green-700" : "bg-slate-100 text-slate-600"}`}>{info.state === "NOT_SET_UP" ? "OFF" : info.state}</span>
        </span>
        <span className="mt-1 block text-[12px] leading-snug text-[var(--muted)]">{c.line}</span>
      </button>
      {open && (
        <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="AI Commander details">
          <button type="button" aria-label="Close" className="absolute inset-0 bg-black/30" onClick={() => setOpen(false)} />
          <aside className="os-drawer absolute inset-y-0 right-0 w-full max-w-sm overflow-y-auto bg-white p-6 shadow-2xl">
            <div className="mb-5 flex items-center justify-between"><h2 className="text-[18px] font-semibold">RaveSoft AI Commander</h2><button type="button" onClick={() => setOpen(false)} aria-label="Close"><X className="h-5 w-5" /></button></div>
            <p className="text-[13px] text-[var(--muted)]">The executive layer. It reads company state, ranks priorities, delegates to AI Employees and escalates what needs a human.</p>
            <dl className="mt-5 divide-y divide-[var(--border)] text-[14px]">
              {[["Status", info.state === "NOT_SET_UP" ? "Not set up" : info.state.toLowerCase()], ["Last operating loop", lastLoopLabel], ["Active AI Employees", String(info.activeAgents)], ["Tasks queued", String(info.queued)], ["Tasks running", String(info.running)], ["Waiting for you", String(info.waitingApproval)], ["Model provider", info.llm], ["Outbound messaging", info.outboundPaused ? "Paused" : "Enabled"]].map(([k, v]) => (
                <div key={k} className="flex justify-between py-2.5"><dt className="text-[var(--muted)]">{k}</dt><dd className="font-medium capitalize-first">{v}</dd></div>
              ))}
            </dl>
            <div className="mt-6 flex flex-wrap gap-2">
              <Link href="/admin/agents/ai-commander" onClick={() => setOpen(false)} className="rounded-[10px] bg-[var(--primary)] px-4 py-2 text-[13px] font-medium text-white">Open Commander</Link>
              <Link href="/admin/tasks" onClick={() => setOpen(false)} className="rounded-[10px] border border-[var(--border)] px-4 py-2 text-[13px] font-medium">View tasks</Link>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
