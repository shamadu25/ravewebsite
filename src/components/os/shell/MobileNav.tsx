"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { NAV, isActive } from "./nav";

const PRIMARY = ["Home", "AI Employees", "Leads & Sales", "Approvals"];

/** Phone navigation: four primary destinations plus a drawer for everything else. */
export default function MobileNav({ approvals }: { approvals: number }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const primary = NAV.filter((n) => PRIMARY.includes(n.label));
  return (
    <>
      <nav aria-label="Primary" className="fixed inset-x-0 bottom-0 z-30 flex border-t border-white/10 bg-[var(--sidebar)] pb-[env(safe-area-inset-bottom)] md:hidden">
        {primary.map((item) => {
          const Icon = item.icon;
          const active = isActive(item, pathname);
          return (
            <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined} className={cn("relative flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px]", active ? "text-white" : "text-[var(--sidebar-muted)]")}>
              <Icon className="h-5 w-5" aria-hidden />{item.label.split(" ")[0]}
              {item.badge === "approvals" && approvals > 0 && <span className="absolute right-1/4 top-1 rounded-full bg-[#f59e0b] px-1.5 text-[10px] font-semibold text-[#080b16]">{approvals}</span>}
            </Link>
          );
        })}
        <button type="button" onClick={() => setOpen(true)} className="flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] text-[var(--sidebar-muted)]" aria-label="More navigation"><Menu className="h-5 w-5" aria-hidden />More</button>
      </nav>
      {open && (
        <div className="fixed inset-0 z-40 md:hidden" role="dialog" aria-modal="true" aria-label="All sections">
          <button type="button" aria-label="Close" className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="os-drawer absolute inset-y-0 right-0 w-72 bg-[var(--sidebar)] p-4 text-white">
            <div className="mb-3 flex items-center justify-between"><p className="font-semibold">RaveSoft</p><button type="button" onClick={() => setOpen(false)} aria-label="Close menu"><X className="h-5 w-5" /></button></div>
            <ul className="space-y-1">
              {NAV.map((item) => { const Icon = item.icon; return (
                <li key={item.href}><Link onClick={() => setOpen(false)} href={item.href} className={cn("flex items-center gap-3 rounded-[12px] px-3 py-2.5 text-[14px]", isActive(item, pathname) ? "bg-[var(--primary)]" : "text-[var(--sidebar-muted)] hover:bg-white/5")}><Icon className="h-[18px] w-[18px]" aria-hidden />{item.label}</Link></li>
              ); })}
            </ul>
          </div>
        </div>
      )}
    </>
  );
}
