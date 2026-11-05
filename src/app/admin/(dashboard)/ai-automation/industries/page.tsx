import Link from "next/link";
import { Badge, Card, PageHeader } from "@/components/os/ui";
import ApiForm from "@/components/os/ApiForm";
import { requireAdmin } from "@/lib/ai-automation/admin-auth";
import { getIndustryConfigs } from "@/lib/ai-automation/repo";
import { can } from "@/lib/os/rbac";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AiIndustries() {
  const { user, allowed } = await requireAdmin("ai.read");
  if (!allowed) return <p>No access.</p>;
  const industries = await getIndustryConfigs({ includeInactive: true });
  const seeded = await prisma.aiIndustry.count().catch(() => 0);
  return (
    <div>
      <PageHeader title="Industries" subtitle="Landing-page content, assessment questions and SEO for each industry. Pages and questions are served from this configuration." />
      {seeded === 0 && <Card className="mb-6 !bg-amber-50"><p className="text-sm text-amber-900">The database has no industries yet, so the site is serving the built-in defaults. Use “Initialise catalogue” on the Overview tab to copy them here so they become editable.</p></Card>}
      <Card className="overflow-x-auto !p-0"><table className="w-full min-w-[640px] text-sm"><thead className="bg-gray-50 text-left text-xs text-gray-500"><tr><th className="p-3">Industry</th><th>URL</th><th>Questions</th><th>Status</th></tr></thead><tbody>
        {industries.map((i) => <tr key={i.slug} className="border-t border-gray-100 hover:bg-gray-50"><td className="p-3"><Link className="font-medium text-[var(--primary)] hover:underline" href={`/admin/ai-automation/industries/${i.slug}`}>{i.name}</Link></td><td className="text-xs">{i.hasPage ? `/ai-automation/${i.slug}` : "assessment only"}</td><td>{i.questions.length}</td><td><Badge>{i.active ? "ACTIVE" : "PAUSED"}</Badge></td></tr>)}
      </tbody></table></Card>
      {can(user.role, "ai.write") && <Card className="mt-6"><h2 className="mb-3 text-base font-semibold">New industry</h2><p className="mb-3 text-xs text-gray-500">Created inactive and without a landing page. Add content, questions and SEO, then publish.</p><ApiForm url="/api/ai-automation/admin/industries" submitLabel="Create" fields={[{ name: "slug", label: "URL slug (lowercase-with-dashes)", required: true }, { name: "name", label: "Name", required: true }]} /></Card>}
    </div>
  );
}
