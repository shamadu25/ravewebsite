import { prisma } from "@/lib/prisma";
import { CANNED_REPLIES, type CannedReply } from "./cannedReplies";

export const MAX_CANNED = 50;

/** Replies for the inbox reply box: the team's own set once they have created any, else the built-in defaults. */
export async function listCannedReplies(): Promise<{ replies: CannedReply[]; usingDefaults: boolean }> {
  try {
    const rows = await prisma.cannedReply.findMany({ orderBy: [{ sortOrder: "asc" }, { id: "asc" }], take: MAX_CANNED });
    if (rows.length > 0) return { replies: rows.map((r) => ({ key: String(r.id), title: r.title, body: r.body })), usingDefaults: false };
  } catch (error) {
    // Table not migrated yet (or DB hiccup): the reply box must still work.
    console.error("[canned] falling back to defaults", error);
  }
  return { replies: CANNED_REPLIES, usingDefaults: true };
}
