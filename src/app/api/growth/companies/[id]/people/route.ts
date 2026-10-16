import { z } from "zod";
import { growthApi } from "@/lib/growth/api";
import { jsonBody } from "@/lib/os/http";
import { addPerson } from "@/lib/growth/enrich";

export const POST = growthApi<{ id: string }>("opportunity.write", async ({ request, caller, params }) => {
  const b = await jsonBody(request, z.object({ name: z.string().min(3), role: z.string().min(2), sourceUrl: z.string().url(), verified: z.boolean().optional() }));
  return addPerson({ companyId: Number(params.id), ...b, actor: caller.name });
});
