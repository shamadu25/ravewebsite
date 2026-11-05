"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Step { label: string; kind: "any_page" | "path" | "event"; value: string }
const EMPTY: Step = { label: "", kind: "path", value: "" };

export default function FunnelBuilder() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [steps, setSteps] = useState<Step[]>([{ label: "Visited pricing", kind: "path", value: "/pricing" }, { ...EMPTY, kind: "event", value: "form_start", label: "Started form" }]);
  const [msg, setMsg] = useState<string | null>(null);
  const set = (i: number, p: Partial<Step>) => setSteps((s) => s.map((x, n) => (n === i ? { ...x, ...p } : x)));
  async function save() {
    setMsg(null);
    const r = await fetch("/api/intel/admin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "funnel_create", name, steps }) });
    const j = await r.json().catch(() => ({}));
    if (j.ok) { setName(""); router.refresh(); setMsg("Funnel saved."); } else setMsg(j.error ?? "Could not save.");
  }
  const input = "h-9 rounded-lg border border-gray-300 px-2.5 text-sm";
  return (
    <div className="space-y-3">
      <label className="block text-xs text-gray-500">Funnel name<input className={`${input} mt-1 block w-full max-w-sm`} value={name} onChange={(e) => setName(e.target.value)} maxLength={80} /></label>
      {steps.map((s, i) => (
        <div key={i} className="flex flex-wrap items-end gap-2">
          <span className="pb-2 text-xs text-gray-400">{i + 1}.</span>
          <label className="text-xs text-gray-500">Label<input className={`${input} mt-1 block w-44`} value={s.label} onChange={(e) => set(i, { label: e.target.value })} /></label>
          <label className="text-xs text-gray-500">Type<select className={`${input} mt-1 block`} value={s.kind} onChange={(e) => set(i, { kind: e.target.value as Step["kind"] })}><option value="any_page">Any page view</option><option value="path">Page path(s)</option><option value="event">Event</option></select></label>
          {s.kind !== "any_page" && <label className="text-xs text-gray-500">{s.kind === "path" ? "Paths, comma-separated" : "Event name"}<input className={`${input} mt-1 block w-56`} value={s.value} placeholder={s.kind === "path" ? "/products,/services" : "form_start"} onChange={(e) => set(i, { value: e.target.value })} /></label>}
          {steps.length > 2 && <button type="button" className="pb-2 text-xs text-red-700 underline" onClick={() => setSteps((x) => x.filter((_, n) => n !== i))}>Remove</button>}
        </div>
      ))}
      <div className="flex items-center gap-3">
        {steps.length < 8 && <button type="button" className="text-sm text-[#060297] underline" onClick={() => setSteps((s) => [...s, { ...EMPTY }])}>+ Add step</button>}
        <button type="button" onClick={save} className="h-9 rounded-lg bg-[#060297] px-4 text-sm font-semibold text-white">Save funnel</button>
        {msg && <span role="status" className="text-sm text-gray-600">{msg}</span>}
      </div>
    </div>
  );
}
