/** Config-driven assessment validation. Server-side source of truth: the client form is only a convenience. */
import type { Question } from "./types";

export type AnswerValue = string | string[] | boolean;
export type Answers = Record<string, AnswerValue | undefined>;

/** A question is visible when it has no showIf, or the controlling answer (string or any element of an array) is in `showIf.in`. */
export function isVisible(q: Question, answers: Answers): boolean {
  if (!q.showIf) return true;
  const v = answers[q.showIf.key];
  if (Array.isArray(v)) return v.some((x) => q.showIf!.in.includes(x));
  if (typeof v === "string") return q.showIf.in.includes(v);
  return false;
}

export const visibleQuestions = (questions: Question[], answers: Answers) => questions.filter((q) => isVisible(q, answers));

/** Strip control characters and HTML tags from free text. Output is also always escaped where rendered (React / email / PDF). */
export function cleanText(v: string): string {
  return v.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").replace(/<[^>]*>/g, "").replace(/[ \t]+/g, " ").trim();
}

const EMAIL = /^[^\s@<>"']+@[^\s@<>"']+\.[^\s@<>"']{2,}$/;
const TEL = /^\+?[0-9][0-9 ()\-]{5,24}$/;

export interface ValidationResult { ok: boolean; errors: Record<string, string>; answers: Record<string, AnswerValue> }

export function validateAnswers(questions: Question[], raw: unknown): ValidationResult {
  const input: Answers = raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as Answers) : {};
  const errors: Record<string, string> = {};
  const clean: Record<string, AnswerValue> = {};

  // Normalise first so conditional visibility is evaluated on cleaned answers.
  const normalised: Answers = {};
  for (const q of questions) {
    const v = input[q.key];
    if (v === undefined || v === null) continue;
    if (q.type === "boolean") normalised[q.key] = v === true;
    else if (q.type === "multiselect") normalised[q.key] = Array.isArray(v) ? v.filter((x): x is string => typeof x === "string").map((x) => x.trim()) : [];
    else if (typeof v === "string") normalised[q.key] = cleanText(v);
  }

  for (const q of questions) {
    if (!isVisible(q, normalised)) continue; // never force irrelevant questions
    const v = normalised[q.key];
    const empty = v === undefined || v === "" || (Array.isArray(v) && v.length === 0);

    if (q.type === "boolean") {
      if (q.required && v !== true) errors[q.key] = "This is required to continue.";
      clean[q.key] = v === true;
      continue;
    }
    if (empty) {
      if (q.required) errors[q.key] = "This field is required.";
      continue;
    }
    if (q.type === "multiselect") {
      const allowed = new Set((q.options ?? []).map((o) => o.value));
      const arr = v as string[];
      if (arr.some((x) => !allowed.has(x))) { errors[q.key] = "Please choose from the listed options."; continue; }
      clean[q.key] = [...new Set(arr)];
      continue;
    }
    const s = v as string;
    const max = q.maxLength ?? (q.type === "textarea" ? 1500 : 300);
    if (s.length > max) { errors[q.key] = `Please keep this under ${max} characters.`; continue; }
    switch (q.type) {
      case "select":
        if (!(q.options ?? []).some((o) => o.value === s)) { errors[q.key] = "Please choose one of the listed options."; continue; }
        break;
      case "email":
        if (!EMAIL.test(s)) { errors[q.key] = "Enter a valid email address."; continue; }
        break;
      case "tel":
        if (!TEL.test(s)) { errors[q.key] = "Enter a valid phone number, e.g. +233 24 000 0000."; continue; }
        break;
      case "url":
        try { const u = new URL(s.startsWith("http") ? s : `https://${s}`); if (!["http:", "https:"].includes(u.protocol) || !u.hostname.includes(".")) throw new Error(); clean[q.key] = u.toString(); continue; }
        catch { errors[q.key] = "Enter a valid website address."; continue; }
      case "number":
        if (!Number.isFinite(Number(s))) { errors[q.key] = "Enter a number."; continue; }
        break;
    }
    clean[q.key] = q.type === "email" ? s.toLowerCase() : s;
  }
  return { ok: Object.keys(errors).length === 0, errors, answers: clean };
}

/** Stage of the first invalid question (used to jump the user back on a server-side failure). */
export function firstInvalidStage(questions: Question[], errors: Record<string, string>): number | null {
  const q = questions.find((x) => errors[x.key]);
  return q ? q.stage : null;
}

/** Validate only one stage (for the step-by-step Next button). */
export function validateStage(questions: Question[], stage: number, answers: Answers): ValidationResult {
  const res = validateAnswers(questions, answers);
  const keys = new Set(questions.filter((q) => q.stage === stage).map((q) => q.key));
  const errors = Object.fromEntries(Object.entries(res.errors).filter(([k]) => keys.has(k)));
  return { ok: Object.keys(errors).length === 0, errors, answers: res.answers };
}
