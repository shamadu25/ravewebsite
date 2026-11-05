"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export const INTEL_NAV = [
  { href: "/admin/intelligence", label: "Analytics Overview" },
  { href: "/admin/intelligence/live", label: "Live Visitors" },
  { href: "/admin/intelligence/visitors", label: "Visitors & Sessions" },
  { href: "/admin/intelligence/geo", label: "Geographic Analytics" },
  { href: "/admin/intelligence/sources", label: "Traffic Sources" },
  { href: "/admin/intelligence/campaigns", label: "Campaign Analytics" },
  { href: "/admin/intelligence/pages", label: "Page Analytics" },
  { href: "/admin/intelligence/behaviour", label: "Visitor Behaviour" },
  { href: "/admin/intelligence/funnels", label: "Conversion Funnels" },
  { href: "/admin/intelligence/leads", label: "Lead Attribution" },
  { href: "/admin/intelligence/replay", label: "Heatmaps & Session Replay" },
  { href: "/admin/intelligence/performance", label: "Website Performance" },
  { href: "/admin/intelligence/technical", label: "Technical Monitoring" },
  { href: "/admin/intelligence/reports", label: "Reports & Exports" },
  { href: "/admin/intelligence/settings", label: "Analytics Settings" },
] as const;

export default function IntelNav() {
  const path = usePathname();
  return (
    <nav aria-label="RaveSoft Intelligence" className="-mx-1 mb-6 overflow-x-auto border-b border-gray-200">
      <ul className="flex min-w-max gap-1 px-1">
        {INTEL_NAV.map((i) => {
          const active = i.href === "/admin/intelligence" ? path === i.href : path.startsWith(i.href);
          return (
            <li key={i.href}>
              <Link href={i.href} aria-current={active ? "page" : undefined}
                className={cn("block whitespace-nowrap border-b-2 px-3 py-2.5 text-[13px] font-medium transition-colors", active ? "border-[#FFB200] text-[#060297]" : "border-transparent text-gray-500 hover:text-gray-900")}>
                {i.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
