"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export interface Field {
  name: string;
  label: string;
  type?: "text" | "number" | "email" | "textarea" | "select" | "checkbox";
  options?: string[];
  required?: boolean;
  placeholder?: string;
  defaultValue?: string | number | boolean;
}

interface Props {
  url: string;
  method?: "POST" | "PUT" | "PATCH";
  fields: Field[];
  submitLabel: string;
  /** Extra constant body fields. */
  extra?: Record<string, unknown>;
}

export default function ApiForm({ url, method = "POST", fields, submitLabel, extra }: Props) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const body: Record<string, unknown> = { ...extra };
    for (const f of fields) {
      const raw = form.get(f.name);
      if (f.type === "checkbox") body[f.name] = raw === "on";
      else if (raw === null || raw === "") continue;
      else body[f.name] = f.type === "number" ? Number(raw) : String(raw);
    }
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const json = await res.json().catch(() => null);
      if (!res.ok || json?.ok === false) setMsg({ ok: false, text: json?.error ?? `Request failed (${res.status}).` });
      else {
        setMsg({ ok: true, text: typeof json?.data?.message === "string" ? json.data.message : "Saved." });
        startTransition(() => router.refresh());
      }
    } catch {
      setMsg({ ok: false, text: "Network error — nothing was saved." });
    } finally {
      setBusy(false);
    }
  }

  const input = "w-full rounded-[10px] border border-[var(--border)] bg-white px-3 py-2 text-[14px] focus:border-[var(--primary-bright)] focus:outline-none";
  return (
    <form onSubmit={onSubmit} className="grid gap-3 sm:grid-cols-2">
      {fields.map((f) => (
        <label key={f.name} className={f.type === "textarea" ? "sm:col-span-2" : ""}>
          <span className="mb-1 block text-xs font-medium text-gray-600">{f.label}</span>
          {f.type === "textarea" ? (
            <textarea name={f.name} required={f.required} placeholder={f.placeholder} defaultValue={f.defaultValue as string} rows={4} className={input} />
          ) : f.type === "select" ? (
            <select name={f.name} defaultValue={f.defaultValue as string} className={input}>
              {f.options?.map((o) => <option key={o}>{o}</option>)}
            </select>
          ) : f.type === "checkbox" ? (
            <input type="checkbox" name={f.name} defaultChecked={Boolean(f.defaultValue)} />
          ) : (
            <input name={f.name} type={f.type ?? "text"} step="any" required={f.required} placeholder={f.placeholder} defaultValue={f.defaultValue as string} className={input} />
          )}
        </label>
      ))}
      <div className="sm:col-span-2 flex items-center gap-3">
        <button disabled={busy} className="rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--primary-hover)] disabled:opacity-50">{busy ? "Saving…" : submitLabel}</button>
        {msg && <span className={msg.ok ? "text-xs text-emerald-700" : "text-xs text-red-700"}>{msg.text}</span>}
      </div>
    </form>
  );
}
