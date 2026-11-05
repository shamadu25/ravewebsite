import { api, jsonBody } from "@/lib/os/http";
import { NewSolutionSchema, createSolution } from "@/lib/ai-automation/admin";

export const POST = api("ai.write", async ({ request, caller }) => createSolution(await jsonBody(request, NewSolutionSchema), caller.name));
