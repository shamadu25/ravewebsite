/** Follow-up scheduling and stop rules (pure). Never assumes a customer has not replied: the 'replied' state is manual. */
export interface FollowupStep { delayDays: number; templateKey: string; label?: string }
export interface FollowupConfig { steps: FollowupStep[]; maxAttempts: number; stopConditions: StopCondition[] }
export const STOP_CONDITIONS = ["OPT_OUT", "DECLINED", "ACCEPTED", "EXPIRED", "ADMIN_STOPPED", "CUSTOMER_REPLIED"] as const;
export type StopCondition = (typeof STOP_CONDITIONS)[number];

export const DEFAULT_FOLLOWUP: FollowupConfig = {
  steps: [
    { delayDays: 2, templateKey: "followup_check_in", label: "Day 2 — check whether the proposal was reviewed" },
    { delayDays: 5, templateKey: "followup_benefits", label: "Day 5 — share relevant benefits" },
    { delayDays: 10, templateKey: "followup_invite", label: "Day 10 — invite to discuss implementation" },
  ],
  maxAttempts: 3,
  stopConditions: ["OPT_OUT", "DECLINED", "ACCEPTED", "EXPIRED", "ADMIN_STOPPED", "CUSTOMER_REPLIED"],
};

export interface FollowupState {
  proposalStatus: string;
  sentAt: Date | null;
  validUntil: Date | null;
  emailOptOut: boolean;
  followupsStopped: boolean;
  /** Set manually by staff (reply detection is not available). */
  customerReplied: boolean;
  attemptsSent: number;
  stepsDone: number[];
}

export function stopReason(s: FollowupState, cfg: FollowupConfig, now: Date): StopCondition | null {
  const on = (c: StopCondition) => cfg.stopConditions.includes(c);
  if (s.emailOptOut) return "OPT_OUT"; // opt-out always stops, regardless of config
  if (on("DECLINED") && s.proposalStatus === "DECLINED") return "DECLINED";
  if (on("ACCEPTED") && s.proposalStatus === "ACCEPTED") return "ACCEPTED";
  if (on("EXPIRED") && (s.proposalStatus === "EXPIRED" || (s.validUntil && s.validUntil.getTime() < now.getTime()))) return "EXPIRED";
  if (on("ADMIN_STOPPED") && s.followupsStopped) return "ADMIN_STOPPED";
  if (on("CUSTOMER_REPLIED") && s.customerReplied) return "CUSTOMER_REPLIED";
  if (!["SENT"].includes(s.proposalStatus)) return "ADMIN_STOPPED"; // only SENT proposals are followed up (e.g. REJECTED/DRAFT never)
  return null;
}

export interface NextFollowup { stepIndex: number; step: FollowupStep; dueAt: Date }

export function nextFollowup(s: FollowupState, cfg: FollowupConfig, now: Date): { due: NextFollowup | null; stop: StopCondition | null } {
  const stop = stopReason(s, cfg, now);
  if (stop) return { due: null, stop };
  if (!s.sentAt) return { due: null, stop: null };
  if (s.attemptsSent >= cfg.maxAttempts) return { due: null, stop: null };
  const idx = cfg.steps.findIndex((_, i) => !s.stepsDone.includes(i));
  if (idx === -1) return { due: null, stop: null };
  const step = cfg.steps[idx];
  const dueAt = new Date(s.sentAt.getTime() + step.delayDays * 86_400_000);
  return { due: dueAt.getTime() <= now.getTime() ? { stepIndex: idx, step, dueAt } : null, stop: null };
}
