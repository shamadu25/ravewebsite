import { growthApi } from "@/lib/growth/api";
import { approveAndSendReplyDraft } from "@/lib/growth/agents/reply-agent";

export const POST = growthApi<{ id: string }>("approval.decide", async ({ caller, params }) => {
  const r = await approveAndSendReplyDraft(Number(params.id), caller.name);
  if (!r.ok) throw new Error(r.reason ?? "Not sent.");
  return r;
});
