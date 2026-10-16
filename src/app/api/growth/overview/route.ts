import { growthApi } from "@/lib/growth/api";
import { growthFunnel, METRIC_DEFINITIONS } from "@/lib/growth/funnel";
import { snovStatus } from "@/lib/growth/enrich";

export const GET = growthApi("opportunity.read", async ({ request }) => {
  const sp = request.nextUrl.searchParams;
  const to = sp.get("to") ? new Date(sp.get("to") as string) : new Date();
  const from = sp.get("from") ? new Date(sp.get("from") as string) : new Date(Date.now() - 30 * 86400_000);
  return { funnel: await growthFunnel(from, to), definitions: METRIC_DEFINITIONS, snov: snovStatus() };
});
