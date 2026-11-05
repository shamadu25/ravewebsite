import { api, jsonBody } from "@/lib/os/http";
import { NewIndustrySchema, createIndustry } from "@/lib/ai-automation/admin";

export const POST = api("ai.write", async ({ request, caller }) => createIndustry(await jsonBody(request, NewIndustrySchema), caller.name));
