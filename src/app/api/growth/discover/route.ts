import { z } from "zod";
import { growthApi } from "@/lib/growth/api";
import { jsonBody } from "@/lib/os/http";
import { runDiscovery } from "@/lib/growth/discovery";

export const maxDuration = 60;
export const POST = growthApi("opportunity.write", async ({ request }) => {
  const b = await jsonBody(request, z.object({ area: z.string().min(2).max(80), profileKey: z.string().optional(), limit: z.number().int().min(1).max(50).optional() }));
const r = await runDiscovery(b);
  const counts = r.results.reduce<Record<string, number>>((m, x) => ({ ...m, [x.outcome]: (m[x.outcome] ?? 0) + 1 }), {});
  return { ...r, message: r.errors.length ? r.errors.join("; ") : `Researched ${r.results.length}: ${Object.entries(counts).map(([k, v]) => `${v} ${k}`).join(", ") || "nothing new"}.` };
});
