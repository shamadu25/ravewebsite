import AskPanel from "@/components/os/AskPanel";
import { PageHeader } from "@/components/os/ui";

export default function AskPage() {
  return (
    <div>
      <PageHeader title="Ask RaveSoft AI" subtitle="Questions are answered from live company data. Commands that change anything are shown for confirmation first — nothing executes silently." />
      <AskPanel />
    </div>
  );
}
