import { prisma } from "@/lib/prisma";
import { growthApi } from "@/lib/growth/api";
import { GROWTH_ORG } from "@/lib/growth/config";

export const GET = growthApi("opportunity.read", async ({ request }) => {
  const status = request.nextUrl.searchParams.get("status") ?? undefined;
  return prisma.grCompany.findMany({ where: { orgId: GROWTH_ORG, ...(status ? { status } : {}) }, orderBy: { updatedAt: "desc" }, take: 200, include: { _count: { select: { evidence: true, people: true, contacts: true } } } });
});
