import { z } from "zod";
import { api, jsonBody } from "@/lib/os/http";
import { prisma } from "@/lib/prisma";
import { ORG_ID, CHANNELS } from "@/lib/os/constants";
import { audit } from "@/lib/os/audit";

export const POST = api("opportunity.write", async ({ request, caller }) => {
  const b = await jsonBody(request, z.object({ address: z.string().min(3).max(200), channel: z.enum(CHANNELS).default("EMAIL"), reason: z.string().max(200).optional() }));
  const address = b.address.toLowerCase();
  await prisma.osOptOut.upsert({ where: { orgId_channel_address: { orgId: ORG_ID, channel: b.channel, address } }, create: { orgId: ORG_ID, channel: b.channel, address, reason: b.reason }, update: {} });
  await audit({ actor: caller.name, actorType: "HUMAN", action: "optout.add", resource: "opt_out", resourceId: address, ip: caller.ip });
  return { address, channel: b.channel };
});
