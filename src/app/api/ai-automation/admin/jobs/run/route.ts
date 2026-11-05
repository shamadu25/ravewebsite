import { api } from "@/lib/os/http";
import { aiAutomationTick } from "@/lib/ai-automation/handlers";

export const maxDuration = 60;
/** Run the queue now (also what the scheduler does). */
export const POST = api("ai.write", async () => aiAutomationTick(45_000));
