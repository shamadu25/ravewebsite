import { prisma } from "@/lib/prisma";
import type { KnowledgeDocument } from "@prisma/client";

/**
 * Keyword-based retrieval over published knowledge documents. No vector
 * embeddings yet (spec §31 notes this as a future upgrade) — matches are
 * ranked by how many query keywords appear in the title/content.
 */
export async function searchKnowledge(
  query: string,
  options: { limit?: number; category?: string } = {}
): Promise<KnowledgeDocument[]> {
  const limit = options.limit ?? 3;

  const keywords = Array.from(
    new Set(
      query
        .toLowerCase()
        .split(/\s+/)
        .filter((word) => word.length >= 3)
    )
  );

  if (keywords.length === 0) {
    return [];
  }

  const now = new Date();

  const documents = await prisma.knowledgeDocument.findMany({
    where: {
      status: "published",
      OR: [{ expiresAt: null }, { expiresAt: { gte: now } }],
      ...(options.category ? { category: options.category } : {}),
    },
  });

  return documents
    .map((doc) => {
      const haystack = `${doc.title} ${doc.content}`.toLowerCase();
      const score = keywords.reduce((count, word) => count + (haystack.includes(word) ? 1 : 0), 0);
      return { doc, score };
    })
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((r) => r.doc);
}

export async function knowledgeContextFor(query: string, category?: string): Promise<string> {
  const documents = await searchKnowledge(query, { category });
  return documents.map((doc) => `## ${doc.title}\n${doc.content}`).join("\n\n");
}
