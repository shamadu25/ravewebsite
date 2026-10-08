import { z } from "zod";
import { api, jsonBody } from "@/lib/os/http";
import { askCommander } from "@/lib/os/commander";

export const maxDuration = 60;

export const POST = api("commander.command", async ({ request, caller }) => {
  const { question } = await jsonBody(request, z.object({ question: z.string().min(2).max(1000) }));
  return askCommander(question, { name: caller.name, role: caller.role });
});
