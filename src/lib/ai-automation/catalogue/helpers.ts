import type { Question, QuestionOption } from "../types";

export const slugify = (s: string) =>
  s.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 60);

/** ["A", "B"] → [{value:"a", label:"A"}, ...] */
export const opts = (labels: string[]): QuestionOption[] => labels.map((label) => ({ value: slugify(label), label }));

export const sel = (key: string, label: string, labels: string[], o: Partial<Question> = {}): Question => ({
  key, stage: 2, label, type: "select", required: false, options: opts(labels), ...o,
});
export const multi = (key: string, label: string, labels: string[], o: Partial<Question> = {}): Question => ({
  key, stage: 2, label, type: "multiselect", required: false, options: opts(labels), ...o,
});
export const text = (key: string, label: string, o: Partial<Question> = {}): Question => ({
  key, stage: 2, label, type: "text", required: false, maxLength: 300, ...o,
});
export const area = (key: string, label: string, o: Partial<Question> = {}): Question => ({
  key, stage: 2, label, type: "textarea", required: false, maxLength: 1500, ...o,
});
