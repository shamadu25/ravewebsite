"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { NAV, isActive } from "./nav";

interface Props { approvals: number; userName: string; userRole: string }

export default function Sidebar({ approvals, userName, userRole }: Props) {
  const pathname = usePathname();
  return (
    <aside aria-label="Primary" className="fixed inset-y-0 left-0 z-30 hidden w-16 flex-col bg-[var(--sidebar)] text-white md:flex lg:w-60">
      <div className="flex h-16 items-center gap-3 px-4 lg:px-5">
        <Image src="/img/logo.png" alt="RaveSoft" width={32} height={32} className="h-8 w-8 shrink-0 rounded-lg object-contain" />
        <div className="hidden leading-tight lg:block">
          <p className="text-[15px] font-semibold">RaveSoft</p>
          <p className="text-[11px] text-[var(--sidebar-muted)]">AI Command Centre</p>
        </div>
      </div>
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-2 py-3 lg:px-3">
        {NAV.map((item) => {
          const active = isActive(item, pathname);
          const Icon = item.icon;
          const count = item.badge === "approvals" ? approvals : 0;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              title={item.label}
              className={cn(
                "group relative flex h-10 items-center gap-3 rounded-[12px] px-3 text-[14px] transition-colors duration-150",
                active ? "bg-gradient-to-r from-[#6d28d9] to-[#7c3aed] text-white shadow-sm" : "text-[var(--sidebar-muted)] hover:bg-white/5 hover:text-white"
              )}
            >
              <Icon className="h-[18px] w-[18px] shrink-0" aria-hidden />
              <span className="hidden flex-1 lg:inline">{item.label}</span>
              {count > 0 && (
                <span className="absolute right-2 top-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[#f59e0b] px-1 text-[11px] font-semibold text-[#080b16] lg:static lg:ml-auto">
                  {count > 99 ? "99+" : count}<span className="sr-only"> pending approvals</span>
                </span>
              )}
            </Link>
          );
        })}
      </nav>
      <div className="space-y-3 border-t border-white/10 p-3">
        <Link href="/admin/settings" className="hidden items-center gap-2 rounded-[12px] bg-white/5 px-3 py-2 text-left hover:bg-white/10 lg:flex">
          <span className="leading-tight"><span className="block text-[13px] font-medium">RaveSoft</span><span className="block text-[11px] text-[var(--sidebar-muted)]">Internal Workspace</span></span>
          <ChevronDown className="ml-auto h-4 w-4 text-[var(--sidebar-muted)]" aria-hidden />
        </Link>
        <div className="flex items-center gap-2 px-1">
          <span aria-hidden className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--primary)] text-[13px] font-semibold">{userName.charAt(0).toUpperCase()}</span>
          <span className="hidden min-w-0 leading-tight lg:block"><span className="block truncate text-[13px]">{userName}</span><span className="block truncate text-[11px] text-[var(--sidebar-muted)]">{userRole}</span></span>
        </div>
      </div>
    </aside>
  );
}
