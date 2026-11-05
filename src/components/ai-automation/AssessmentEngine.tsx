"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, ArrowLeft, ArrowRight, CheckCircle2, Loader2, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Question } from "@/lib/ai-automation/types";
import { isVisible, validateStage, type Answers } from "@/lib/ai-automation/validation";
import { prefetchFormToken, takeFormToken } from "@/lib/formToken";
import TurnstileField from "@/components/ui/TurnstileField";
import { beacon } from "./Tracker";

/** The single shared assessment engine used by /ai-automation and every industry page. Questions come from the backend configuration. */

export const STAGE_TITLES = ["Business profile", "Operations", "Challenges", "Opportunities", "Goals & budget", "Contact"];
export const DRAFT_KEY = "ra-ai-draft-v1";
const DRAFT_TTL_MS = 7 * 86_400_000;
/** Contact details and consents are never written to local storage. */
const NO_DRAFT = new Set(["fullName", "email", "phone", "position", "consentProcessing", "consentMarketing", "additionalInfo"]);
const SENSITIVE_INDUSTRIES = new Set(["healthcare", "financial-services", "education"]);

interface IndustryOption { slug: string; name: string }
interface Props { industries: IndustryOption[]; initialIndustry?: string; initialQuestions: Question[]; heading?: string; intro?: string }
interface Draft { answers: Answers; stage: number; idem: string; savedAt: number }

const newKey = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID().replace(/-/g, "") : Math.random().toString(36).slice(2) + Date.now().toString(36) + "00000000");

function readDraft(): Draft | null {
  try {
    const d = JSON.parse(localStorage.getItem(DRAFT_KEY) ?? "null") as Draft | null;
    if (!d || Date.now() - d.savedAt > DRAFT_TTL_MS) return null;
    return d;
  } catch { return null; }
}

function utm() {
  const p = new URLSearchParams(window.location.search);
  const g = (k: string) => p.get(k)?.slice(0, 200) || undefined;
  return { utmSource: g("utm_source"), utmMedium: g("utm_medium"), utmCampaign: g("utm_campaign"), utmContent: g("utm_content"), utmTerm: g("utm_term"), landingPage: window.location.pathname };
}

export default function AssessmentEngine({ industries, initialIndustry, initialQuestions, heading = "Free AI Business Assessment", intro }: Props) {
  const [answers, setAnswers] = useState<Answers>(initialIndustry ? { industry: initialIndustry } : {});
  const [questions, setQuestions] = useState<Question[]>(initialQuestions);
  const [stage, setStage] = useState(1);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [phase, setPhase] = useState<"form" | "submitting" | "done">("form");
  const [formError, setFormError] = useState<string | null>(null);
  const [reference, setReference] = useState<string | null>(null);
  const [loadingConfig, setLoadingConfig] = useState(false);
  const [restored, setRestored] = useState(false);
  const idem = useRef<string>("");
  const turnstile = useRef<string | null>(null);
  const honeypot = useRef<HTMLInputElement>(null);
  const started = useRef(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const submitting = useRef(false);
  const industry = (answers.industry as string | undefined) ?? "";

  // Restore a saved draft (save-and-resume). Done after mount so server and client markup match.
  useEffect(() => {
    idem.current = newKey();
    const d = readDraft();
    if (d) {
      const merged: Answers = { ...d.answers };
      if (initialIndustry) merged.industry = initialIndustry; // an industry page always wins over an older draft
      // Restoring a persisted draft after hydration is a sync with an external store (localStorage), so setState here is intentional.
      /* eslint-disable react-hooks/set-state-in-effect */
      setAnswers((cur) => ({ ...cur, ...merged }));
      setStage(Math.min(Math.max(d.stage || 1, 1), 6));
      idem.current = d.idem || idem.current;
      setRestored(Object.keys(d.answers).length > 1);
      /* eslint-enable react-hooks/set-state-in-effect */
    }
    // /ai-automation?industry=manufacturing#assessment preselects an industry that has no landing page of its own.
    const q = new URLSearchParams(window.location.search).get("industry");
    if (!initialIndustry && q && industries.some((i) => i.slug === q)) setAnswers((cur) => ({ ...cur, industry: q }));
  }, [initialIndustry, industries]);

  // The hero "starter" writes to the same draft and tells us to pick it up.
  useEffect(() => {
    const onPrefill = () => { const d = readDraft(); if (d) { setAnswers((cur) => ({ ...cur, ...d.answers })); setStage(1); } };
    window.addEventListener("ra:assessment-prefill", onPrefill);
    return () => window.removeEventListener("ra:assessment-prefill", onPrefill);
  }, []);

  // Autosave (debounced) — never including contact details or consents.
  useEffect(() => {
    if (phase !== "form") return;
    const t = window.setTimeout(() => {
      try {
        const safe = Object.fromEntries(Object.entries(answers).filter(([k, v]) => !NO_DRAFT.has(k) && v !== undefined && v !== ""));
        if (Object.keys(safe).length) localStorage.setItem(DRAFT_KEY, JSON.stringify({ answers: safe, stage, idem: idem.current, savedAt: Date.now() } satisfies Draft));
      } catch { /* storage unavailable: autosave is a convenience only */ }
    }, 400);
    return () => window.clearTimeout(t);
  }, [answers, stage, phase]);

  // Load the question set when the industry changes (the same engine adapts to every industry).
  const loaded = useRef<string>(initialIndustry ?? "");
  useEffect(() => {
    if (!industry || industry === loaded.current) return;
    let cancelled = false;
    setLoadingConfig(true);
    fetch(`/api/ai-automation/config?industry=${encodeURIComponent(industry)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("config"))))
      .then((j: { questions: Question[] }) => { if (!cancelled) { setQuestions(j.questions); loaded.current = industry; } })
      .catch(() => { if (!cancelled) setFormError("We couldn't load the questions for that industry. Please check your connection and try again."); })
      .finally(() => { if (!cancelled) setLoadingConfig(false); });
    beacon("industry_selected", { industry });
    return () => { cancelled = true; };
  }, [industry]);

  const stageQuestions = useMemo(() => questions.filter((q) => q.stage === stage && isVisible(q, answers)), [questions, stage, answers]);
  const set = useCallback((key: string, value: string | string[] | boolean) => {
    setAnswers((a) => ({ ...a, [key]: value }));
    setErrors((e) => { if (!e[key]) return e; const n = { ...e }; delete n[key]; return n; });
    if (!started.current) { started.current = true; prefetchFormToken(); beacon("assessment_start", { industry }); }
  }, [industry]);

  useEffect(() => { if (phase === "form") beacon("assessment_step", { step: stage, industry }); }, [stage, phase, industry]);
  const goTo = (n: number) => { setStage(n); window.requestAnimationFrame(() => headingRef.current?.focus()); };

  const focusFirst = (errs: Record<string, string>) => {
    const first = questions.find((q) => errs[q.key]);
    if (first) window.requestAnimationFrame(() => (document.getElementById(`q-${first.key}`) ?? document.querySelector<HTMLElement>(`[data-q="${first.key}"] input`))?.focus());
  };

  function next() {
    setFormError(null);
    const res = validateStage(questions, stage, answers);
    if (!res.ok) { setErrors(res.errors); focusFirst(res.errors); return; }
    if (loadingConfig) return;
    setErrors({});
    goTo(Math.min(6, stage + 1));
  }

  async function submit() {
    if (submitting.current) return;
    setFormError(null);
    const res = validateStage(questions, 6, answers);
    if (!res.ok) { setErrors(res.errors); focusFirst(res.errors); return; }
    submitting.current = true;
    setPhase("submitting");
    beacon("assessment_submit_attempt", { industry });
    try {
      const token = await takeFormToken();
      const r = await fetch("/api/ai-automation/assessments", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ industry, answers, idempotencyKey: idem.current, entryPage: window.location.pathname, attribution: utm(), formToken: token, turnstileToken: turnstile.current, hp: honeypot.current?.value ?? "" }),
      });
      const j = await r.json().catch(() => ({}));
      if (r.ok) {
        try { localStorage.removeItem(DRAFT_KEY); } catch { /* ignore */ }
        setReference(j.reference ?? null);
        setPhase("done");
        window.requestAnimationFrame(() => headingRef.current?.focus());
        return;
      }
      setPhase("form");
      if (j.fieldErrors) { setErrors(j.fieldErrors); if (j.stage) goTo(j.stage); focusFirst(j.fieldErrors); }
      setFormError(j.error ?? "Something went wrong. Please try again.");
    } catch {
      setPhase("form");
      setFormError("We couldn't reach the server. Your answers are saved on this device — please try again.");
    } finally { submitting.current = false; }
  }

  if (phase === "done") {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-6 sm:p-10" role="status">
        <CheckCircle2 className="h-10 w-10 text-emerald-600" aria-hidden="true" />
        <h3 ref={headingRef} tabIndex={-1} className="mt-4 text-2xl font-bold text-[#071536] outline-none">Thank you — your assessment has been received</h3>
        {reference && <p className="mt-2 text-sm text-[#64748B]">Reference: <span className="font-mono font-semibold text-[#172033]">{reference}</span></p>}
        <ol className="mt-6 space-y-3 text-[15px] text-[#172033]">
          <li className="flex gap-3"><span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#060297] text-xs font-bold text-white">1</span>Our AI consultant analyses your business and identifies automation opportunities.</li>
          <li className="flex gap-3"><span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#060297] text-xs font-bold text-white">2</span>A RaveSoft team member reviews the analysis and the pricing before anything is sent to you.</li>
          <li className="flex gap-3"><span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#060297] text-xs font-bold text-white">3</span>You receive your personalised proposal by email, using the address you gave us.</li>
        </ol>
        <p className="mt-6 text-sm text-[#64748B]">Please keep your reference. If you don&apos;t hear from us, check your spam folder or contact us on WhatsApp.</p>
      </div>
    );
  }

  const sensitive = SENSITIVE_INDUSTRIES.has(industry);
  const busy = phase === "submitting";

  return (
    <form noValidate onSubmit={(e) => { e.preventDefault(); if (stage === 6) void submit(); else next(); }} className="rounded-lg border border-slate-200 bg-white" aria-labelledby="assessment-heading">
      <div className="border-b border-slate-200 p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 id="assessment-heading" className="text-lg font-bold text-[#071536] sm:text-xl">{heading}</h3>
            {intro && stage === 1 && <p className="mt-1 text-sm text-[#64748B]">{intro}</p>}
          </div>
          <span className="shrink-0 rounded-full bg-[#F7F9FC] px-3 py-1 text-xs font-semibold text-[#64748B]">Step {stage} of 6</span>
        </div>
        <ol className="mt-4 hidden gap-2 sm:flex" aria-label="Assessment progress">
          {STAGE_TITLES.map((t, i) => {
            const n = i + 1;
            return (
              <li key={t} className="flex-1" aria-current={n === stage ? "step" : undefined}>
                <div className={cn("h-1.5 rounded-full", n < stage ? "bg-[#060297]" : n === stage ? "bg-[#FFB200]" : "bg-slate-200")} />
                <span className={cn("mt-1.5 block text-xs font-semibold", n === stage ? "text-[#071536]" : "text-[#64748B]")}>{t}</span>
              </li>
            );
          })}
        </ol>
        <div className="mt-4 sm:hidden" aria-hidden="true">
          <div className="flex gap-1">{STAGE_TITLES.map((t, i) => <div key={t} className={cn("h-1.5 flex-1 rounded-full", i + 1 < stage ? "bg-[#060297]" : i + 1 === stage ? "bg-[#FFB200]" : "bg-slate-200")} />)}</div>
          <p className="mt-1.5 text-xs font-semibold text-[#071536]">{STAGE_TITLES[stage - 1]}</p>
        </div>
      </div>

      <div className="p-5 sm:p-6">
        <h4 ref={headingRef} tabIndex={-1} className="mb-1 text-base font-bold text-[#071536] outline-none">{STAGE_TITLES[stage - 1]}</h4>
        {restored && stage === 1 && <p className="mb-3 text-xs text-[#64748B]">We restored your saved answers on this device. Contact details are never saved.</p>}
        {sensitive && stage === 2 && (
          <p className="mb-4 flex gap-2 rounded-md bg-[#FFB200]/12 p-3 text-sm text-[#172033]"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#8a5f00]" aria-hidden="true" />Please describe your business and processes only. Do not enter patient, client, student or other personal records here.</p>
        )}

        <div className="mt-3 space-y-5">
          {stageQuestions.map((q) => (
            <Field key={q.key} q={q} industries={industries} value={answers[q.key]} error={errors[q.key]} onChange={(v) => set(q.key, v)} />
          ))}
          {stage === 1 && loadingConfig && <p className="flex items-center gap-2 text-sm text-[#64748B]"><Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />Loading questions for your industry…</p>}
        </div>

        {stage === 6 && (
          <>
            <div className="absolute -left-[9999px] h-0 w-0 overflow-hidden" aria-hidden="true"><label>Leave blank<input ref={honeypot} type="text" name="hp_field" tabIndex={-1} autoComplete="off" /></label></div>
            <div className="mt-5"><TurnstileField onToken={(t) => { turnstile.current = t; }} /></div>
          </>
        )}

        {formError && <div role="alert" className="mt-5 flex gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />{formError}</div>}
        {Object.keys(errors).length > 0 && <p role="alert" className="sr-only">Please correct {Object.keys(errors).length} field(s) highlighted in this step.</p>}
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-slate-200 p-5 sm:p-6">
        <button type="button" onClick={() => goTo(Math.max(1, stage - 1))} disabled={stage === 1 || busy} className="inline-flex min-h-[48px] items-center gap-2 rounded-lg px-4 text-[15px] font-semibold text-[#060297] hover:bg-[#060297]/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#060297] disabled:invisible">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />Back
        </button>
        <button type="submit" disabled={busy || loadingConfig} className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-lg bg-[#FFB200] px-6 text-[15px] font-bold text-[#071536] hover:bg-[#ffc233] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FFB200] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60">
          {busy ? <><Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />Submitting…</> : stage === 6 ? <>Get my assessment &amp; proposal<ArrowRight className="h-4 w-4" aria-hidden="true" /></> : <>Next<ArrowRight className="h-4 w-4" aria-hidden="true" /></>}
        </button>
      </div>
    </form>
  );
}

const AUTOCOMPLETE: Record<string, string> = { businessName: "organization", country: "country-name", city: "address-level2", website: "url", fullName: "name", position: "organization-title", email: "email", phone: "tel" };

function Field({ q, industries, value, error, onChange }: { q: Question; industries: IndustryOption[]; value: string | string[] | boolean | undefined; error?: string; onChange: (v: string | string[] | boolean) => void }) {
  const id = `q-${q.key}`;
  const errId = `${id}-err`;
  const hintId = `${id}-hint`;
  const describedBy = [error ? errId : null, q.helpText ? hintId : null].filter(Boolean).join(" ") || undefined;
  const options = q.key === "industry" ? industries.map((i) => ({ value: i.slug, label: i.name })) : (q.options ?? []);
  const input = "min-h-[48px] w-full rounded-lg border bg-white px-3.5 text-base text-[#172033] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#060297] focus:border-[#060297]";
  const border = error ? "border-red-500" : "border-slate-300";
  const label = <span className="mb-1.5 block text-sm font-semibold text-[#172033]">{q.label}{q.required && <span className="text-red-600" aria-hidden="true"> *</span>}{q.required && <span className="sr-only"> (required)</span>}</span>;
  const meta = (<>{q.helpText && <p id={hintId} className="mt-1.5 text-xs text-[#64748B]">{q.helpText}</p>}{error && <p id={errId} role="alert" className="mt-1.5 flex items-center gap-1 text-sm font-medium text-red-700"><AlertCircle className="h-3.5 w-3.5" aria-hidden="true" />{error}</p>}</>);

  if (q.type === "multiselect") {
    const sel = Array.isArray(value) ? value : [];
    return (
      <fieldset data-q={q.key} aria-describedby={describedBy} className="min-w-0">
        <legend className="mb-1.5 text-sm font-semibold text-[#172033]">{q.label}{q.required && <span className="text-red-600" aria-hidden="true"> *</span>}{q.required && <span className="sr-only"> (required)</span>}</legend>
        <div className={cn("grid gap-2 sm:grid-cols-2", error && "rounded-lg ring-1 ring-red-500 p-1")}>
          {options.map((o) => {
            const checked = sel.includes(o.value);
            return (
              <label key={o.value} className={cn("flex min-h-[48px] cursor-pointer items-center gap-3 rounded-lg border px-3.5 py-2 text-[15px]", checked ? "border-[#060297] bg-[#060297]/5" : "border-slate-300 bg-white hover:bg-slate-50")}>
                <input type="checkbox" checked={checked} onChange={() => onChange(checked ? sel.filter((x) => x !== o.value) : [...sel, o.value])} className="h-5 w-5 shrink-0 accent-[#060297]" />
                <span>{o.label}</span>
              </label>
            );
          })}
        </div>
        {meta}
      </fieldset>
    );
  }
  if (q.type === "boolean") {
    return (
      <div>
        <label className="flex cursor-pointer items-start gap-3 text-[15px] leading-snug text-[#172033]">
          <input id={id} type="checkbox" checked={value === true} onChange={(e) => onChange(e.target.checked)} aria-describedby={describedBy} aria-invalid={!!error} className="mt-0.5 h-5 w-5 shrink-0 accent-[#060297]" />
          <span>{q.label}{q.required && <span className="sr-only"> (required)</span>}</span>
        </label>
        {meta}
      </div>
    );
  }
  if (q.type === "select") {
    return (
      <div>
        <label htmlFor={id}>{label}</label>
        <select id={id} value={(value as string) ?? ""} onChange={(e) => onChange(e.target.value)} aria-describedby={describedBy} aria-invalid={!!error} aria-required={q.required} className={cn(input, border)} autoComplete={AUTOCOMPLETE[q.key]}>
          <option value="">Select…</option>
          {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        {meta}
      </div>
    );
  }
  if (q.type === "textarea") {
    return (
      <div>
        <label htmlFor={id}>{label}</label>
        <textarea id={id} value={(value as string) ?? ""} onChange={(e) => onChange(e.target.value)} rows={4} maxLength={q.maxLength} aria-describedby={describedBy} aria-invalid={!!error} aria-required={q.required} className={cn(input, border, "py-3")} placeholder={q.placeholder} />
        {meta}
      </div>
    );
  }
  const type = q.type === "email" ? "email" : q.type === "tel" ? "tel" : q.type === "url" ? "url" : q.type === "number" ? "number" : "text";
  return (
    <div>
      <label htmlFor={id}>{label}</label>
      <input id={id} type={type} inputMode={q.type === "tel" ? "tel" : q.type === "email" ? "email" : undefined} value={(value as string) ?? ""} onChange={(e) => onChange(e.target.value)} maxLength={q.maxLength} aria-describedby={describedBy} aria-invalid={!!error} aria-required={q.required} autoComplete={AUTOCOMPLETE[q.key]} className={cn(input, border)} placeholder={q.placeholder} />
      {meta}
    </div>
  );
}
