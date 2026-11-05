import { api, jsonBody } from "@/lib/os/http";
import { IndustryUpdateSchema, updateIndustry } from "@/lib/ai-automation/admin";

export const PUT = api<{ slug: string }>("ai.write", async ({ request, caller, params }) => { await updateIndustry(params.slug, await jsonBody(request, IndustryUpdateSchema), caller.name); return { saved: true }; });
