"use client";

import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { DRAFT_KEY, STAGE_TITLES } from "./AssessmentEngine";
import { beacon } from "./Tracker";

/** Compact step-1 form in the hero. It seeds the shared assessment engine (same draft) and scrolls to it — one engine, one backend. */
export default function HeroStarter({ industries, initialIndustry, industryName }: { industries: Array<{ slug: string; name: string }>; initialIndustry?: string; industryName?: string }) {
  const [business, setBusiness] = useState("");
  const [industry, setIndustry] = useState(initialIndustry ?? "");
  const [country, setCountry] = useState("");
  const [err, setErr] = useState<string | null>(null);

  function go(e: React.FormEvent) {
    e.preventDefault();
    if (!business.trim() || !industry || !country.trim()) { setErr("Please fill in your business name, industry and country to start."); return; }
    try {
      const prev = JSON.parse(localStorage.getItem(DRAFT_KEY) ?? "null") as { answers?: Record<string, unknown>; idem?: string } | null;
      localStorage.setItem(DRAFT_KEY, JSON.stringify({ answers: { ...(prev?.answers ?? {}), businessName: business.trim(), industry, country: country.trim() }, stage: 1, idem: prev?.idem ?? "", savedAt: Date.now() }));
    } catch { /* ignore */ }
    beacon("cta_click", { industry });
    window.dispatchEvent(new Event("ra:assessment-prefill"));
    const target = document.getElementById("assessment");
    target?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
    window.setTimeout(() => document.getElementById("q-city")?.focus({ preventScroll: true }), 500);
  }

  const field = "min-h-[48px] w-full rounded-lg border border-slate-300 bg-white px-3.5 text-base text-[#172033] focus:border-[#060297] focus:outline-none focus:ring-2 focus:ring-[#060297]";
  return (
    <form onSubmit={go} noValidate aria-labelledby="hero-starter-title" className="rounded-lg bg-white p-5 text-[#172033] shadow-xl shadow-black/25 sm:p-6">
      <div className="flex items-center justify-between">
        <h2 id="hero-starter-title" className="text-lg font-bold text-[#071536]">Start your free assessment</h2>
        <span className="text-xs font-semibold text-[#64748B]">Step 1 of 6</span>
      </div>
      <ol className="mt-3 flex gap-1.5" aria-label="Six-step assessment">
        {STAGE_TITLES.map((t, i) => (
          <li key={t} className="flex-1" aria-current={i === 0 ? "step" : undefined}>
            <div className={i === 0 ? "h-1.5 rounded-full bg-[#FFB200]" : "h-1.5 rounded-full bg-slate-200"} />
            <span className="sr-only">{t}</span>
          </li>
        ))}
      </ol>
      <p className="mt-2 text-xs text-[#64748B]">{STAGE_TITLES.join(" → ")}</p>
      <div className="mt-4 space-y-3.5">
        <div><label htmlFor="hs-business" className="mb-1 block text-sm font-semibold">Business name</label><input id="hs-business" value={business} onChange={(e) => setBusiness(e.target.value)} autoComplete="organization" maxLength={200} className={field} /></div>
        <div>
          <label htmlFor="hs-industry" className="mb-1 block text-sm font-semibold">Industry</label>
          <select id="hs-industry" value={industry} onChange={(e) => setIndustry(e.target.value)} className={field}>
            <option value="">Select your industry…</option>
            {industries.map((i) => <option key={i.slug} value={i.slug}>{i.name}</option>)}
          </select>
          {initialIndustry && industryName && <p className="mt-1 text-xs text-[#64748B]">Preselected for {industryName}. You can change it.</p>}
        </div>
        <div><label htmlFor="hs-country" className="mb-1 block text-sm font-semibold">Country</label><input id="hs-country" value={country} onChange={(e) => setCountry(e.target.value)} autoComplete="country-name" maxLength={100} className={field} /></div>
      </div>
      {err && <p role="alert" className="mt-3 text-sm font-medium text-red-700">{err}</p>}
      <button type="submit" className="mt-5 inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-lg bg-[#FFB200] px-6 text-[15px] font-bold text-[#071536] transition-colors hover:bg-[#ffc233] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#071536] focus-visible:ring-offset-2">
        Get My Free AI Business Assessment <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </button>
      <p className="mt-3 text-center text-xs text-[#64748B]">No account needed. Takes a few minutes.</p>
    </form>
  );
}
