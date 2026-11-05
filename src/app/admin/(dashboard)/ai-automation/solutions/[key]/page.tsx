import { notFound } from "next/navigation";
import { PageHeader } from "@/components/os/ui";
import { Card } from "@/components/os/ui";
import SolutionForm from "@/components/admin-ai/SolutionForm";
import { requireAdmin } from "@/lib/ai-automation/admin-auth";
import { getIndustryConfigs, getSolutions } from "@/lib/ai-automation/repo";
import { can } from "@/lib/os/rbac";

export const dynamic = "force-dynamic";

export default async function AiSolutionEdit({ params }: { params: Promise<{ key: string }> }) {
  const { user, allowed } = await requireAdmin("ai.read");
  if (!allowed) return <p>No access.</p>;
  const key = (await params).key;
  const sol = (await getSolutions({ includeInactive: true })).find((s) => s.key === key);
  if (!sol) notFound();
  const industries = await getIndustryConfigs({ includeInactive: true });
  return (
    <div>
      <PageHeader title={sol.name} subtitle={`Key: ${sol.key}`} />
      <Card>{can(user.role, "ai.write") ? <SolutionForm canPrice={can(user.role, "ai.pricing")} allIndustries={industries.map((i) => ({ slug: i.slug, name: i.name }))} sol={{ ...sol, industries: sol.mappings.map((m) => ({ slug: m.industrySlug, priority: m.priority })) }} /> : <p className="text-sm text-gray-500">Read-only access.</p>}</Card>
    </div>
  );
}
