import { Tool } from "./types";
import { SearchKnowledgeTool } from "./searchKnowledgeTool";
import { CreateLeadTool } from "./createLeadTool";
import { ScoreLeadTool } from "./scoreLeadTool";
import { EscalateHumanTool } from "./escalateHumanTool";

export const TOOLS: Record<string, Tool> = {
  [SearchKnowledgeTool.name]: SearchKnowledgeTool,
  [CreateLeadTool.name]: CreateLeadTool,
  [ScoreLeadTool.name]: ScoreLeadTool,
  [EscalateHumanTool.name]: EscalateHumanTool,
};

export * from "./types";
