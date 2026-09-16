"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRight, ArrowLeft, Loader2, CheckCircle2 } from "lucide-react";
import { COMPANY } from "@/lib/data";
import { cn, trackEvent } from "@/lib/utils";
import { AssessmentAnswers, AssessmentRecommendation } from "@/lib/assessment/types";
import { captureAttribution, Attribution } from "@/lib/assessment/attribution";
import { AssessmentProgress, ContactFormState, clearProgress, loadProgress, saveProgress } from "@/lib/assessment/progress";
import { dispatchAssessmentCompleted, dispatchAssessmentInView } from "@/lib/assessment/events";
import {
  BUSINESS_TYPE_OPTIONS,
  COUNTRIES,
  INQUIRY_CHANNEL_OPTIONS,
  INQUIRY_VOLUME_OPTIONS,
  MAIN_PROBLEM_OPTIONS,
  RESPONSE_SPEED_OPTIONS,
  ChoiceOption,
} from "./assessmentConfig";

type PartialAnswers = Partial<AssessmentAnswers>;

const STEP_COUNT = 6;
const STEP_KEYS: (keyof AssessmentAnswers)[] = [
  "businessType",
  "mainProblem",
  "inquiryChannel",
  "inquiryVolume",
  "responseSpeed",
];

const EMPTY_CONTACT: ContactFormState = {
  fullName: "",
  businessName: "",
  workEmail: "",
  dialCode: "+233",
  whatsappLocal: "",
  country: "Ghana",
};

function withUtm(url: string, attribution: Attribution | null): string {
  if (!attribution) return url;
  try {
    const u = new URL(url, typeof window !== "undefined" ? window.location.origin : "https://ravesoftsolutions.com");
    if (attribution.utmSource) u.searchParams.set("utm_source", attribution.utmSource);
    if (attribution.utmMedium) u.searchParams.set("utm_medium", attribution.utmMedium);
    if (attribution.utmCampaign) u.searchParams.set("utm_campaign", attribution.utmCampaign);
    if (attribution.utmContent) u.searchParams.set("utm_content", attribution.utmContent);
    if (attribution.utmTerm) u.searchParams.set("utm_term", attribution.utmTerm);
    return u.pathname + u.search;
  } catch {
    return url;
  }
}

function whatsAppResultUrl(recommendation: AssessmentRecommendation): string {
  const text = `Hi RaveSoft! I just completed the AI Employee assessment and got recommended a ${recommendation.agentName}. I'd like to discuss next steps.`;
  return `https://wa.me/${COMPANY.whatsapp.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(text)}`;
}

interface ChoiceStepProps<T extends string> {
  title: string;
  options: ChoiceOption<T>[];
  value?: T;
  onChange: (value: T) => void;
}

function ChoiceStep<T extends string>({ title, options, value, onChange }: ChoiceStepProps<T>) {
  return (
    <div>
      <h3 className="text-xl font-bold text-gray-900 mb-5">{title}</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" role="radiogroup" aria-label={title}>
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={value === option.value}
            onClick={() => onChange(option.value)}
            className={cn(
              "min-h-[48px] text-left px-4 py-3 rounded-xl border font-medium text-[15px] transition-colors",
              value === option.value
                ? "border-blue-500 bg-blue-50 text-blue-900 ring-1 ring-blue-500"
                : "border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50/50 text-gray-800"
            )}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function AssessmentWidget({ id }: { id?: string }) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<PartialAnswers>({});
  const [contact, setContact] = useState<ContactFormState>(EMPTY_CONTACT);
  const [freeText, setFreeText] = useState("");
  const [consent, setConsent] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [recommendation, setRecommendation] = useState<AssessmentRecommendation | null>(null);
  const [attribution, setAttribution] = useState<Attribution | null>(null);
  const started = useRef(false);
  const submitted = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Restoring client-only persisted progress on mount — sessionStorage isn't
    // available during server rendering, so this can't move out of an effect.
    const saved = loadProgress();
    if (saved) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setStep(saved.step);
      setAnswers(saved.answers);
      setContact(saved.contact);
      setFreeText(saved.answers.successCriteria ?? "");
      if (Object.keys(saved.answers).length > 0) started.current = true;
    }
    setAttribution(captureAttribution());
  }, []);

  useEffect(() => {
    const progress: AssessmentProgress = { step, answers, contact };
    saveProgress(progress);
  }, [step, answers, contact]);

  // Report visibility so the sticky mobile CTA can hide while this is on screen.
  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      ([entry]) => dispatchAssessmentInView(entry.isIntersecting),
      { threshold: 0.2 }
    );
    observer.observe(el);
    return () => {
      observer.disconnect();
      dispatchAssessmentInView(false);
    };
  }, []);

  // Best-effort "abandoned" signal — fires once if the visitor leaves after
  // starting but before submitting.
  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden" && started.current && !submitted.current) {
        trackEvent("ai_employee_assessment_abandoned", { step: step + 1 });
      }
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
  }, [step]);

  const markStarted = () => {
    if (!started.current) {
      started.current = true;
      trackEvent("ai_employee_assessment_started", {});
    }
  };

  const scrollToTop = () => {
    containerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const setAnswer = <K extends keyof AssessmentAnswers>(key: K, value: AssessmentAnswers[K]) => {
    markStarted();
    setAnswers((prev) => ({ ...prev, [key]: value }));
  };

  const goNext = () => {
    trackEvent("ai_employee_assessment_step_completed", { step: step + 1 });
    const nextStep = step + 1;
    setStep(nextStep);
    if (nextStep === STEP_COUNT) {
      trackEvent("ai_employee_lead_form_viewed", {});
      trackEvent("ai_employee_contact_step_reached", {});
    }
    scrollToTop();
  };

  const goBack = () => {
    setStep((s) => Math.max(0, s - 1));
    scrollToTop();
  };

  const currentKey = STEP_KEYS[step];
  const canContinue = step < STEP_KEYS.length ? Boolean(answers[currentKey]) : true;

  const validateContact = (): boolean => {
    const next: Record<string, string> = {};
    if (!contact.fullName.trim()) next.fullName = "Enter your full name.";
    if (!contact.businessName.trim()) next.businessName = "Enter your business name.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.workEmail)) next.workEmail = "Enter a valid email address.";
    if (!/^\d{6,12}$/.test(contact.whatsappLocal.replace(/\s+/g, ""))) {
      next.whatsappLocal = "Enter a valid WhatsApp number.";
    }
    if (!contact.country.trim()) next.country = "Select your country.";
    if (!consent) next.consent = "Please confirm you're okay being contacted about your AI Employee plan.";

    setErrors(next);
    if (Object.keys(next).length > 0) {
      trackEvent("ai_employee_lead_form_error", {});
    }
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateContact()) return;
    if (
      !answers.businessType ||
      !answers.mainProblem ||
      !answers.inquiryChannel ||
      !answers.inquiryVolume ||
      !answers.responseSpeed
    ) {
      setSubmitError("Please complete all assessment steps before submitting.");
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const currentAttribution = attribution ?? captureAttribution();
      const response = await fetch("/api/ai-employee/assessment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          answers: { ...answers, successCriteria: freeText } as AssessmentAnswers,
          contact: {
            fullName: contact.fullName.trim(),
            businessName: contact.businessName.trim(),
            workEmail: contact.workEmail.trim(),
            whatsapp: `${contact.dialCode}${contact.whatsappLocal.replace(/\s+/g, "")}`,
            country: contact.country,
          },
          attribution: currentAttribution,
          consent,
        }),
      });

      if (!response.ok) {
        throw new Error(`Request failed: ${response.status}`);
      }

      const data = await response.json();
      submitted.current = true;
      setRecommendation(data.recommendation as AssessmentRecommendation);
      trackEvent("ai_employee_assessment_submitted", {});
      trackEvent("ai_employee_lead_submitted", { lead_id: data.lead_id });
      trackEvent("ai_employee_recommendation_displayed", {});
      dispatchAssessmentCompleted();

      clearProgress();
      scrollToTop();
    } catch {
      setSubmitError("Something went wrong sending your assessment. Please try again, or message us on WhatsApp.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (recommendation) {
    return (
      <div id={id} ref={containerRef} className="bg-white rounded-2xl border border-gray-200 p-6 sm:p-8 scroll-mt-24">
        <div className="flex items-center gap-2 text-green-700 mb-4">
          <CheckCircle2 className="w-5 h-5" />
          <span className="font-semibold text-sm">Your personalized recommendation</span>
        </div>
        <h3 className="text-2xl font-black text-gray-900 mb-1">{recommendation.agentName}</h3>
        <span
          className={cn(
            "inline-block text-xs font-semibold px-2.5 py-1 rounded-full mb-6",
            recommendation.complexity === "Simple" && "bg-green-100 text-green-700",
            recommendation.complexity === "Moderate" && "bg-amber-100 text-amber-700",
            recommendation.complexity === "Advanced" && "bg-blue-100 text-blue-700"
          )}
        >
          {recommendation.complexity} implementation
        </span>

        <dl className="space-y-4 text-sm mb-8">
          <div>
            <dt className="text-gray-500 font-medium mb-0.5">Main business problem identified</dt>
            <dd className="text-gray-900">{recommendation.problemSolved}</dd>
          </div>
          <div>
            <dt className="text-gray-500 font-medium mb-0.5">First workflow to automate</dt>
            <dd className="text-gray-900">{recommendation.firstWorkflow}</dd>
          </div>
          <div>
            <dt className="text-gray-500 font-medium mb-0.5">Recommended channels</dt>
            <dd className="text-gray-900">{recommendation.recommendedChannels.join(", ")}</dd>
          </div>
          <div>
            <dt className="text-gray-500 font-medium mb-0.5">Human handoff</dt>
            <dd className="text-gray-900">{recommendation.humanHandoff}</dd>
          </div>
          <div>
            <dt className="text-gray-500 font-medium mb-0.5">Recommended next action</dt>
            <dd className="text-gray-900">{recommendation.nextStep}</dd>
          </div>
        </dl>

        <div className="flex flex-col sm:flex-row gap-3">
          <a
            href={withUtm("/book-consultation", attribution)}
            onClick={() => trackEvent("ai_employee_strategy_call_clicked", { location: "result" })}
            className="flex-1 min-h-[48px] flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-white font-bold text-sm transition-all"
            style={{ background: "linear-gradient(135deg, #F59E0B, #D97706)" }}
          >
            Book My Free Strategy Call
            <ArrowRight className="w-4 h-4" />
          </a>
          <a
            href={whatsAppResultUrl(recommendation)}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => trackEvent("ai_employee_whatsapp_clicked", { location: "result" })}
            className="flex-1 min-h-[48px] flex items-center justify-center gap-2 px-6 py-3 rounded-xl border border-gray-300 hover:border-green-400 hover:bg-green-50 text-gray-800 font-semibold text-sm transition-all"
          >
            Discuss This on WhatsApp
          </a>
        </div>
      </div>
    );
  }

  return (
    <div id={id} ref={containerRef} className="bg-white rounded-2xl border border-gray-200 p-6 sm:p-8 scroll-mt-24">
      {step < STEP_COUNT && (
        <div className="mb-6">
          <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
            <span>
              Step {step + 1} of {STEP_COUNT}
            </span>
            <span>Free assessment • No obligation</span>
          </div>
          <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
            <div
              className="h-full bg-blue-600 transition-all duration-300"
              style={{ width: `${((step + 1) / STEP_COUNT) * 100}%` }}
            />
          </div>
        </div>
      )}

      {step === 0 && (
        <ChoiceStep title="What type of business do you operate?" options={BUSINESS_TYPE_OPTIONS} value={answers.businessType} onChange={(v) => setAnswer("businessType", v)} />
      )}
      {step === 1 && (
        <ChoiceStep
          title="What is the biggest problem you want your AI Employee to solve?"
          options={MAIN_PROBLEM_OPTIONS}
          value={answers.mainProblem}
          onChange={(v) => setAnswer("mainProblem", v)}
        />
      )}
      {step === 2 && (
        <ChoiceStep
          title="Where do most of your customer inquiries come from?"
          options={INQUIRY_CHANNEL_OPTIONS}
          value={answers.inquiryChannel}
          onChange={(v) => setAnswer("inquiryChannel", v)}
        />
      )}
      {step === 3 && (
        <ChoiceStep
          title="Approximately how many inquiries or requests do you receive each month?"
          options={INQUIRY_VOLUME_OPTIONS}
          value={answers.inquiryVolume}
          onChange={(v) => setAnswer("inquiryVolume", v)}
        />
      )}
      {step === 4 && (
        <ChoiceStep
          title="How quickly does your team normally respond?"
          options={RESPONSE_SPEED_OPTIONS}
          value={answers.responseSpeed}
          onChange={(v) => setAnswer("responseSpeed", v)}
        />
      )}
      {step === 5 && (
        <div>
          <h3 className="text-xl font-bold text-gray-900 mb-5">
            What result would make this AI Employee valuable to your business?
          </h3>
          <label htmlFor="success-criteria" className="sr-only">
            What result would make this AI Employee valuable to your business?
          </label>
          <textarea
            id="success-criteria"
            value={freeText}
            onChange={(e) => {
              markStarted();
              setFreeText(e.target.value);
            }}
            rows={4}
            placeholder="Optional — tell us in your own words"
            className="w-full rounded-xl border border-gray-300 px-4 py-3 text-[15px] focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      )}

      {step < STEP_COUNT && (
        <div className="flex items-center justify-between mt-6">
          <button
            type="button"
            onClick={goBack}
            disabled={step === 0}
            className="min-h-[48px] inline-flex items-center gap-1.5 px-4 text-sm font-semibold text-gray-600 hover:text-gray-900 disabled:opacity-0 disabled:pointer-events-none transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <button
            type="button"
            onClick={goNext}
            disabled={step < STEP_KEYS.length && !canContinue}
            className="min-h-[48px] inline-flex items-center justify-center gap-2 px-8 py-3 rounded-xl text-white font-bold text-sm transition-all disabled:opacity-40"
            style={{ background: "linear-gradient(135deg, #F59E0B, #D97706)" }}
          >
            Continue
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {step === STEP_COUNT && (
        <form onSubmit={handleSubmit}>
          <div className="flex items-center justify-between text-xs text-gray-500 mb-4">
            <button type="button" onClick={goBack} className="inline-flex items-center gap-1.5 font-semibold text-gray-600 hover:text-gray-900">
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
            <span>Step 7 of 7</span>
          </div>

          <h3 className="text-xl font-bold text-gray-900 mb-2">Almost there</h3>
          <p className="text-sm text-gray-500 mb-6">
            Enter your details to receive your personalized AI Employee recommendation and implementation outline.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-1">
                Full name
              </label>
              <input
                id="fullName"
                type="text"
                value={contact.fullName}
                onChange={(e) => setContact((c) => ({ ...c, fullName: e.target.value }))}
                className="w-full min-h-[48px] rounded-xl border border-gray-300 px-4 text-[16px] focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {errors.fullName && <p className="text-red-600 text-xs mt-1">{errors.fullName}</p>}
            </div>
            <div>
              <label htmlFor="businessName" className="block text-sm font-medium text-gray-700 mb-1">
                Business name
              </label>
              <input
                id="businessName"
                type="text"
                value={contact.businessName}
                onChange={(e) => setContact((c) => ({ ...c, businessName: e.target.value }))}
                className="w-full min-h-[48px] rounded-xl border border-gray-300 px-4 text-[16px] focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {errors.businessName && <p className="text-red-600 text-xs mt-1">{errors.businessName}</p>}
            </div>
          </div>

          <div className="mb-4">
            <label htmlFor="workEmail" className="block text-sm font-medium text-gray-700 mb-1">
              Work email
            </label>
            <input
              id="workEmail"
              type="email"
              inputMode="email"
              autoComplete="email"
              value={contact.workEmail}
              onChange={(e) => setContact((c) => ({ ...c, workEmail: e.target.value }))}
              className="w-full min-h-[48px] rounded-xl border border-gray-300 px-4 text-[16px] focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {errors.workEmail && <p className="text-red-600 text-xs mt-1">{errors.workEmail}</p>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label htmlFor="whatsapp" className="block text-sm font-medium text-gray-700 mb-1">
                WhatsApp number
              </label>
              <div className="flex gap-2">
                <select
                  aria-label="Country dial code"
                  value={contact.dialCode}
                  onChange={(e) => setContact((c) => ({ ...c, dialCode: e.target.value }))}
                  className="min-h-[48px] rounded-xl border border-gray-300 px-2 text-[16px] focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {COUNTRIES.map((c) => (
                    <option key={c.name} value={c.dialCode}>
                      {c.dialCode}
                    </option>
                  ))}
                </select>
                <input
                  id="whatsapp"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel-national"
                  value={contact.whatsappLocal}
                  onChange={(e) => setContact((c) => ({ ...c, whatsappLocal: e.target.value }))}
                  className="flex-1 min-h-[48px] rounded-xl border border-gray-300 px-4 text-[16px] focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              {errors.whatsappLocal && <p className="text-red-600 text-xs mt-1">{errors.whatsappLocal}</p>}
            </div>
            <div>
              <label htmlFor="country" className="block text-sm font-medium text-gray-700 mb-1">
                Country
              </label>
              <select
                id="country"
                value={contact.country}
                onChange={(e) => setContact((c) => ({ ...c, country: e.target.value }))}
                className="w-full min-h-[48px] rounded-xl border border-gray-300 px-4 text-[16px] focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {COUNTRIES.map((c) => (
                  <option key={c.name} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
              {errors.country && <p className="text-red-600 text-xs mt-1">{errors.country}</p>}
            </div>
          </div>

          <label className="flex items-start gap-2.5 mb-2 cursor-pointer">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              className="mt-1 w-4 h-4 shrink-0"
            />
            <span className="text-xs text-gray-500 leading-relaxed">
              We will use your information to prepare your recommendation and contact you about your AI Employee
              plan by email or WhatsApp. We do not sell your information. See our{" "}
              <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                Privacy Policy
              </a>
              .
            </span>
          </label>
          {errors.consent && <p className="text-red-600 text-xs mb-4">{errors.consent}</p>}

          {submitError && <p className="text-red-600 text-sm mb-4 mt-2">{submitError}</p>}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full min-h-[48px] inline-flex items-center justify-center gap-2 px-8 py-3 rounded-xl text-white font-bold text-sm transition-all disabled:opacity-60 mt-4"
            style={{ background: "linear-gradient(135deg, #F59E0B, #D97706)" }}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Preparing your recommendation…
              </>
            ) : (
              <>
                Show My Recommendation
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      )}
    </div>
  );
}
