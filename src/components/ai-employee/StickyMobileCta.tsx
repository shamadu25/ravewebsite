"use client";

import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";
import { trackEvent } from "@/lib/utils";
import { ASSESSMENT_COMPLETED_EVENT, ASSESSMENT_IN_VIEW_EVENT } from "@/lib/assessment/events";

/** Mobile-only sticky CTA bar. Hides while the assessment is in view (so it
 * never covers the form), and switches to "Book My Free Strategy Call" once
 * the assessment has been completed. */
export default function StickyMobileCta({ targetId }: { targetId: string }) {
  const [hidden, setHidden] = useState(false);
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    const onInView = (event: Event) => {
      const detail = (event as CustomEvent<{ inView: boolean }>).detail;
      setHidden(Boolean(detail?.inView));
    };
    const onCompleted = () => setCompleted(true);

    window.addEventListener(ASSESSMENT_IN_VIEW_EVENT, onInView);
    window.addEventListener(ASSESSMENT_COMPLETED_EVENT, onCompleted);
    return () => {
      window.removeEventListener(ASSESSMENT_IN_VIEW_EVENT, onInView);
      window.removeEventListener(ASSESSMENT_COMPLETED_EVENT, onCompleted);
    };
  }, []);

  const handleClick = () => {
    if (completed) {
      trackEvent("ai_employee_strategy_call_clicked", { location: "sticky_mobile" });
      window.location.href = "/book-consultation";
      return;
    }
    trackEvent("ai_employee_hero_cta_clicked", { location: "sticky_mobile" });
    document.getElementById(targetId)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  if (hidden) return null;

  return (
    <div className="sm:hidden fixed bottom-0 left-0 right-0 z-40 p-3 bg-white/95 backdrop-blur border-t border-gray-200">
      <button
        type="button"
        onClick={handleClick}
        className="w-full min-h-[48px] flex items-center justify-center gap-2 rounded-xl text-white font-bold text-[15px] transition-all"
        style={{ background: "linear-gradient(135deg, #F59E0B, #D97706)" }}
      >
        {completed ? "Book My Free Strategy Call" : "Find My AI Employee"}
        <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  );
}
