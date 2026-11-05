import { z } from "zod";
import { api, jsonBody } from "@/lib/os/http";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/os/audit";
import { CANNED_REPLIES } from "@/lib/os/cannedReplies";
import { MAX_CANNED } from "@/lib/os/cannedStore";

const Title = z.string().trim().min(2).max(80);
const Body = z.string().trim().min(2).max(2000);

const Payload = z.discriminatedUnion("action", [
  z.object({ action: z.literal("create"), title: Title, body: Body }),
  z.object({ action: z.literal("update"), id: z.number().int().positive(), title: Title, body: Body }),
  z.object({ action: z.literal("delete"), id: z.number().int().positive() }),
  z.object({ action: z.literal("move"), id: z.number().int().positive(), direction: z.enum(["up", "down"]) }),
  /** Copies the built-in set into the database so it can be edited. Only when the table is empty. */
  z.object({ action: z.literal("seed_defaults") }),
]);

/** Manage the live-chat canned replies. Replies are plain text with an optional {name} placeholder. */
export const POST = api("customer.update", async ({ request, caller }) => {
  const body = await jsonBody(request, Payload);
  const count = await prisma.cannedReply.count();
  let message = "Saved.";

  if (body.action === "create") {
    if (count >= MAX_CANNED) throw new Error(`You can keep at most ${MAX_CANNED} canned replies.`);
    const last = await prisma.cannedReply.findFirst({ orderBy: { sortOrder: "desc" }, select: { sortOrder: true } });
    await prisma.cannedReply.create({ data: { title: body.title, body: body.body, sortOrder: (last?.sortOrder ?? 0) + 1 } });
    message = "Reply added.";
  } else if (body.action === "update") {
    const r = await prisma.cannedReply.updateMany({ where: { id: body.id }, data: { title: body.title, body: body.body } });
    if (r.count === 0) throw new Error("Reply not found.");
    message = "Reply saved.";
  } else if (body.action === "delete") {
    const r = await prisma.cannedReply.deleteMany({ where: { id: body.id } });
    if (r.count === 0) throw new Error("Reply not found.");
    message = "Reply deleted.";
  } else if (body.action === "move") {
    const rows = await prisma.cannedReply.findMany({ orderBy: [{ sortOrder: "asc" }, { id: "asc" }], select: { id: true } });
    const i = rows.findIndex((r) => r.id === body.id);
    const j = body.direction === "up" ? i - 1 : i + 1;
    if (i === -1) throw new Error("Reply not found.");
    if (j >= 0 && j < rows.length) {
      const order = rows.map((r) => r.id);
      [order[i], order[j]] = [order[j], order[i]];
      // Re-number the whole list so ties and gaps can never leave the order ambiguous.
      await prisma.$transaction(order.map((id, idx) => prisma.cannedReply.update({ where: { id }, data: { sortOrder: idx + 1 } })));
    }
    message = "Order updated.";
  } else {
    if (count > 0) throw new Error("You already have your own replies; the defaults were not copied.");
    await prisma.cannedReply.createMany({ data: CANNED_REPLIES.map((c, idx) => ({ title: c.title, body: c.body, sortOrder: idx + 1 })) });
    message = "Default replies copied — edit them below.";
  }

  await audit({ actor: caller.name, actorType: "HUMAN", action: `canned_reply.${body.action}`, resource: "canned_reply", resourceId: "id" in body ? body.id : null, ip: caller.ip });
  return { message };
});
