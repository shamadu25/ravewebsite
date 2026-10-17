import { prisma } from "@/lib/prisma";
import { growthApi } from "@/lib/growth/api";

export const GET = growthApi("approval.read", async ({ request }) => {
  const status = request.nextUrl.searchParams.get("status") ?? "PENDING_APPROVAL";
  return prisma.grReplyDraft.findMany({ where: { status }, orderBy: { id: "desc" }, take: 100 });
});
