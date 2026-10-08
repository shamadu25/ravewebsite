import { after } from "next/server";
import { z } from "zod";
import { api, jsonBody } from "@/lib/os/http";
import { runHeartbeats, runOperatingLoop } from "@/lib/os/commander";
import { processQueue } from "@/lib/os/runtime";

export const maxDuration = 60;

export const POST = api("commander.run", async ({ request }) => {
  const { job } = await jsonBody(request, z.object({ job: z.enum(["operating-loop", "process-queue", "tick"]) }));
  if (job === "process-queue") return { queue: await processQueue({ budgetMs: 45_000 }) };
  const loop = await runOperatingLoop();
  const heartbeats = job === "tick" ? await runHeartbeats() : [];
  after(() => processQueue({ budgetMs: 40_000 }).catch((e) => console.error("[os.run] queue", e)));
  return { loop, heartbeats, note: "Queue is processing in the background." };
});
