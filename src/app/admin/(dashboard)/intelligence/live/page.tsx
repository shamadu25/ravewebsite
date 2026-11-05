import { loadIntel } from "@/components/analytics/load";
import { NoAccess, PageTitle } from "@/components/analytics/kit";
import LiveBoard from "@/components/analytics/LiveBoard";
import { liveCount, liveSessions } from "@/lib/analytics/queries";

export default async function LivePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const ctx = await loadIntel(searchParams);
  if (!ctx) return <NoAccess />;
  const [count, sessions] = await Promise.all([liveCount(), liveSessions(100)]);
  return (
    <div>
      <PageTitle title="Live Visitors" subtitle="Anonymous visitors with activity in the last 5 minutes. IDs are random and cannot identify a person; open a visitor to see their session timeline." />
      <LiveBoard initial={{ count, sessions }} />
    </div>
  );
}
