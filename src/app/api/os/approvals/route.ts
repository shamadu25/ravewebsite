import { api } from "@/lib/os/http";
import { prisma } from "@/lib/prisma";
import { ORG_ID } from "@/lib/os/constants";

export const GET = api("approval.read", async ({ request }) => {
  const status = request.nextUrl.searchParams.get("status");
  return prisma.osApproval.findMany({ where: { orgId: ORG_ID, ...(status ? { status } : {}) }, orderBy: { createdAt: "desc" }, take: 100 });
});
