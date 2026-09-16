import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";

const LEVEL_STYLES: Record<string, string> = {
  hot: "bg-red-100 text-red-700",
  sales_qualified: "bg-orange-100 text-orange-700",
  qualified: "bg-blue-100 text-blue-700",
  nurture: "bg-amber-100 text-amber-700",
  low: "bg-gray-100 text-gray-600",
};

async function getLeads() {
  const leads = await prisma.lead.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      contact: true,
      company: true,
      scores: { orderBy: { computedAt: "desc" }, take: 1 },
    },
  });

  return leads;
}

export default async function AdminLeadsPage() {
  const leads = await getLeads();

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Leads</h1>

      <div className="bg-white rounded-2xl border border-gray-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-left text-gray-500">
              <th className="px-4 py-3 font-medium">Contact</th>
              <th className="px-4 py-3 font-medium">Service Interest</th>
              <th className="px-4 py-3 font-medium">Stage</th>
              <th className="px-4 py-3 font-medium">Score</th>
              <th className="px-4 py-3 font-medium">Source</th>
              <th className="px-4 py-3 font-medium">Created</th>
            </tr>
          </thead>
          <tbody>
            {leads.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                  No leads captured yet.
                </td>
              </tr>
            )}
            {leads.map((lead) => {
              const score = lead.scores[0];
              const name = [lead.contact.firstName, lead.contact.lastName].filter(Boolean).join(" ") || "—";

              return (
                <tr key={lead.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <Link href={`/admin/leads/${lead.id}`} className="font-medium text-gray-900 hover:text-blue-600">
                      {name}
                    </Link>
                    <p className="text-xs text-gray-500">
                      {lead.contact.email ?? lead.contact.whatsapp ?? lead.contact.phone ?? "no contact info"}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-gray-700">{lead.serviceInterest ?? "—"}</td>
                  <td className="px-4 py-3 text-gray-700 capitalize">{lead.stage.replace(/_/g, " ")}</td>
                  <td className="px-4 py-3">
                    {score ? (
                      <span
                        className={cn(
                          "inline-flex px-2 py-0.5 rounded-full text-xs font-medium capitalize",
                          LEVEL_STYLES[score.level] ?? LEVEL_STYLES.low
                        )}
                      >
                        {score.level.replace(/_/g, " ")} ({score.totalScore})
                      </span>
                    ) : (
                      <span className="text-gray-400 text-xs">unscored</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-500">{lead.source ?? "—"}</td>
                  <td className="px-4 py-3 text-gray-500">{lead.createdAt.toLocaleDateString()}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
