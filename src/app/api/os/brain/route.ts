import { z } from "zod";
import { api, jsonBody } from "@/lib/os/http";
import { prisma } from "@/lib/prisma";
import { ORG_ID } from "@/lib/os/constants";
import { BRAIN_SECTIONS, upsertBrainEntry } from "@/lib/os/brain";

export const GET = api("brain.read", async () => prisma.osBrainEntry.findMany({ where: { orgId: ORG_ID }, orderBy: { updatedAt: "desc" }, take: 200 }));

export const POST = api("brain.write", async ({ request, caller }) => {
  const b = await jsonBody(request, z.object({
    id: z.number().int().optional(), section: z.enum(BRAIN_SECTIONS), title: z.string().min(1).max(200), content: z.string().min(1).max(20000),
    tags: z.array(z.string()).optional(), sourceUrl: z.string().url().optional(), allowedDepartments: z.array(z.string()).optional(),
  }));
  return upsertBrainEntry({ ...b, actor: caller.name, actorType: "HUMAN" });
});
