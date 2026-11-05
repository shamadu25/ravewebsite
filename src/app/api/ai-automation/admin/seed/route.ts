import { api } from "@/lib/os/http";
import { seedAiAutomation } from "@/lib/ai-automation/seed";

/** Create any missing industries/solutions/mappings/baseline rules. Never overwrites admin edits. */
export const POST = api("ai.settings", async () => seedAiAutomation());
