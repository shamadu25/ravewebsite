import { z } from "zod";
import { api, jsonBody } from "@/lib/os/http";
import { regenerateAnalysis, requestMoreInfo } from "@/lib/ai-automation/admin";

const Body = z.discriminatedUnion("action", [z.object({ action: z.literal("regenerate") }), z.object({ action: z.literal("request_info"), message: z.string().min(10).max(2000) })]);

export const POST = api<{ id: string }>("ai.write", async ({ request, caller, params }) => {
  const b = await jsonBody(request, Body);
  const id = Number(params.id);
  if (b.action === "regenerate") await regenerateAnalysis(id, caller.name);
  else await requestMoreInfo(id, b.message, caller.name);
  return { done: true };
});
