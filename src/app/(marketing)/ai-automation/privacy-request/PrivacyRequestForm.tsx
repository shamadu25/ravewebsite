"use client";

import { useEffect, useState } from "react";
import { prefetchFormToken, takeFormToken } from "@/lib/formToken";

export default function PrivacyRequestForm() {
  const [email, setEmail] = useState("");
  const [kind, setKind] = useState("DELETION");
  const [details, setDetails] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">("idle");
  const [msg, setMsg] = useState("");
  useEffect(() => { prefetchFormToken(); }, []);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState("busy");
    const r = await fetch("/api/ai-automation/data-request", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, kind, details, formToken: await takeFormToken(), website: "" }) }).catch(() => null);
    if (r?.ok) setState("done"); else { setState("error"); setMsg((await r?.json().catch(() => null))?.error ?? "Something went wrong. Please try again."); }
  }
  if (state === "done") return <p role="status" className="mt-6 rounded-lg bg-emerald-50 p-4 font-semibold text-emerald-800">Request received. We&apos;ll confirm by email.</p>;
  const f = "mt-1 min-h-[48px] w-full rounded-lg border border-slate-300 bg-white px-3.5 text-base focus:border-[#060297] focus:outline-none focus:ring-2 focus:ring-[#060297]";
  return (
    <form onSubmit={submit} className="mt-6 space-y-4">
      <label className="block text-sm font-semibold">Email you used<input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" className={f} /></label>
      <label className="block text-sm font-semibold">Request<select value={kind} onChange={(e) => setKind(e.target.value)} className={f}><option value="DELETION">Delete my information</option><option value="CORRECTION">Correct my information</option><option value="OPT_OUT">Stop emails</option></select></label>
      <label className="block text-sm font-semibold">Details (optional)<textarea value={details} onChange={(e) => setDetails(e.target.value)} maxLength={1000} rows={4} className={f + " py-3"} /></label>
      {state === "error" && <p role="alert" className="text-sm font-medium text-red-700">{msg}</p>}
      <button disabled={state === "busy"} className="min-h-[48px] rounded-lg bg-[#071536] px-6 font-bold text-white hover:bg-[#060297] disabled:opacity-60">{state === "busy" ? "Sending…" : "Send request"}</button>
    </form>
  );
}
