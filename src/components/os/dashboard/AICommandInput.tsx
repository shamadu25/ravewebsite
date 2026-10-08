"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Sparkles } from "lucide-react";

const CHIPS = ["What should we focus on today?", "What is blocking the $500K target?", "Which customers are at risk?", "What are today's highest-value opportunities?"];

export default function AICommandInput() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const go = (text: string) => { if (text.trim()) router.push(`/admin/ask?q=${encodeURIComponent(text.trim())}`); };
  return (
    <section className="os-card p-5" aria-label="Ask RaveSoft AI">
      <form onSubmit={(e) => { e.preventDefault(); go(q); }} className="flex items-center gap-3">
        <Sparkles className="h-5 w-5 shrink-0 text-[var(--primary)]" aria-hidden />
        <input value={q} onChange={(e) => setQ(e.target.value)} aria-label="Ask RaveSoft AI" placeholder="Ask RaveSoft AI…  “What should we focus on today?”" className="h-10 min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-slate-400" />
        <button className="h-9 rounded-[10px] bg-[var(--primary)] px-4 text-[13px] font-medium text-white hover:bg-[var(--primary-hover)]">Ask</button>
      </form>
      <div className="mt-3 flex flex-wrap gap-2">{CHIPS.map((c) => <button key={c} type="button" onClick={() => go(c)} className="rounded-full border border-[var(--border)] px-3 py-1 text-[12px] text-[var(--muted)] hover:border-[var(--primary-bright)] hover:text-[var(--primary)]">{c}</button>)}</div>
    </section>
  );
}
