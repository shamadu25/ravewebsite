import { z } from "zod";
import { growthApi } from "@/lib/growth/api";
import { jsonBody } from "@/lib/os/http";
import { rejectReplyDraft } from "@/lib/growth/agents/reply-agent";

export const POST = growthApi<{ id: string }>("approval.decide", async ({ request, caller, params }) => {
  const b = await jsonBody(request, z.object({ reason: z.string().max(300).default("Rejected by reviewer") }));
  await rejectReplyDraft(Number(params.id), caller.name, b.reason);
  return { ok: true };
});
