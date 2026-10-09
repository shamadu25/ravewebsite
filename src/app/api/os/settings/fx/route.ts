import { z } from "zod";
import { api, jsonBody } from "@/lib/os/http";
import { setGhsPerUsd } from "@/lib/os/fx";
import { audit } from "@/lib/os/audit";

export const POST = api("goal.write", async ({ request, caller }) => {
  const b = await jsonBody(request, z.object({ ghsPerUsd: z.number().gt(1).lt(1000) }));
  await setGhsPerUsd(b.ghsPerUsd);
  await audit({ actor: caller.name, actorType: "HUMAN", action: "settings.fx_rate", resource: "settings", output: b, ip: caller.ip });
  return b;
});
