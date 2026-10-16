import { growthApi } from "@/lib/growth/api";
import { approveDraft } from "@/lib/growth/drafts";

export const POST = growthApi<{ id: string }>("approval.decide", async ({ caller, params }) => approveDraft(Number(params.id), caller.name));
