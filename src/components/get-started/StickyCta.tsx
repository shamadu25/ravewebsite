"use client";

import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";
import FormCta, { FORM_ID } from "./FormCta";

/**
 * Mobile-only bottom bar: appears once the visitor scrolls past the hero and the form is not on screen, so there is
 * always a one-tap route back to the form. It lifts the floating chat button (same CSS variable the chat widget
 * already honours) so the two never overlap.
 */
export default function StickyCta() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const form = document.getElementById(FORM_ID);
    if (!form) return;
    let formInView = false;
    let scrolled = false;
    const update = () => setVisible(scrolled && !formInView);
    const io = new IntersectionObserver(([entry]) => {
      formInView = entry.isIntersecting;
      update();
    }, { threshold: 0.15 });
    io.observe(form);
    const onScroll = () => {
      scrolled = window.scrollY > 480;
      update();
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      io.disconnect();
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (visible) root.style.setProperty("--fab-bottom-offset", "5.25rem");
    return () => {
      root.style.removeProperty("--fab-bottom-offset");
    };
  }, [visible]);

  if (!visible) return null;
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-[#070B19]/95 px-4 py-3 backdrop-blur md:hidden">
      <FormCta
        location="sticky_mobile"
        className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-[#FFB200] px-5 text-base font-bold text-[#070B19] focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
      >
        Get my free consultation
        <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </FormCta>
    </div>
  );
}
