"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Search } from "lucide-react";

interface Result { type: string; title: string; subtitle: string; href: string }

/** ⌘K / Ctrl-K command palette. Results come from /api/os/search (permission-filtered server-side). */
export default function GlobalSearch() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [state, setState] = useState<"idle" | "loading" | "error">("idle");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const close = useCallback(() => { setOpen(false); setQ(""); setResults([]); setActive(0); }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setOpen((o) => !o); }
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [close]);

  useEffect(() => { if (open) setTimeout(() => inputRef.current?.focus(), 10); }, [open]);

  useEffect(() => {
    if (q.trim().length < 2) return;
    const ctl = new AbortController();
    const t = setTimeout(async () => {
      setState("loading");
      try {
        const res = await fetch(`/api/os/search?q=${encodeURIComponent(q)}`, { signal: ctl.signal });
        const j = await res.json();
        if (!res.ok || !j.ok) throw new Error();
        setResults(j.data.results); setActive(0); setState("idle");
      } catch (e) { if ((e as Error).name !== "AbortError") setState("error"); }
    }, 180);
    return () => { clearTimeout(t); ctl.abort(); };
  }, [q]);

  const go = (r?: Result) => { if (!r) return; close(); router.push(r.href); };

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="flex h-10 min-w-0 flex-1 items-center gap-2 rounded-[12px] border border-[var(--border)] bg-white px-3 text-left text-[14px] text-[var(--muted)] transition-shadow hover:shadow-sm md:max-w-xl" aria-label="Search (Command K)">
        <Search className="h-4 w-4 shrink-0" aria-hidden />
        <span className="min-w-0 flex-1 truncate">Search customers, leads, AI employees, tasks…</span>
        <kbd className="hidden rounded-md border border-[var(--border)] bg-[var(--background)] px-1.5 py-0.5 text-[11px] sm:inline">⌘ K</kbd>
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-[12vh]" role="dialog" aria-modal="true" aria-label="Search">
          <button type="button" aria-label="Close search" className="absolute inset-0 bg-black/40" onClick={close} />
          <div className="os-drawer relative w-full max-w-xl overflow-hidden rounded-[16px] bg-white shadow-xl">
            <div className="flex items-center gap-2 border-b border-[var(--border)] px-4">
              <Search className="h-4 w-4 text-[var(--muted)]" aria-hidden />
              <input
                ref={inputRef} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search…" aria-label="Search query" role="combobox" aria-expanded aria-controls="os-search-results"
                onKeyDown={(e) => { if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(a + 1, results.length - 1)); } if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); } if (e.key === "Enter") go(results[active]); }}
                className="h-12 flex-1 bg-transparent text-[15px] outline-none"
              />
            </div>
            <ul id="os-search-results" role="listbox" className="max-h-[50vh] overflow-y-auto p-2">
              {q.trim().length < 2 && <li className="px-3 py-6 text-center text-[13px] text-[var(--muted)]">Type at least 2 characters.</li>}
              {state === "loading" && <li className="px-3 py-6 text-center text-[13px] text-[var(--muted)]">Searching…</li>}
              {state === "error" && <li className="px-3 py-6 text-center text-[13px] text-[var(--danger)]">Search failed. Try again.</li>}
              {state === "idle" && q.trim().length >= 2 && results.length === 0 && <li className="px-3 py-6 text-center text-[13px] text-[var(--muted)]">No results for “{q}”.</li>}
              {results.map((r, i) => (
                <li key={`${r.type}-${i}`} role="option" aria-selected={i === active}>
                  <button type="button" onMouseEnter={() => setActive(i)} onClick={() => go(r)} className={`flex w-full items-center gap-3 rounded-[10px] px-3 py-2 text-left ${i === active ? "bg-[var(--primary-soft)]" : ""}`}>
                    <span className="w-20 shrink-0 text-[11px] uppercase tracking-wide text-[var(--muted)]">{r.type}</span>
                    <span className="min-w-0"><span className="block truncate text-[14px] font-medium">{r.title}</span><span className="block truncate text-[12px] text-[var(--muted)]">{r.subtitle}</span></span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </>
  );
}
