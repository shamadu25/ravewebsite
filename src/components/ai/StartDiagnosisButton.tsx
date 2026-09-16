"use client";

import { ArrowRight } from "lucide-react";
import { openChatWidget } from "@/lib/ai/openChat";
import { trackEvent } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface StartDiagnosisButtonProps {
  label?: string;
  initialMessage?: string;
  className?: string;
  variant?: "primary" | "outline";
}

const VARIANTS: Record<string, string> = {
  primary:
    "text-white font-bold shadow-[0_8px_32px_rgba(245,158,11,0.4)] hover:-translate-y-0.5 hover:shadow-[0_12px_40px_rgba(245,158,11,0.55)]",
  outline:
    "border border-white/30 hover:border-white/50 bg-white/5 hover:bg-white/10 text-white font-semibold",
};

/** Opens the site's existing AI chat agent (no separate onboarding system) with an
 * opening message tailored to the AI Employee landing page's CTA context. */
export default function StartDiagnosisButton({
  label = "Build My AI Employee",
  initialMessage = "I'd like to find out which AI Employee is right for my business.",
  className,
  variant = "primary",
}: StartDiagnosisButtonProps) {
  const handleClick = () => {
    trackEvent("ai_employee_diagnosis_started", {});
    openChatWidget({ initialMessage });
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        "inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl text-base transition-all",
        VARIANTS[variant],
        className
      )}
      style={
        variant === "primary"
          ? { background: "linear-gradient(135deg, #F59E0B, #D97706)" }
          : undefined
      }
    >
      {label}
      <ArrowRight className="w-4 h-4" />
    </button>
  );
}
