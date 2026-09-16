"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRight, Loader2, CheckCircle2 } from "lucide-react";
import { COMPANY } from "@/lib/data";
import { cn, trackEvent } from "@/lib/utils";
import { AssessmentAnswers, AssessmentRecommendation } from "@/lib/assessment/types";
import { captureAttribution } from "@/lib/assessment/attribution";
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

interface ContactForm {
  fullName: string;
  businessName: string;
  workEmail: string;
  dialCode: string;
  whatsappLocal: string;
  country: string;
}

const STORAGE_KEY = "rave_ai_employee_assessment_progress";
const STEP_COUNT = 6;

const EMPTY_CONTACT: ContactForm = {
  fullName: "",
  businessName: "",
  workEmail: "",
  dialCode: "+233",
  whatsappLocal: "",
  country: "Ghana",
};

function loadProgress(): { step: number; answers: PartialAnswers; contact: ContactForm } | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveProgress(step: number, answers: PartialAnswers, contact: ContactForm): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ step, answers, contact }));
  } catch {
    // ignore — best-effort persistence only
  }
}

function whatsAppResultUrl(recommendation: AssessmentRecommendation): string {
  const text = `Hi RaveSoft! I just completed the AI Employee assessment and got recommended a ${recommendation.agentName}. I'd like to discuss next steps.`;
  return `https://wa.me/${COMPANY.whatsapp.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(text)}`;
}

interface ChoiceStepProps<T extends string> {
  title: string;
  options: ChoiceOption<T>[];
  onSelect: (value: T) => void;
}

function ChoiceStep<T extends string>({ title, options, onSelect }: ChoiceStepProps<T>) {
  return (
    <div>
      <h3 className="text-xl font-bold text-gray-900 mb-5">{title}</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onSelect(option.value)}
            className="min-h-[48px] text-left px-4 py-3 rounded-xl border border-gray-200 bg-white hover:border-blue-400 hover:bg-blue-50 text-gray-800 font-medium text-[15px] transition-colors"
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
  const [contact, setContact] = useState<ContactForm>(EMPTY_CONTACT);
  const [freeText, setFreeText] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [recommendation, setRecommendation] = useState<AssessmentRecommendation | null>(null);
  const started = useRef(false);
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
    }
  }, []);

  useEffect(() => {
    saveProgress(step, answers, contact);
  }, [step, answers, contact]);

  const markStarted = () => {
    if (!started.current) {
      started.current = true;
      trackEvent("ai_employee_assessment_started", {});
    }
  };

  const scrollToTop = () => {
    containerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const advance = <K extends keyof AssessmentAnswers>(key: K, value: AssessmentAnswers[K]) => {
    markStarted();
    setAnswers((prev) => ({ ...prev, [key]: value }));
    trackEvent("ai_employee_assessment_step_completed", { step: step + 1 });
    setStep((s) => s + 1);
    scrollToTop();
  };

  const handleFreeTextContinue = () => {
    markStarted();
    setAnswers((prev) => ({ ...prev, successCriteria: freeText }));
    trackEvent("ai_employee_assessment_step_completed", { step: 6 });
    trackEvent("ai_employee_lead_form_viewed", {});
    setStep(STEP_COUNT);
    scrollToTop();
  };

  const validateContact = (): boolean => {
    const next: Record<string, string> = {};
    if (!contact.fullName.trim()) next.fullName = "Enter your full name.";
    if (!contact.businessName.trim()) next.businessName = "Enter your business name.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.workEmail)) next.workEmail = "Enter a valid email address.";
    if (!/^\d{6,12}$/.test(contact.whatsappLocal.replace(/\s+/g, ""))) {
      next.whatsappLocal = "Enter a valid WhatsApp number.";
    }
    if (!contact.country.trim()) next.country = "Select your country.";

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
          attribution: captureAttribution(),
          consent: true,
        }),
      });

      if (!response.ok) {
        throw new Error(`Request failed: ${response.status}`);
      }

      const data = await response.json();
      setRecommendation(data.recommendation as AssessmentRecommendation);
      trackEvent("ai_employee_assessment_submitted", {});
      trackEvent("ai_employee_recommendation_displayed", {});

      try {
        window.sessionStorage.removeItem(STORAGE_KEY);
      } catch {
        // ignore
      }

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
            <dt className="text-gray-500 font-medium mb-0.5">The problem it solves</dt>
            <dd className="text-gray-900">{recommendation.problemSolved}</dd>
          </div>
          <div>
            <dt className="text-gray-500 font-medium mb-0.5">Suggested first workflow</dt>
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
            <dt className="text-gray-500 font-medium mb-0.5">Next step</dt>
            <dd className="text-gray-900">{recommendation.nextStep}</dd>
          </div>
        </dl>

        <div className="flex flex-col sm:flex-row gap-3">
          <a
            href="/book-consultation"
            onClick={() => trackEvent("ai_employee_calendar_opened", {})}
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
            <span>Free assessment · No obligation</span>
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
        <ChoiceStep
          title="What type of business do you operate?"
          options={BUSINESS_TYPE_OPTIONS}
          onSelect={(v) => advance("businessType", v)}
        />
      )}
      {step === 1 && (
        <ChoiceStep
          title="What is the biggest problem you want to solve?"
          options={MAIN_PROBLEM_OPTIONS}
          onSelect={(v) => advance("mainProblem", v)}
        />
      )}
      {step === 2 && (
        <ChoiceStep
          title="Where do most customer inquiries come from?"
          options={INQUIRY_CHANNEL_OPTIONS}
          onSelect={(v) => advance("inquiryChannel", v)}
        />
      )}
      {step === 3 && (
        <ChoiceStep
          title="Approximately how many inquiries do you receive?"
          options={INQUIRY_VOLUME_OPTIONS}
          onSelect={(v) => advance("inquiryVolume", v)}
        />
      )}
      {step === 4 && (
        <ChoiceStep
          title="How quickly does your team normally respond?"
          options={RESPONSE_SPEED_OPTIONS}
          onSelect={(v) => advance("responseSpeed", v)}
        />
      )}
      {step === 5 && (
        <div>
          <h3 className="text-xl font-bold text-gray-900 mb-5">What would make this project successful?</h3>
          <label htmlFor="success-criteria" className="sr-only">
            What would make this project successful?
          </label>
          <textarea
            id="success-criteria"
            value={freeText}
            onChange={(e) => setFreeText(e.target.value)}
            rows={4}
            placeholder="Optional — tell us in your own words"
            className="w-full rounded-xl border border-gray-300 px-4 py-3 text-[15px] focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
          />
          <button
            type="button"
            onClick={handleFreeTextContinue}
            className="w-full sm:w-auto min-h-[48px] inline-flex items-center justify-center gap-2 px-8 py-3 rounded-xl text-white font-bold text-sm transition-all"
            style={{ background: "linear-gradient(135deg, #F59E0B, #D97706)" }}
          >
            Continue
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {step === STEP_COUNT && (
        <form onSubmit={handleSubmit}>
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

          {submitError && <p className="text-red-600 text-sm mb-4">{submitError}</p>}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full min-h-[48px] inline-flex items-center justify-center gap-2 px-8 py-3 rounded-xl text-white font-bold text-sm transition-all disabled:opacity-60"
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
