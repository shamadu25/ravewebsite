"use client";

import { ArrowRight } from "lucide-react";
import { trackEvent } from "@/lib/utils";

/** Mobile-only sticky CTA bar. Sits below the floating WhatsApp/chat buttons
 * (see FabOffsetController, which pushes those buttons up to make room). */
export default function StickyMobileCta({ targetId }: { targetId: string }) {
  const handleClick = () => {
    trackEvent("ai_employee_hero_cta_clicked", { location: "sticky_mobile" });
    document.getElementById(targetId)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="sm:hidden fixed bottom-0 left-0 right-0 z-40 p-3 bg-white/95 backdrop-blur border-t border-gray-200">
      <button
        type="button"
        onClick={handleClick}
        className="w-full min-h-[48px] flex items-center justify-center gap-2 rounded-xl text-white font-bold text-[15px] transition-all"
        style={{ background: "linear-gradient(135deg, #F59E0B, #D97706)" }}
      >
        Find My AI Employee
        <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  );
}
