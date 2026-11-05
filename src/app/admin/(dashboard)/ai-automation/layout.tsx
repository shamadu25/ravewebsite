import { AiTabs } from "./tabs";

export default function AiAutomationLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <AiTabs />
      {children}
    </div>
  );
}
