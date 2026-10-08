import { z } from "zod";
import { api, jsonBody } from "@/lib/os/http";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/os/audit";

const ORDER = ["DRAFT", "REVIEW", "APPROVED", "PUBLISHED", "ARCHIVED"];

/** Status workflow. PUBLISHED records that a human published it elsewhere — no publishing integration exists yet. */
export const PATCH = api<{ id: string }>("campaign.launch", async ({ request, caller, params }) => {
  const b = await jsonBody(request, z.object({ status: z.enum(["DRAFT", "REVIEW", "APPROVED", "PUBLISHED", "ARCHIVED"]) }));
  const c = await prisma.osContent.findUniqueOrThrow({ where: { id: Number(params.id) } });
  if (b.status === "PUBLISHED" && c.status !== "APPROVED") throw new Error("Content must be APPROVED before it is marked PUBLISHED.");
  if (ORDER.indexOf(b.status) > ORDER.indexOf(c.status) + 1 && b.status !== "ARCHIVED") throw new Error(`Cannot jump from ${c.status} to ${b.status}.`);
  await prisma.osContent.update({ where: { id: c.id }, data: { status: b.status } });
  await audit({ actor: caller.name, actorType: "HUMAN", action: "content.status", resource: "content", resourceId: c.id, input: { from: c.status, to: b.status }, ip: caller.ip });
  return { status: b.status };
});
