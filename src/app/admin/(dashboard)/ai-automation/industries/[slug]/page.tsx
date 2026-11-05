import { notFound } from "next/navigation";
import { Card, PageHeader } from "@/components/os/ui";
import { ActionButton, JsonEditor } from "@/components/admin-ai/controls";
import { requireAdmin } from "@/lib/ai-automation/admin-auth";
import { getIndustryConfig } from "@/lib/ai-automation/repo";
import { can } from "@/lib/os/rbac";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AiIndustryEdit({ params }: { params: Promise<{ slug: string }> }) {
  const { user, allowed } = await requireAdmin("ai.read");
  if (!allowed) return <p>No access.</p>;
  const slug = (await params).slug;
  const i = await getIndustryConfig(slug);
  if (!i) notFound();
  const inDb = (await prisma.aiIndustry.findUnique({ where: { slug }, select: { id: true } }).catch(() => null)) != null;
  const url = `/api/ai-automation/admin/industries/${slug}`;
  const edit = can(user.role, "ai.write") && inDb;
  return (
    <div>
      <PageHeader title={i.name} subtitle={i.hasPage ? `Live at /ai-automation/${slug}` : "Assessment-only (no landing page)"} />
      {!inDb && <Card className="mb-6 !bg-amber-50"><p className="text-sm text-amber-900">This industry is still using built-in defaults. Initialise the catalogue (Overview tab) to make it editable.</p></Card>}
      {edit && (
        <div className="space-y-6">
          <Card><h2 className="mb-3 text-base font-semibold">Visibility</h2><div className="flex flex-wrap gap-2"><ActionButton label={i.active ? "Deactivate industry" : "Activate industry"} url={url} method="PUT" body={{ active: !i.active }} confirm={i.active ? "Deactivate? The page returns 404 and the industry disappears from the assessment." : "Activate this industry?"} /><ActionButton label={i.hasPage ? "Unpublish landing page" : "Publish landing page"} url={url} method="PUT" body={{ hasPage: !i.hasPage }} confirm={i.hasPage ? "Unpublish the landing page? It will return 404." : "Publish the landing page? It must have complete content first."} /></div></Card>
          <Card><h2 className="mb-1 text-base font-semibold">SEO metadata</h2><p className="mb-3 text-xs text-gray-500">Title ≤ 65 characters, description ≤ 160. Must be unique per page.</p><JsonEditor url={url} field="seo" rows={9} initial={{ title: i.seo.title, description: i.seo.description, keywords: i.seo.keywords, ogImage: i.seo.ogImage ?? null }} /></Card>
          <Card><h2 className="mb-1 text-base font-semibold">Assessment questions (industry-specific)</h2><p className="mb-3 text-xs text-gray-500">Types: text, textarea, number, select, multiselect, boolean, email, tel, url. Use <code>showIf</code> {`{"key": "...", "in": ["value"]}`} for conditional questions. Saving replaces the whole list. Universal questions (profile, challenges, goals, contact) are shared by all industries.</p><JsonEditor url={url} field="questions" rows={22} initial={i.questions} /></Card>
          <Card><h2 className="mb-1 text-base font-semibold">Landing-page content &amp; recommendations copy</h2><p className="mb-3 text-xs text-gray-500">Hero, problems, use cases, integrations, FAQs, CTAs and internal links. Recommended solutions are managed in Solutions (industry compatibility).</p><JsonEditor url={url} field="content" rows={26} initial={i.content} /></Card>
        </div>
      )}
    </div>
  );
}
