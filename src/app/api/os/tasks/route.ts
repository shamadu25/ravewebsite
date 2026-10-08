import { api } from "@/lib/os/http";
import { prisma } from "@/lib/prisma";
import { ORG_ID } from "@/lib/os/constants";

export const GET = api("task.read", async ({ request }) => {
  const sp = request.nextUrl.searchParams;
  const take = Math.min(100, Number(sp.get("limit") ?? 50));
  const cursor = sp.get("cursor") ? Number(sp.get("cursor")) : undefined;
  const status = sp.get("status") ?? undefined;
  const rows = await prisma.osTask.findMany({
    where: { orgId: ORG_ID, ...(status ? { status } : {}) }, orderBy: { id: "desc" }, take: take + 1, ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    include: { agent: { select: { key: true, name: true } } },
  });
  return { tasks: rows.slice(0, take), nextCursor: rows.length > take ? rows[take - 1].id : null };
});
