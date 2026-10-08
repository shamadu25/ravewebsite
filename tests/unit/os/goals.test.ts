/** @jest-environment node */
import { computeGoalState, defaultGoal } from "@/lib/os/goals";

const now = new Date("2026-10-08T00:00:00Z");
const goal = { ...defaultGoal(now), endDate: "2026-12-31" };

describe("goal engine", () => {
  it("never invents figures when there is no revenue", () => {
    const s = computeGoalState(goal, { currentMrrUsd: 0, mrrThirtyDaysAgoUsd: null, activeCustomers: 0, openPipelineUsd: 0, weightedPipelineUsd: 0 }, now);
    expect(s.currentArrUsd).toBe(0);
    expect(s.remainingArrUsd).toBe(500_000);
    expect(s.monthlyGrowthRate).toBeNull();
    expect(s.projectedAchievementDate).toBeNull();
    expect(s.requiredCustomers).toBeNull();
    expect(s.insufficientData.length).toBeGreaterThan(0);
  });

  it("computes gap, required MRR and projection from real inputs", () => {
    const s = computeGoalState(goal, { currentMrrUsd: 10_000, mrrThirtyDaysAgoUsd: 8_000, activeCustomers: 40, openPipelineUsd: 0, weightedPipelineUsd: 0 }, now);
    expect(s.currentArrUsd).toBe(120_000);
    expect(s.remainingArrUsd).toBe(380_000);
    expect(s.monthlyGrowthRate).toBeCloseTo(0.25);
    expect(s.requiredAdditionalMrrUsd).toBeCloseTo(31_666.67, 1);
    expect(s.avgRevenuePerCustomerUsd).toBe(3000);
    expect(s.requiredCustomers).toBe(167);
    expect(s.projectedAchievementDate).not.toBeNull();
  });

  it("reports the target as reached", () => {
    const s = computeGoalState(goal, { currentMrrUsd: 50_000, mrrThirtyDaysAgoUsd: 40_000, activeCustomers: 10, openPipelineUsd: 0, weightedPipelineUsd: 0 }, now);
    expect(s.remainingArrUsd).toBe(0);
    expect(s.progressPct).toBe(100);
    expect(s.projectedAchievementDate).toBe("2026-10-08");
  });

  it("gives no projection for flat growth", () => {
    const s = computeGoalState(goal, { currentMrrUsd: 5_000, mrrThirtyDaysAgoUsd: 5_000, activeCustomers: 5, openPipelineUsd: 0, weightedPipelineUsd: 0 }, now);
    expect(s.projectedAchievementDate).toBeNull();
  });
});
