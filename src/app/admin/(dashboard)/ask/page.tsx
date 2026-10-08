import AskPanel from "@/components/os/AskPanel";
import { PageHeader } from "@/components/os/ui";

export default async function AskPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  return (
    <div>
      <PageHeader title="Ask RaveSoft AI" subtitle="Questions are answered from live company data. Commands that change anything are shown for confirmation first — nothing executes silently." />
      <AskPanel initialQuestion={q} />
    </div>
  );
}
