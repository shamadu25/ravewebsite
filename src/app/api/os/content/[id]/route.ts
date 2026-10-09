import { revalidatePath } from "next/cache";
import { z } from "zod";
import { api, jsonBody } from "@/lib/os/http";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/os/audit";
import { slugify } from "@/lib/os/markdown";

const ORDER = ["DRAFT", "REVIEW", "APPROVED", "PUBLISHED", "ARCHIVED"];

async function uniqueSlug(base: string, selfId: number): Promise<string> {
  const root = slugify(base) || `article-${selfId}`;
  for (let i = 0; i < 20; i++) {
    const candidate = i === 0 ? root : `${root}-${i + 1}`;
    const clash = await prisma.osContent.findFirst({ where: { slug: candidate, NOT: { id: selfId } } });
    if (!clash) return candidate;
  }
  return `${root}-${selfId}`;
}

const refresh = (slug?: string | null) => { revalidatePath("/blog"); revalidatePath("/sitemap.xml"); if (slug) revalidatePath(`/blog/${slug}`); };

/** Status workflow. Publishing an ARTICLE makes it live on the website blog and in the sitemap — only a human can do this, and only from APPROVED. */
export const PATCH = api<{ id: string }>("campaign.launch", async ({ request, caller, params }) => {
  const b = await jsonBody(request, z.object({ status: z.enum(["DRAFT", "REVIEW", "APPROVED", "PUBLISHED", "ARCHIVED"]) }));
  const c = await prisma.osContent.findUniqueOrThrow({ where: { id: Number(params.id) } });
  if (b.status === "PUBLISHED" && c.status !== "APPROVED") throw new Error("Content must be APPROVED before it is PUBLISHED.");
  if (ORDER.indexOf(b.status) > ORDER.indexOf(c.status) + 1 && b.status !== "ARCHIVED") throw new Error(`Cannot jump from ${c.status} to ${b.status}.`);
  const data: Record<string, unknown> = { status: b.status };
  if (c.type === "ARTICLE" && b.status === "PUBLISHED") {
    if (c.body.trim().length < 400) throw new Error("This article is too short to publish (under ~70 words). Edit it first.");
    data.slug = c.slug ?? (await uniqueSlug(c.title.replace(/^\[[^\]]+\]\s*/, ""), c.id));
    data.publishedAt = c.publishedAt ?? new Date();
  }
  const row = await prisma.osContent.update({ where: { id: c.id }, data });
  if (c.type === "ARTICLE" && (b.status === "PUBLISHED" || c.status === "PUBLISHED")) refresh(row.slug);
  await audit({ actor: caller.name, actorType: "HUMAN", action: "content.status", resource: "content", resourceId: c.id, input: { from: c.status, to: b.status, slug: row.slug }, ip: caller.ip });
  return { status: b.status, slug: row.slug, url: row.slug && b.status === "PUBLISHED" ? `/blog/${row.slug}` : null };
});

/** Edit before (or after) publishing. Edits to a live article go live within seconds. */
export const POST = api<{ id: string }>("campaign.create", async ({ request, caller, params }) => {
  const b = await jsonBody(request, z.object({ title: z.string().min(3).max(200), body: z.string().min(20).max(30000), slug: z.string().max(80).optional(), excerpt: z.string().max(300).optional(), metaDescription: z.string().max(170).optional() }));
  const c = await prisma.osContent.findUniqueOrThrow({ where: { id: Number(params.id) } });
  const slug = b.slug ? await uniqueSlug(b.slug, c.id) : c.slug;
  await prisma.osContent.update({ where: { id: c.id }, data: { title: b.title, body: b.body, slug, excerpt: b.excerpt ?? c.excerpt, metaDescription: b.metaDescription ?? c.metaDescription } });
  if (c.type === "ARTICLE" && c.status === "PUBLISHED") refresh(slug);
  await audit({ actor: caller.name, actorType: "HUMAN", action: "content.edit", resource: "content", resourceId: c.id, ip: caller.ip });
  return { ok: true, slug };
});
