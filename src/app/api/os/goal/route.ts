import { z } from "zod";
import { api, jsonBody } from "@/lib/os/http";
import { getGoalState, saveGoal, getGoal } from "@/lib/os/metrics";
import { audit } from "@/lib/os/audit";

export const GET = api("os.read", async () => getGoalState());

const nullableNum = z.number().nonnegative().nullable();
const GoalSchema = z.object({
  annualRevenueTargetUsd: z.number().positive(),
  mrrTargetUsd: nullableNum.optional(), customerTarget: nullableNum.optional(), avgRevenuePerCustomerUsd: nullableNum.optional(),
  grossMarginTarget: nullableNum.optional(), churnTargetMonthly: nullableNum.optional(), cacTargetUsd: nullableNum.optional(),
  pipelineTargetUsd: nullableNum.optional(), activationTarget: nullableNum.optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(), endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  businessUnitTargetsUsd: z.record(z.string(), z.number().nonnegative()).optional(),
});

export const PUT = api("goal.write", async ({ request, caller }) => {
  const patch = await jsonBody(request, GoalSchema);
  const before = await getGoal();
  const next = { ...before, ...patch };
  await saveGoal(next);
  await audit({ actor: caller.name, actorType: "HUMAN", action: "goal.update", resource: "goal", input: patch, output: { before: before.annualRevenueTargetUsd }, ip: caller.ip });
  return next;
});
