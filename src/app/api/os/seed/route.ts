import { api, jsonBody } from "@/lib/os/http";
import { z } from "zod";
import { seedDemoData, seedOperatingSystem } from "@/lib/os/agents/seed";

export const POST = api("agent.configure", async ({ request }) => {
  const { demo } = await jsonBody(request, z.object({ demo: z.boolean().optional() }));
  const base = await seedOperatingSystem();
  const demoResult = demo ? await seedDemoData() : null;
  return { ...base, demo: demoResult };
});
