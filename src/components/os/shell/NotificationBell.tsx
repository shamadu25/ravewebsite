"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Bell } from "lucide-react";

interface Item { id: string; kind: "approval" | "alert"; rawId: number; title: string; detail: string; href: string }

export default function NotificationBell() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [count, setCount] = useState<number | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/os/notifications", { cache: "no-store" });
      const j = await res.json();
      if (!res.ok || !j.ok) throw new Error();
      setCount(j.data.count); setItems(j.data.items); setError(false);
    } catch { setError(true); }
  }, []);

  useEffect(() => {
    const first = setTimeout(load, 0);
    const id = setInterval(() => { if (document.visibilityState === "visible") load(); }, 45_000);
    return () => { clearTimeout(first); clearInterval(id); };
  }, [load]);

  async function resolve(it: Item) {
    await fetch(`/api/os/alerts/${it.rawId}`, { method: "POST" });
    await load(); router.refresh();
  }

  return (
    <div className="relative">
      <button type="button" onClick={() => { setOpen((o) => !o); if (!open) load(); }} aria-label={`Notifications${count ? `, ${count} unread` : ""}`} aria-expanded={open} className="relative flex h-10 w-10 items-center justify-center rounded-[12px] border border-[var(--border)] bg-white text-[var(--muted)] hover:text-[var(--foreground)]">
        <Bell className="h-[18px] w-[18px]" aria-hidden />
        {!!count && <span className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[var(--primary)] px-1 text-[11px] font-semibold text-white">{count > 99 ? "99+" : count}</span>}
      </button>
      {open && (
        <>
          <button type="button" aria-label="Close notifications" className="fixed inset-0 z-30 cursor-default" onClick={() => setOpen(false)} />
          <div className="os-drawer absolute right-0 z-40 mt-2 w-80 max-w-[calc(100vw-2rem)] rounded-[16px] border border-[var(--border)] bg-white p-2 shadow-xl" role="dialog" aria-label="Notifications">
            <p className="px-3 py-2 text-[12px] font-medium uppercase tracking-wide text-[var(--muted)]">Needs your attention</p>
            {error && <p className="px-3 py-4 text-[13px] text-[var(--danger)]">Unable to load notifications. <button className="underline" onClick={load}>Retry</button></p>}
            {!error && items.length === 0 && <p className="px-3 py-6 text-center text-[13px] text-[var(--muted)]">You&apos;re all caught up.</p>}
            <ul className="max-h-80 overflow-y-auto">
              {items.map((it) => (
                <li key={it.id} className="flex items-start gap-2 rounded-[10px] px-3 py-2 hover:bg-[var(--background)]">
                  <Link href={it.href} onClick={() => setOpen(false)} className="min-w-0 flex-1"><span className="block truncate text-[13px] font-medium">{it.title}</span><span className="block truncate text-[12px] text-[var(--muted)]">{it.detail}</span></Link>
                  {it.kind === "alert" && <button type="button" onClick={() => resolve(it)} className="shrink-0 text-[12px] text-[var(--primary)] hover:underline">Dismiss</button>}
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
