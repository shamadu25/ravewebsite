import { z } from "zod";
import { api, jsonBody } from "@/lib/os/http";
import { setAutoFollowups } from "@/lib/os/outreach";
import { audit } from "@/lib/os/audit";

export const POST = api("goal.write", async ({ request, caller }) => {
  const b = await jsonBody(request, z.object({ autoFollowups: z.boolean() }));
  await setAutoFollowups(b.autoFollowups);
  await audit({ actor: caller.name, actorType: "HUMAN", action: "settings.auto_followups", resource: "settings", output: b, ip: caller.ip });
  return b;
});
