"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const TABS = [
  ["Overview", "/admin/ai-automation"], ["Leads", "/admin/ai-automation/leads"], ["Proposals", "/admin/ai-automation/proposals"], ["Solutions", "/admin/ai-automation/solutions"],
  ["Pricing", "/admin/ai-automation/pricing"], ["Industries", "/admin/ai-automation/industries"], ["Emails", "/admin/ai-automation/emails"], ["Jobs", "/admin/ai-automation/jobs"], ["Analytics", "/admin/ai-automation/analytics"], ["Settings", "/admin/ai-automation/settings"],
] as const;

export function AiTabs() {
  const path = usePathname();
  return (
    <nav aria-label="AI Automation sections" className="mb-6 flex gap-1 overflow-x-auto border-b border-gray-200 pb-px">
      {TABS.map(([label, href]) => {
        const active = href === "/admin/ai-automation" ? path === href : path.startsWith(href);
        return <Link key={href} href={href} aria-current={active ? "page" : undefined} className={cn("whitespace-nowrap rounded-t-lg px-3.5 py-2 text-sm font-medium", active ? "border-b-2 border-[var(--primary)] text-[var(--primary)]" : "text-gray-600 hover:text-gray-900")}>{label}</Link>;
      })}
    </nav>
  );
}
