import type { SolutionRecord } from "../types";
import type { SolutionMatch } from "../matching";

export interface CandidateSolution {
  key: string; name: string; description: string; capabilities: string[]; integrations: string[]; problemsSolved: string[]; matchReasons: string[]; defaultComplexity: string;
}
/** Everything the consultant is allowed to see. Contains NO prices and NO internal pricing data. */
export interface AnalysisContext {
  industry: { slug: string; name: string };
  profile: Record<string, unknown>;      // customer-provided facts, human-readable
  responses: Array<{ question: string; answer: string }>;
  challenges: string[];
  automationAreas: string[];
  candidates: CandidateSolution[];
  /** Concatenated customer text, used to allow numbers the customer themselves supplied. */
  customerText: string;
}

export function toCandidate(m: SolutionMatch): CandidateSolution {
  const s: SolutionRecord = m.solution;
  return { key: s.key, name: s.name, description: s.description, capabilities: s.capabilities, integrations: s.integrations, problemsSolved: s.problemsSolved, matchReasons: m.reasons, defaultComplexity: s.defaultComplexity };
}
