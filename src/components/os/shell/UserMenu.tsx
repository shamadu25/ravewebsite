"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ChevronDown, LogOut } from "lucide-react";

export default function UserMenu({ name, role }: { name: string; role: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  async function logout() { await fetch("/api/admin/logout", { method: "POST" }); router.push("/admin/login"); router.refresh(); }
  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-label="Account menu" className="flex h-10 items-center gap-2 rounded-[12px] border border-[var(--border)] bg-white pl-1.5 pr-2.5 hover:shadow-sm">
        <span aria-hidden className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--primary)] text-[12px] font-semibold text-white">{name.charAt(0).toUpperCase()}</span>
        <span className="hidden text-left leading-tight lg:block"><span className="block text-[13px] font-medium">{name}</span><span className="block text-[11px] text-[var(--muted)]">{role}</span></span>
        <ChevronDown className="hidden h-4 w-4 text-[var(--muted)] lg:block" aria-hidden />
      </button>
      {open && (<>
        <button type="button" aria-label="Close menu" className="fixed inset-0 z-30 cursor-default" onClick={() => setOpen(false)} />
        <div className="os-drawer absolute right-0 z-40 mt-2 w-48 rounded-[12px] border border-[var(--border)] bg-white p-1 shadow-xl">
          <button type="button" onClick={logout} className="flex w-full items-center gap-2 rounded-[8px] px-3 py-2 text-[13px] hover:bg-[var(--background)]"><LogOut className="h-4 w-4" aria-hidden />Sign out</button>
        </div>
      </>)}
    </div>
  );
}
