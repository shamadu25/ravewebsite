"use client";

import { useState } from "react";

export default function OptOutForm({ token }: { token: string }) {
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">("idle");
  async function go() {
    setState("busy");
    const r = await fetch("/api/ai-automation/optout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token }) }).catch(() => null);
    setState(r?.ok ? "done" : "error");
  }
  if (state === "done") return <p role="status" className="mt-6 rounded-lg bg-emerald-50 p-4 font-semibold text-emerald-800">Done — we won&apos;t send you further follow-up emails about this proposal.</p>;
  return (
    <div className="mt-6">
      <button onClick={go} disabled={state === "busy" || !token} className="min-h-[48px] rounded-lg bg-[#071536] px-6 font-bold text-white hover:bg-[#060297] disabled:opacity-60">{state === "busy" ? "Working…" : "Yes, stop the emails"}</button>
      {(state === "error" || !token) && <p role="alert" className="mt-3 text-sm font-medium text-red-700">This link is invalid or has expired. Please use the privacy request page instead.</p>}
    </div>
  );
}
