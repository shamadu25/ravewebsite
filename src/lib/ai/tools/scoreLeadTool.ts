import { scoreLead } from "@/lib/services/leadScoring";
import { Tool } from "./types";

export const ScoreLeadTool: Tool = {
  name: "ScoreLeadTool",

  async execute(input) {
    const leadId = input.lead_id;

    if (typeof leadId !== "number") {
      throw new Error("lead_id is required.");
    }

    const signals =
      typeof input.signals === "object" && input.signals !== null
        ? (input.signals as Record<string, boolean>)
        : {};

    const score = await scoreLead(leadId, signals);

    return { lead_id: leadId, total_score: score.totalScore, level: score.level };
  },
};
