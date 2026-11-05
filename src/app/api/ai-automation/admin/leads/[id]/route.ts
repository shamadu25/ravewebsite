import { api, jsonBody } from "@/lib/os/http";
import { can } from "@/lib/os/rbac";
import { LeadActionSchema, leadAction } from "@/lib/ai-automation/admin";

export const POST = api<{ id: string }>("ai.write", async ({ request, caller, params }) => {
  const body = await jsonBody(request, LeadActionSchema);
  if (body.action === "anonymise" && !can(caller.role, "ai.settings")) throw new Error("Permission denied: erasing customer data needs an administrator.");
  await leadAction(Number(params.id), body, caller.name);
  return { done: true };
});
