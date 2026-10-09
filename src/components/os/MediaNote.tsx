"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

/** Read a voice note or photo you saved from WhatsApp (or anywhere) and keep the result on the deal. */
export default function MediaNote({ opportunityId }: { opportunityId: number }) {
  const router = useRouter();
  const [, start] = useTransition();
  const [busy, setBusy] = useState(false);
  const [out, setOut] = useState<{ ok: boolean; text: string } | null>(null);

  async function onFile(file: File | undefined) {
    if (!file) return;
    setBusy(true); setOut(null);
    try {
      const fd = new FormData(); fd.append("file", file); fd.append("opportunityId", String(opportunityId)); fd.append("save", "true");
      const res = await fetch("/api/os/media", { method: "POST", body: fd });
      const j = await res.json().catch(() => null);
      if (!res.ok || j?.ok === false) setOut({ ok: false, text: j?.error ?? `Failed (${res.status}).` });
      else { setOut({ ok: true, text: `${j.data.text}${j.data.saved ? "\n\n(Saved as a note on this deal.)" : ""}` }); start(() => router.refresh()); }
    } catch { setOut({ ok: false, text: "Network error — nothing was saved." }); } finally { setBusy(false); }
  }
  return (
    <div className="space-y-2">
      <label className="inline-block cursor-pointer rounded-lg border border-[var(--border)] bg-white px-3 py-1.5 text-xs font-medium hover:bg-gray-50">
        {busy ? "Reading…" : "Upload voice note or photo"}
        <input type="file" hidden disabled={busy} accept="audio/*,image/jpeg,image/png,image/webp" onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; void onFile(f); }} />
      </label>
      {out && <pre role="status" className={`whitespace-pre-wrap rounded-lg p-2 text-xs ${out.ok ? "bg-emerald-50 text-emerald-900" : "bg-red-50 text-red-800"}`}>{out.text}</pre>}
    </div>
  );
}
