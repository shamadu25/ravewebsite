"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Loader2, AlertCircle, MessageCircle } from "lucide-react";
import { COMPANY } from "@/lib/data";
import { trackEvent } from "@/lib/utils";
import { captureAttribution } from "@/lib/attribution";
import { getLandingPage } from "@/lib/ai/session";
import { prefetchFormToken, takeFormToken } from "@/lib/formToken";
import TurnstileField from "@/components/ui/TurnstileField";
import {
  BUSINESS_TYPES,
  FIELD_ORDER,
  MESSAGE_MAX,
  SOLUTIONS,
  solutionByValue,
  validateLead,
  whatsappText,
  type LeadErrors,
  type LeadField,
  type LeadValues,
} from "@/lib/getStarted";
import { FORM_ID, SELECT_EVENT } from "./FormCta";

type Status = "idle" | "submitting" | "success";

const EMPTY: LeadValues = { fullName: "", businessName: "", phone: "", email: "", businessType: "", solution: "", message: "" };

const input =
  "block w-full min-h-[48px] lg:min-h-[44px] rounded-xl border bg-white px-4 text-[16px] text-gray-900 placeholder:text-gray-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#397BFF] focus-visible:border-[#397BFF] disabled:opacity-60";
const ok = "border-gray-300";
const bad = "border-red-500";

const newId = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const waHref = (label?: string) => `https://wa.me/${COMPANY.whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(whatsappText(label))}`;

/**
 * The single lead form for /get-started. Posts to the existing /api/contact endpoint (formType "get_started").
 * `generate_lead` fires only after the server confirms the lead was saved.
 */
export default function LeadForm({ initialSolution }: { initialSolution?: string }) {
  const [values, setValues] = useState<LeadValues>({ ...EMPTY, solution: initialSolution ?? "" });
  const [errors, setErrors] = useState<LeadErrors>({});
  const [status, setStatus] = useState<Status>("idle");
  const [formError, setFormError] = useState<string | null>(null);
  const [submittedSolution, setSubmittedSolution] = useState<string>("");

  const root = useRef<HTMLElement>(null);
  const successHeading = useRef<HTMLHeadingElement>(null);
  const honeypot = useRef<HTMLInputElement>(null);
  const turnstile = useRef<string | null>(null);
  const submitting = useRef(false); // synchronous double-submit guard (state updates are async)
  const submissionId = useRef<string | null>(null);
  const started = useRef(false);
  const viewed = useRef(false);
  const steps = useRef({ contact: false, requirements: false });

  useEffect(() => {
    prefetchFormToken();
  }, []);

  // Another part of the page (a solution card / CTA) preselects a solution.
  useEffect(() => {
    const onSelect = (e: Event) => {
      const v = (e as CustomEvent<{ solution?: string }>).detail?.solution;
      if (v && solutionByValue(v)) {
        setValues((p) => ({ ...p, solution: v }));
        setErrors((p) => ({ ...p, solution: undefined }));
      }
    };
    window.addEventListener(SELECT_EVENT, onSelect);
    return () => window.removeEventListener(SELECT_EVENT, onSelect);
  }, []);

  // lead_form_view: once, when at least half of the form has actually been on screen.
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !viewed.current) {
          viewed.current = true;
          trackEvent("lead_form_view", { page: "get-started" });
          io.disconnect();
        }
      },
      { threshold: 0.5 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const set = (field: LeadField) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const v = e.target.value;
    setValues((p) => ({ ...p, [field]: v }));
    if (errors[field]) setErrors((p) => ({ ...p, [field]: undefined }));
  };

  /** Validates one field when the user leaves it, and reports finished groups of fields (once each). */
  const onBlurField = (field: LeadField) => () => {
    const e = validateLead(values);
    setErrors((p) => ({ ...p, [field]: e[field] }));
    if (!steps.current.contact && !e.fullName && !e.businessName && !e.phone && !e.email) {
      steps.current.contact = true;
      trackEvent("lead_form_step_complete", { step: "contact_details" });
    }
    if (!steps.current.requirements && !e.businessType && !e.solution) {
      steps.current.requirements = true;
      trackEvent("lead_form_step_complete", { step: "requirements" });
    }
  };

  const onFirstTouch = () => {
    if (started.current) return;
    started.current = true;
    trackEvent("lead_form_start", { page: "get-started" });
  };

  const focusFirstInvalid = (errs: LeadErrors) => {
    const first = FIELD_ORDER.find((f) => errs[f]);
    if (first) document.getElementById(`lead-${first}`)?.focus();
  };

  async function post(token: string | null): Promise<Response> {
    const attribution = captureAttribution();
    return fetch("/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        formType: "get_started",
        fullName: values.fullName,
        businessName: values.businessName,
        phone: values.phone,
        email: values.email,
        businessType: values.businessType,
        solution: values.solution,
        message: values.message,
        submissionId: submissionId.current,
        website: honeypot.current?.value ?? "",
        formToken: token,
        turnstileToken: turnstile.current,
        page: getLandingPage(window.location.pathname),
        referrer: document.referrer,
        attribution: { first: attribution.first, latest: attribution.latest },
      }),
    });
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting.current) return; // duplicate click / double Enter
    setFormError(null);

    const errs = validateLead(values);
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      trackEvent("lead_form_error", { error_type: "validation", fields: Object.keys(errs).join(",") });
      focusFirstInvalid(errs);
      return;
    }

    submitting.current = true;
    setStatus("submitting");
    submissionId.current ??= newId();

    try {
      let res = await post(await takeFormToken());
      let data = (await res.json().catch(() => null)) as { success?: boolean; eventId?: string; duplicate?: string; error?: string; code?: string; fields?: Record<string, string> } | null;

      // A script-fast submit (e.g. autofill + instant tap) is rejected by the time-trap: wait a moment and retry once.
      if (res.status === 422 && data?.code === "token_too_fast") {
        await sleep(3500);
        res = await post(await takeFormToken());
        data = (await res.json().catch(() => null)) as typeof data;
      }

      if (res.ok && data?.success) {
        const eventId = data.eventId ?? submissionId.current;
        // The lead is saved. Fire the conversion exactly once per submission, and never for an "already received"
        // repeat of an earlier enquiry (data.duplicate === "similar").
        const firedKey = `rave_lead_fired_${eventId}`;
        let alreadyFired = false;
        try {
          alreadyFired = window.sessionStorage.getItem(firedKey) === "1";
        } catch {
          /* storage blocked */
        }
        if (data.duplicate !== "similar" && !alreadyFired) {
          try {
            window.sessionStorage.setItem(firedKey, "1");
          } catch {
            /* storage blocked */
          }
          const a = captureAttribution();
          trackEvent(
            "generate_lead",
            {
              event_category: "get_started",
              solution: values.solution,
              business_type: values.businessType,
              utm_source: a.latest.utm_source ?? "none",
              utm_campaign: a.latest.utm_campaign ?? "none",
            },
            { eventId, metaStandard: "Lead" }
          );
        }
        setSubmittedSolution(solutionByValue(values.solution)?.label ?? "");
        setStatus("success");
        window.setTimeout(() => successHeading.current?.focus(), 50);
        return;
      }

      // ── failure: keep everything the visitor typed ─────────────────────────────
      if (res.status === 422 && data?.fields && Object.keys(data.fields).length > 0) {
        setErrors(data.fields as LeadErrors);
        trackEvent("lead_form_error", { error_type: "server_validation", fields: Object.keys(data.fields).join(",") });
        focusFirstInvalid(data.fields as LeadErrors);
        setFormError(data.error ?? "Please check the highlighted fields.");
      } else if (res.status === 429) {
        trackEvent("lead_form_error", { error_type: "rate_limited" });
        setFormError(data?.error ?? "Too many attempts. Please wait a few minutes and try again.");
      } else if (res.status === 422) {
        trackEvent("lead_form_error", { error_type: data?.code ?? "rejected" });
        setFormError(data?.error ?? "We couldn't send your enquiry. Please check your details and try again.");
      } else {
        trackEvent("lead_form_error", { error_type: `api_${res.status}` });
        setFormError(data?.error ?? "Something went wrong and your enquiry was not sent. Your details are still here — please try again, or message us on WhatsApp.");
      }
    } catch {
      trackEvent("lead_form_error", { error_type: "network" });
      setFormError("We couldn't reach our server. Your details are still here — please check your connection and try again, or message us on WhatsApp.");
    } finally {
      submitting.current = false;
      setStatus((s) => (s === "success" ? s : "idle"));
    }
  }

  const selected = solutionByValue(values.solution);
  const busy = status === "submitting";

  if (status === "success") {
    return (
      <section ref={root} id={FORM_ID} tabIndex={-1} aria-label="Enquiry received" className="scroll-mt-24 rounded-2xl bg-white p-6 shadow-[0_24px_64px_rgba(0,0,0,0.35)] sm:p-8">
        <div role="status" aria-live="polite" className="text-center">
          <CheckCircle2 className="mx-auto mb-4 h-12 w-12 text-emerald-600" aria-hidden="true" />
          <h2 ref={successHeading} tabIndex={-1} className="text-2xl font-extrabold tracking-tight text-gray-900 outline-none">
            YOUR ENQUIRY HAS BEEN RECEIVED.
          </h2>
          <p className="mt-3 text-gray-600">
            Thank you for contacting RaveSoft. Our team will review your requirements and contact you using the details provided.
          </p>
          <a
            href={waHref(submittedSolution)}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-6 inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl border border-gray-300 px-5 text-sm font-semibold text-gray-800 hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#397BFF]"
          >
            <MessageCircle className="h-4 w-4" aria-hidden="true" />
            Message us on WhatsApp (optional)
          </a>
        </div>
      </section>
    );
  }

  const errorCount = Object.values(errors).filter(Boolean).length;

  return (
    <section ref={root} id={FORM_ID} tabIndex={-1} aria-labelledby="lead-form-title" className="scroll-mt-24 rounded-2xl bg-white p-5 shadow-[0_24px_64px_rgba(0,0,0,0.35)] outline-none sm:p-7">
      <h2 id="lead-form-title" className="text-xl font-extrabold tracking-tight text-gray-900 sm:text-2xl">
        TELL US ABOUT YOUR BUSINESS
      </h2>
      <p className="mt-1.5 text-sm text-gray-600">Share a few details and our team will contact you about the right solution.</p>

      {/* Announced to screen readers when something goes wrong */}
      <div aria-live="assertive" className="mt-4 empty:hidden">
        {formError && (
          <div role="alert" className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3.5 text-sm text-red-800">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <div>
              <p>{formError}</p>
              {errorCount === 0 && (
                <a href={waHref(selected?.label)} target="_blank" rel="noopener noreferrer" className="mt-1 inline-block font-semibold underline">
                  Message us on WhatsApp
                </a>
              )}
            </div>
          </div>
        )}
      </div>

      <form onSubmit={onSubmit} onFocus={onFirstTouch} noValidate className="mt-5 space-y-4 lg:mt-4 lg:space-y-3" aria-busy={busy}>
        {/* Spam trap: invisible to people and screen readers, tempting to bots. */}
        <div aria-hidden="true" style={{ position: "absolute", left: "-10000px", width: 1, height: 1, overflow: "hidden" }}>
          <label>
            Leave this field empty
            <input ref={honeypot} type="text" name="website" tabIndex={-1} autoComplete="off" defaultValue="" />
          </label>
        </div>

        <Field id="lead-fullName" label="Full Name" error={errors.fullName}>
          <input id="lead-fullName" name="name" type="text" autoComplete="name" required aria-required="true" value={values.fullName} onChange={set("fullName")} onBlur={onBlurField("fullName")} disabled={busy}
            aria-invalid={!!errors.fullName} aria-describedby={errors.fullName ? "lead-fullName-err" : undefined} className={`${input} ${errors.fullName ? bad : ok}`} />
        </Field>

        <Field id="lead-businessName" label="Business Name" error={errors.businessName}>
          <input id="lead-businessName" name="organization" type="text" autoComplete="organization" required aria-required="true" value={values.businessName} onChange={set("businessName")} onBlur={onBlurField("businessName")} disabled={busy}
            aria-invalid={!!errors.businessName} aria-describedby={errors.businessName ? "lead-businessName-err" : undefined} className={`${input} ${errors.businessName ? bad : ok}`} />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="lead-phone" label="Phone / WhatsApp Number" error={errors.phone}>
            <input id="lead-phone" name="tel" type="tel" inputMode="tel" autoComplete="tel" required aria-required="true" placeholder="+233 24 123 4567" value={values.phone} onChange={set("phone")} onBlur={onBlurField("phone")} disabled={busy}
              aria-invalid={!!errors.phone} aria-describedby={errors.phone ? "lead-phone-err" : undefined} className={`${input} ${errors.phone ? bad : ok}`} />
          </Field>
          <Field id="lead-email" label="Business Email" error={errors.email}>
            <input id="lead-email" name="email" type="email" inputMode="email" autoComplete="email" required aria-required="true" placeholder="you@company.com" value={values.email} onChange={set("email")} onBlur={onBlurField("email")} disabled={busy}
              aria-invalid={!!errors.email} aria-describedby={errors.email ? "lead-email-err" : undefined} className={`${input} ${errors.email ? bad : ok}`} />
          </Field>
        </div>

        <Field id="lead-businessType" label="Business Type" error={errors.businessType}>
          <select id="lead-businessType" name="businessType" required aria-required="true" value={values.businessType} onChange={set("businessType")} onBlur={onBlurField("businessType")} disabled={busy}
            aria-invalid={!!errors.businessType} aria-describedby={errors.businessType ? "lead-businessType-err" : undefined} className={`${input} ${errors.businessType ? bad : ok}`}>
            <option value="">Select your business type</option>
            {BUSINESS_TYPES.map((b) => (
              <option key={b.value} value={b.value}>{b.label}</option>
            ))}
          </select>
        </Field>

        <Field id="lead-solution" label="Solution Required" error={errors.solution}>
          <select id="lead-solution" name="solution" required aria-required="true" value={values.solution} onChange={set("solution")} onBlur={onBlurField("solution")} disabled={busy}
            aria-invalid={!!errors.solution} aria-describedby={`${errors.solution ? "lead-solution-err " : ""}lead-solution-hint`} className={`${input} ${errors.solution ? bad : ok}`}>
            <option value="">Select the solution you need</option>
            {SOLUTIONS.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
          <p id="lead-solution-hint" aria-live="polite" className="mt-1.5 min-h-[1.25rem] text-xs text-gray-500">
            {selected ? selected.blurb : "Not sure? Choose “Other / Not Sure Yet” and we’ll help you decide."}
          </p>
        </Field>

        <Field id="lead-message" label="Tell us more about what you need" optional error={errors.message}>
          <textarea id="lead-message" name="message" rows={2} maxLength={MESSAGE_MAX + 200} value={values.message} onChange={set("message")} onBlur={onBlurField("message")} disabled={busy}
            aria-invalid={!!errors.message} aria-describedby={errors.message ? "lead-message-err" : undefined} className={`${input} py-2.5 ${errors.message ? bad : ok}`} />
        </Field>

        <TurnstileField onToken={(t) => { turnstile.current = t; }} />

        <button
          type="submit"
          disabled={busy}
          aria-disabled={busy}
          className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-xl bg-[#FFB200] px-6 text-base font-extrabold tracking-wide text-[#070B19] shadow-[0_8px_24px_rgba(255,178,0,0.35)] transition hover:bg-[#ffc233] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#060297] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {busy ? (
            <>
              <Loader2 className="h-5 w-5 motion-safe:animate-spin" aria-hidden="true" />
              SENDING…
            </>
          ) : (
            "GET MY FREE CONSULTATION"
          )}
        </button>

        <p className="text-center text-xs leading-relaxed text-gray-500">
          No obligation. Your information is used to respond to your enquiry.{" "}
          <Link href="/privacy" className="font-medium text-[#060297] underline underline-offset-2 hover:text-[#397BFF]">
            Privacy Policy
          </Link>
        </p>
      </form>
    </section>
  );
}

function Field({ id, label, optional, error, children }: { id: string; label: string; optional?: boolean; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold text-gray-800">
        {label}
        {optional ? <span className="ml-1 font-normal text-gray-500">(optional)</span> : <span aria-hidden="true" className="ml-0.5 text-red-600">*</span>}
      </label>
      {children}
      {error && (
        <p id={`${id}-err`} className="mt-1.5 text-sm font-medium text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
