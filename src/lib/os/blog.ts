import { prisma } from "@/lib/prisma";
import { ORG_ID } from "./constants";
import { readTimeOf } from "./markdown";

export interface DbPost { id: string; title: string; slug: string; excerpt: string; category: string; readTime: string; date: string; author: string; body: string; metaDescription: string; publishedAt: Date }

const monthYear = (d: Date) => d.toLocaleString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" });
const toPost = (r: { id: number; title: string; slug: string | null; excerpt: string | null; metaDescription: string | null; body: string; publishedAt: Date | null; createdAt: Date }): DbPost => {
  const when = r.publishedAt ?? r.createdAt;
  const excerpt = r.excerpt ?? r.body.replace(/[#*_>\-\[\]()]/g, " ").replace(/\s+/g, " ").trim().slice(0, 180);
  return { id: `db-${r.id}`, title: r.title, slug: r.slug as string, excerpt, category: "Insights", readTime: readTimeOf(r.body), date: monthYear(when), author: "RaveSoft Team", body: r.body, metaDescription: r.metaDescription ?? excerpt, publishedAt: when };
};

/** Published, human-approved articles. Never throws: if the database is unreachable (e.g. at build time) the static blog still works. */
export async function getPublishedArticles(): Promise<DbPost[]> {
  try {
    const rows = await prisma.osContent.findMany({ where: { orgId: ORG_ID, type: "ARTICLE", status: "PUBLISHED", slug: { not: null } }, orderBy: { publishedAt: "desc" }, take: 200 });
    return rows.map(toPost);
  } catch { return []; }
}

export async function getPublishedArticle(slug: string): Promise<DbPost | null> {
  try {
    const r = await prisma.osContent.findFirst({ where: { orgId: ORG_ID, type: "ARTICLE", status: "PUBLISHED", slug } });
    return r ? toPost(r) : null;
  } catch { return null; }
}
