"use client";

import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";
import { cn, trackEvent } from "@/lib/utils";
import { ASSESSMENT_COMPLETED_EVENT } from "@/lib/assessment/events";
import { presetMainProblem } from "@/lib/assessment/progress";

interface AssessmentPrimaryCtaProps {
  className?: string;
  variant?: "primary" | "outline";
  location: string;
  /** When set (e.g. from an AI Employee card), preselects that problem in the assessment. */
  presetProblem?: string;
}

const VARIANTS: Record<string, string> = {
  primary:
    "text-white font-bold shadow-[0_8px_32px_rgba(245,158,11,0.4)] hover:-translate-y-0.5 hover:shadow-[0_12px_40px_rgba(245,158,11,0.55)]",
  outline: "border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 font-semibold",
};

/** The site's single standardized primary CTA ("Find My AI Employee"). Scrolls to
 * the embedded assessment; once the assessment is completed anywhere on the page,
 * every instance of this button switches to "Book My Free Strategy Call". */
export default function AssessmentPrimaryCta({
  className,
  variant = "primary",
  location,
  presetProblem,
}: AssessmentPrimaryCtaProps) {
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    const onCompleted = () => setCompleted(true);
    window.addEventListener(ASSESSMENT_COMPLETED_EVENT, onCompleted);
    return () => window.removeEventListener(ASSESSMENT_COMPLETED_EVENT, onCompleted);
  }, []);

  const handleClick = () => {
    if (completed) {
      trackEvent("ai_employee_strategy_call_clicked", { location });
      window.location.href = "/book-consultation";
      return;
    }

    trackEvent("ai_employee_hero_cta_clicked", { location });
    if (presetProblem) {
      presetMainProblem(presetProblem);
      trackEvent("ai_employee_type_selected", { problem: presetProblem, location });
    }
    document.getElementById("assessment")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        "min-h-[48px] inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl text-base transition-all",
        VARIANTS[variant],
        className
      )}
      style={variant === "primary" ? { background: "linear-gradient(135deg, #F59E0B, #D97706)" } : undefined}
    >
      {completed ? "Book My Free Strategy Call" : "Find My AI Employee"}
      <ArrowRight className="w-4 h-4" />
    </button>
  );
}
