import { z } from "zod";
import { growthApi } from "@/lib/growth/api";
import { jsonBody } from "@/lib/os/http";
import { rejectDraft } from "@/lib/growth/drafts";

export const POST = growthApi<{ id: string }>("approval.decide", async ({ request, caller, params }) => {
  const b = await jsonBody(request, z.object({ reason: z.string().min(2).max(300) }));
  await rejectDraft(Number(params.id), caller.name, b.reason);
  return { rejected: true };
});
