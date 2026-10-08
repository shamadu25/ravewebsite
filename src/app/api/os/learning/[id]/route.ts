import { z } from "zod";
import { api, jsonBody } from "@/lib/os/http";
import { decideLearning } from "@/lib/os/learning";

export const POST = api<{ id: string }>("agent.configure", async ({ request, caller, params }) => {
  const { accept } = await jsonBody(request, z.object({ accept: z.boolean() }));
  await decideLearning(Number(params.id), accept, caller.name);
  return { ok: true };
});
