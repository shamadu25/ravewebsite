"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Loader, Play } from "lucide-react";

interface LoopResult { ingested: number; scheduled: string[]; workflows?: { started: number; advanced: number }; learnings?: number; topPriorities: Array<{ title: string }> }

/** Triggers the real orchestration loop. The summary shown afterwards is the server's actual result, never a canned animation. */
export default function RunLoopButton({ runningSince }: { runningSince: string | null }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<LoopResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const running = busy || !!runningSince;

  // If another tab/cron is running the loop, poll until it finishes.
  useEffect(() => {
    if (!runningSince || busy) return;
    const id = setInterval(() => router.refresh(), 3000);
    return () => clearInterval(id);
  }, [runningSince, busy, router]);

  async function run() {
    setBusy(true); setError(null); setResult(null);
    try {
      const res = await fetch("/api/os/run", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ job: "tick" }) });
      const j = await res.json().catch(() => null);
      if (!res.ok || !j?.ok) setError(j?.error ?? `The loop could not run (${res.status}).`);
      else { setResult(j.data.loop); router.refresh(); }
    } catch { setError("Network error — the loop did not run."); } finally { setBusy(false); }
  }

  return (
    <div className="flex flex-col items-stretch gap-2 sm:items-end">
      <button type="button" onClick={run} disabled={running} aria-live="polite" className="inline-flex h-11 items-center justify-center gap-2 rounded-[12px] bg-[var(--primary)] px-5 text-[14px] font-medium text-white shadow-sm transition-colors hover:bg-[var(--primary-hover)] disabled:opacity-70">
        {running ? <Loader className="h-4 w-4 animate-spin" aria-hidden /> : <Play className="h-4 w-4" aria-hidden />}
        {running ? "Operating loop running…" : "Run operating loop"}
      </button>
      {error && <p role="alert" className="max-w-xs text-[12px] text-[var(--danger)] sm:text-right">{error}</p>}
      {result && (
        <div className="os-drawer max-w-sm rounded-[12px] border border-[var(--border)] bg-white p-3 text-[12px] text-[var(--muted)] shadow-md" role="status">
          <p className="mb-1 font-medium text-[var(--foreground)]">Loop completed</p>
          <ul className="space-y-0.5">
            <li>Website leads ingested: {result.ingested}</li>
            <li>Tasks scheduled: {result.scheduled.length ? result.scheduled.join(", ") : "none new (already scheduled today)"}</li>
            {result.workflows && <li>Workflows advanced: {result.workflows.advanced}</li>}
            <li>Top priority: {result.topPriorities[0]?.title ?? "INSUFFICIENT DATA"}</li>
          </ul>
        </div>
      )}
    </div>
  );
}
