import { z } from "zod";
import { api, jsonBody } from "@/lib/os/http";
import { decideApproval } from "@/lib/os/approvals";

export const POST = api<{ id: string }>("approval.decide", async ({ request, caller, params }) => {
  const b = await jsonBody(request, z.object({
    decision: z.enum(["APPROVE", "REJECT", "MODIFY", "DELEGATE", "REQUEST_INFO"]), note: z.string().max(1000).optional(),
    modifiedAction: z.record(z.string(), z.unknown()).optional(),
  }));
  return decideApproval({ id: Number(params.id), decision: b.decision, actor: caller.name, role: caller.role, note: b.note, modifiedAction: b.modifiedAction, ip: caller.ip });
});
