import { z } from "zod";
import { growthApi } from "@/lib/growth/api";
import { jsonBody } from "@/lib/os/http";
import { suppress } from "@/lib/growth/suppression";
import { prisma } from "@/lib/prisma";

export const GET = growthApi("opportunity.read", async () => prisma.grSuppression.findMany({ orderBy: { id: "desc" }, take: 200 }));
export const POST = growthApi("opportunity.write", async ({ request, caller }) => {
  const b = await jsonBody(request, z.object({ kind: z.enum(["EMAIL", "DOMAIN"]), value: z.string().min(3), reason: z.string().min(2).max(200) }));
  return suppress(b.kind, b.value, b.reason, caller.name);
});
