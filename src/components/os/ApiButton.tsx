"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

interface Props {
  label: string;
  url: string;
  method?: "POST" | "PATCH" | "PUT";
  body?: unknown;
  confirm?: string;
  variant?: "primary" | "secondary" | "danger";
  size?: "sm" | "md";
  /** Names a formatter that reads the server's real response — never a canned success string. (Plain string so Server Components can pass it.) */
  result?: ResultFormat;
}

export type ResultFormat = "seed" | "loop" | "queue" | "taskQueued" | "draft" | "submitted" | "execution";

type Data = Record<string, unknown> | null | undefined;
const FORMATTERS: Record<ResultFormat, (d: Data) => string | null> = {
  seed: (d) => `Created ${d?.agentsCreated ?? 0} agents, ${d?.templatesCreated ?? 0} templates.`,
  loop: (d) => `Scheduled: ${((d?.loop as { scheduled?: string[] } | undefined)?.scheduled ?? []).join(", ") || "nothing new today"}. Queue is processing.`,
  queue: (d) => `Processed ${((d?.queue as { processed?: unknown[] } | undefined)?.processed ?? []).length} task(s).`,
  taskQueued: (d) => `Task #${d?.taskId} queued.`,
  draft: (d) => (d?.hasAddress ? "Draft created." : "Draft created, but this prospect has no email address."),
  submitted: () => "Sent to the approvals inbox. Nothing has been sent.",
  execution: (d) => ((d?.executionResult as { ok?: boolean } | undefined)?.ok === false ? "Approved, but execution failed." : "Executed."),
};

const STYLES = {
  primary: "bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)]",
  secondary: "bg-white text-gray-800 border border-gray-300 hover:bg-gray-50",
  danger: "bg-white text-red-700 border border-red-300 hover:bg-red-50",
};

export default function ApiButton({ label, url, method = "POST", body, confirm, variant = "secondary", size = "sm", result }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function run() {
    if (confirm && !window.confirm(confirm)) return;
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body ?? {}) });
      const json = await res.json().catch(() => null);
      if (!res.ok || json?.ok === false) {
        setMsg({ ok: false, text: json?.error ?? `Request failed (${res.status}).` });
      } else {
        setMsg({ ok: true, text: (result && FORMATTERS[result](json?.data)) || "Done." });
        startTransition(() => router.refresh());
      }
    } catch {
      setMsg({ ok: false, text: "Network error — nothing was changed." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <span className="inline-flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={run}
        disabled={busy || pending}
        className={cn("rounded-lg font-medium transition-colors disabled:opacity-50", size === "sm" ? "px-3 py-1.5 text-xs" : "px-4 py-2 text-sm", STYLES[variant])}
      >
        {busy ? "Working…" : label}
      </button>
      {msg && <span className={cn("max-w-xs text-xs", msg.ok ? "text-emerald-700" : "text-red-700")}>{msg.text}</span>}
    </span>
  );
}
