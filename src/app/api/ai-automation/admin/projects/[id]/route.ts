import { api } from "@/lib/os/http";
import { enqueueJob } from "@/lib/ai-automation/jobs";
import { aiAutomationTick } from "@/lib/ai-automation/handlers";

export const maxDuration = 60;

/** Ask the selected deployment provider to provision. With no verified provider this records a manual hand-off — it never fakes a deployment. */
export const POST = api<{ id: string }>("ai.write", async ({ params }) => {
  const id = Number(params.id);
  await enqueueJob({ type: "PROVISION", key: `provision:${id}:${Date.now()}`, payload: { projectId: id } });
  return { queued: true, tick: await aiAutomationTick(20_000) };
});
