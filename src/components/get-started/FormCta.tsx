"use client";

import type { ReactNode } from "react";
import { trackEvent } from "@/lib/utils";

export const SELECT_EVENT = "getstarted:select";
export const FORM_ID = "lead-form";

/** Scrolls to the one lead form, optionally preselecting a solution, and moves keyboard focus there. */
export function goToForm(solution?: string) {
  if (solution) {
    window.dispatchEvent(new CustomEvent(SELECT_EVENT, { detail: { solution } }));
    try {
      const url = new URL(window.location.href);
      url.searchParams.set("solution", solution);
      window.history.replaceState(null, "", url.toString());
    } catch {
      /* non-critical */
    }
  }
  const el = document.getElementById(FORM_ID);
  if (!el) return;
  const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  el.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
  window.setTimeout(() => document.getElementById("lead-fullName")?.focus({ preventScroll: true }), reduce ? 0 : 450);
}

/**
 * Every call-to-action on the page is one of these: a real link to #lead-form (works without JavaScript) that,
 * with JavaScript, preselects the solution, scrolls smoothly and focuses the first field.
 */
export default function FormCta({
  solution,
  location,
  className,
  children,
  ariaLabel,
}: {
  solution?: string;
  location: string;
  className?: string;
  children: ReactNode;
  ariaLabel?: string;
}) {
  return (
    <a
      href={`#${FORM_ID}`}
      aria-label={ariaLabel}
      className={className}
      onClick={(e) => {
        e.preventDefault();
        trackEvent("consultation_cta_click", { location, solution: solution ?? "none" });
        goToForm(solution);
      }}
    >
      {children}
    </a>
  );
}
