import { api, jsonBody } from "@/lib/os/http";
import { can } from "@/lib/os/rbac";
import { COMMERCIAL_FIELDS, SolutionUpdateSchema, updateSolution } from "@/lib/ai-automation/admin";

export const PUT = api<{ key: string }>("ai.write", async ({ request, caller, params }) => {
  const body = await jsonBody(request, SolutionUpdateSchema);
  // Prices, hours and delivery estimates are commercial decisions: they need the pricing permission.
  if (COMMERCIAL_FIELDS.some((f) => body[f] !== undefined) && !can(caller.role, "ai.pricing")) throw new Error("Permission denied: changing prices, hours or delivery estimates needs the pricing permission.");
  await updateSolution(params.key, body, caller.name);
  return { saved: true };
});
