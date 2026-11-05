"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  url: string;
  current: string | null;
  options: string[];
}

/** Assign a live chat to a team member (or release it). */
export default function ChatAssign({ url, current, options }: Props) {
  const router = useRouter();
  const [value, setValue] = useState(current ?? "");
  const [msg, setMsg] = useState<string | null>(null);

  async function change(next: string) {
    const previous = value;
    setValue(next);
    setMsg(null);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "assign", assignee: next || null }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || json?.ok === false) throw new Error(json?.error ?? "Failed");
      router.refresh();
    } catch {
      setValue(previous);
      setMsg("Could not assign.");
    }
  }

  const all = current && !options.includes(current) ? [current, ...options] : options;
  return (
    <div>
      <select
        aria-label="Assign chat"
        value={value}
        onChange={(e) => void change(e.target.value)}
        className="w-full rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-sm"
      >
        <option value="">Unassigned</option>
        {all.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
      {msg && <p className="mt-1 text-xs text-red-600">{msg}</p>}
    </div>
  );
}
