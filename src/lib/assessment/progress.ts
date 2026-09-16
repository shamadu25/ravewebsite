import { AssessmentAnswers } from "./types";

export interface ContactFormState {
  fullName: string;
  businessName: string;
  workEmail: string;
  dialCode: string;
  whatsappLocal: string;
  country: string;
}

export interface AssessmentProgress {
  step: number;
  answers: Partial<AssessmentAnswers>;
  contact: ContactFormState;
}

export const STORAGE_KEY = "rave_ai_employee_assessment_progress";

export function loadProgress(): AssessmentProgress | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as AssessmentProgress) : null;
  } catch {
    return null;
  }
}

export function saveProgress(progress: AssessmentProgress): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch {
    // ignore — best-effort persistence only
  }
}

export function clearProgress(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

/** Used by AI Employee cards to preselect a problem before the visitor reaches
 * that assessment step — merges into whatever progress already exists. */
export function presetMainProblem(mainProblem: string): void {
  const existing = loadProgress();
  const next: AssessmentProgress = existing ?? {
    step: 0,
    answers: {},
    contact: { fullName: "", businessName: "", workEmail: "", dialCode: "+233", whatsappLocal: "", country: "Ghana" },
  };
  next.answers = { ...next.answers, mainProblem: mainProblem as AssessmentAnswers["mainProblem"] };
  saveProgress(next);
}
