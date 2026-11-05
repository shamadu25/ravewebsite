import { api } from "@/lib/os/http";
import { retryJob } from "@/lib/ai-automation/jobs";
import { aiAutomationTick } from "@/lib/ai-automation/handlers";

export const maxDuration = 60;
export const POST = api<{ id: string }>("ai.write", async ({ params }) => { await retryJob(Number(params.id)); return { requeued: true, tick: await aiAutomationTick(25_000) }; });
