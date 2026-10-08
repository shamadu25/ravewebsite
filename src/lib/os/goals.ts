export interface GoalConfig {
  annualRevenueTargetUsd: number;
  currency: "USD";
  targetType: "ARR" | "ANNUALIZED_REVENUE";
  mrrTargetUsd: number | null;
  customerTarget: number | null;
  avgRevenuePerCustomerUsd: number | null;
  grossMarginTarget: number | null;
  churnTargetMonthly: number | null;
  cacTargetUsd: number | null;
  pipelineTargetUsd: number | null;
  activationTarget: number | null;
  startDate: string;
  endDate: string;
  businessUnitTargetsUsd: Record<string, number>;
}

export function defaultGoal(now = new Date()): GoalConfig {
  const end = new Date(now);
  end.setUTCMonth(11, 31);
  return {
    annualRevenueTargetUsd: 500_000,
    currency: "USD",
    targetType: "ARR",
    mrrTargetUsd: null,
    customerTarget: null,
    avgRevenuePerCustomerUsd: null,
    grossMarginTarget: null,
    churnTargetMonthly: null,
    cacTargetUsd: null,
    pipelineTargetUsd: null,
    activationTarget: null,
    startDate: `${now.getUTCFullYear()}-01-01`,
    endDate: end.toISOString().slice(0, 10),
    businessUnitTargetsUsd: {},
  };
}

export interface GoalInputs {
  currentMrrUsd: number;
  /** MRR at the same point ~30 days earlier; null when history is too short to know. */
  mrrThirtyDaysAgoUsd: number | null;
  activeCustomers: number;
  openPipelineUsd: number;
  weightedPipelineUsd: number;
}

export interface GoalState {
  targetArrUsd: number;
  currentMrrUsd: number;
  currentArrUsd: number;
  remainingArrUsd: number;
  requiredAdditionalMrrUsd: number;
  monthsRemaining: number;
  requiredMonthlyNewMrrUsd: number | null;
  avgRevenuePerCustomerUsd: number | null;
  requiredCustomers: number | null;
  requiredPipelineUsd: number | null;
  monthlyGrowthRate: number | null;
  requiredMonthlyGrowthRate: number | null;
  projectedAchievementDate: string | null;
  progressPct: number;
  /** Explicit marker when a figure could not be derived from real data. */
  insufficientData: string[];
}

function monthsBetween(a: Date, b: Date): number {
  return Math.max(0, (b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24 * 30.4375));
}

/** Pure goal math. Never invents numbers: anything not derivable is null and listed in insufficientData. */
export function computeGoalState(goal: GoalConfig, inputs: GoalInputs, now = new Date()): GoalState {
  const insufficientData: string[] = [];
  const targetArrUsd = goal.annualRevenueTargetUsd;
  const currentArrUsd = inputs.currentMrrUsd * 12;
  const remainingArrUsd = Math.max(0, targetArrUsd - currentArrUsd);
  const requiredAdditionalMrrUsd = remainingArrUsd / 12;
  const monthsRemaining = monthsBetween(now, new Date(goal.endDate + "T23:59:59Z"));

  const requiredMonthlyNewMrrUsd = monthsRemaining > 0 ? requiredAdditionalMrrUsd / monthsRemaining : null;

  const arpc =
    goal.avgRevenuePerCustomerUsd ?? (inputs.activeCustomers > 0 ? (inputs.currentMrrUsd * 12) / inputs.activeCustomers : null);
  if (arpc === null) insufficientData.push("avgRevenuePerCustomer (no paying customers yet and none configured)");
  const requiredCustomers = arpc && arpc > 0 ? Math.ceil(targetArrUsd / arpc) : null;

  // Pipeline needed = remaining ARR / observed-or-assumed win rate. We only use a configured target; no invented win rate.
  const requiredPipelineUsd = goal.pipelineTargetUsd ?? null;
  if (requiredPipelineUsd === null) insufficientData.push("requiredPipeline (set a pipeline target or accumulate win-rate history)");

  let monthlyGrowthRate: number | null = null;
  if (inputs.mrrThirtyDaysAgoUsd && inputs.mrrThirtyDaysAgoUsd > 0) {
    monthlyGrowthRate = inputs.currentMrrUsd / inputs.mrrThirtyDaysAgoUsd - 1;
  } else {
    insufficientData.push("growthRate (needs >30 days of recurring revenue history)");
  }

  let requiredMonthlyGrowthRate: number | null = null;
  if (inputs.currentMrrUsd > 0 && monthsRemaining > 0) {
    const targetMrr = targetArrUsd / 12;
    requiredMonthlyGrowthRate = Math.pow(targetMrr / inputs.currentMrrUsd, 1 / monthsRemaining) - 1;
  }

  let projectedAchievementDate: string | null = null;
  if (currentArrUsd >= targetArrUsd) {
    projectedAchievementDate = now.toISOString().slice(0, 10);
  } else if (monthlyGrowthRate !== null && monthlyGrowthRate > 0 && inputs.currentMrrUsd > 0) {
    const months = Math.log(targetArrUsd / 12 / inputs.currentMrrUsd) / Math.log(1 + monthlyGrowthRate);
    if (Number.isFinite(months) && months < 600) {
      const d = new Date(now);
      d.setUTCDate(d.getUTCDate() + Math.ceil(months * 30.4375));
      projectedAchievementDate = d.toISOString().slice(0, 10);
    }
  }
  if (projectedAchievementDate === null && currentArrUsd < targetArrUsd) {
    insufficientData.push("projectedAchievementDate (growth is flat, negative or unmeasured)");
  }

  return {
    targetArrUsd,
    currentMrrUsd: inputs.currentMrrUsd,
    currentArrUsd,
    remainingArrUsd,
    requiredAdditionalMrrUsd,
    monthsRemaining,
    requiredMonthlyNewMrrUsd,
    avgRevenuePerCustomerUsd: arpc,
    requiredCustomers,
    requiredPipelineUsd,
    monthlyGrowthRate,
    requiredMonthlyGrowthRate,
    projectedAchievementDate,
    progressPct: targetArrUsd > 0 ? Math.min(100, (currentArrUsd / targetArrUsd) * 100) : 0,
    insufficientData,
  };
}
