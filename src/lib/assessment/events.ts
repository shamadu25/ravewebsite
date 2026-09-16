// Lets sibling components (e.g. the sticky mobile CTA) react to assessment
// completion without lifting state up into the server-rendered page.
export const ASSESSMENT_COMPLETED_EVENT = "rave:ai-employee-assessment-completed";
export const ASSESSMENT_IN_VIEW_EVENT = "rave:ai-employee-assessment-in-view";

export function dispatchAssessmentCompleted(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(ASSESSMENT_COMPLETED_EVENT));
}

export function dispatchAssessmentInView(inView: boolean): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<{ inView: boolean }>(ASSESSMENT_IN_VIEW_EVENT, { detail: { inView } }));
}
