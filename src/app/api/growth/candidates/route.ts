import { z } from "zod";
import { growthApi } from "@/lib/growth/api";
import { getProfile, ingestCandidate } from "@/lib/growth/discovery";

/** Manual / CSV-sourced candidates go through the same research + scoring pipeline as discovered ones. */
export const POST = growthApi("opportunity.write", async ({ request }) => {
  const one = z.object({ name: z.string().min(1), website: z.string().min(3), phone: z.string().optional(), category: z.string().optional() });
  const raw = await request.json().catch(() => ({}));
  const b = z.object({ profileKey: z.string().optional(), candidates: z.array(one).min(1).max(25) }).parse("candidates" in raw ? raw : { profileKey: raw.profileKey, candidates: [raw] });
  const profile = await getProfile(b.profileKey);
  const results = [];
  for (const c of b.candidates) results.push(await ingestCandidate({ ...c, source: "manual" }, profile));
  return { results, message: results.map((r) => `${r.outcome}: ${r.reason}`).join(" | ") };
});
