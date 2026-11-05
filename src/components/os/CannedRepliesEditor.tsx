"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Row {
  id: number;
  title: string;
  body: string;
}

const API = "/api/os/canned-replies";
const field = "w-full rounded-[10px] border border-[var(--border)] bg-white px-3 py-2 text-[14px] focus:border-[var(--primary-bright)] focus:outline-none";

/** Create, edit, reorder and delete the team's canned replies. */
export default function CannedRepliesEditor({ rows, usingDefaults }: { rows: Row[]; usingDefaults: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [draft, setDraft] = useState<Record<number, { title: string; body: string }>>({});
  const [newTitle, setNewTitle] = useState("");
  const [newBody, setNewBody] = useState("");

  async function call(key: string, payload: Record<string, unknown>): Promise<boolean> {
    setBusy(key);
    setMsg(null);
    try {
      const res = await fetch(API, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const json = await res.json().catch(() => null);
      if (!res.ok || json?.ok === false) throw new Error(json?.error ?? `Request failed (${res.status}).`);
      setMsg({ ok: true, text: json?.data?.message ?? "Saved." });
      router.refresh();
      return true;
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : "Something went wrong." });
      return false;
    } finally {
      setBusy(null);
    }
  }

  const value = (r: Row) => draft[r.id] ?? { title: r.title, body: r.body };
  const dirty = (r: Row) => draft[r.id] && (draft[r.id].title !== r.title || draft[r.id].body !== r.body);

  return (
    <div className="space-y-6">
      {msg && <p role="status" className={`text-sm ${msg.ok ? "text-green-700" : "text-red-600"}`}>{msg.text}</p>}

      {usingDefaults && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <p className="font-medium">You are using the built-in replies.</p>
          <p className="mt-1 text-amber-800">Copy them here to edit, reorder or delete them, or just add your own below (that replaces the built-in set).</p>
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => void call("seed", { action: "seed_defaults" })}
            className="mt-3 rounded-lg bg-amber-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50"
          >
            {busy === "seed" ? "Copying…" : "Copy the defaults so I can edit them"}
          </button>
        </div>
      )}

      {rows.map((r, i) => (
        <div key={r.id} className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
          <div className="flex items-center gap-2">
            <input
              aria-label="Reply title"
              value={value(r).title}
              maxLength={80}
              onChange={(e) => setDraft((d) => ({ ...d, [r.id]: { ...value(r), title: e.target.value } }))}
              className={field}
            />
            <button type="button" aria-label="Move up" disabled={busy !== null || i === 0} onClick={() => void call(`m${r.id}`, { action: "move", id: r.id, direction: "up" })} className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm disabled:opacity-30">↑</button>
            <button type="button" aria-label="Move down" disabled={busy !== null || i === rows.length - 1} onClick={() => void call(`m${r.id}`, { action: "move", id: r.id, direction: "down" })} className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm disabled:opacity-30">↓</button>
          </div>
          <textarea
            aria-label="Reply text"
            rows={3}
            maxLength={2000}
            value={value(r).body}
            onChange={(e) => setDraft((d) => ({ ...d, [r.id]: { ...value(r), body: e.target.value } }))}
            className={field}
          />
          <div className="flex gap-2">
            <button
              type="button"
              disabled={busy !== null || !dirty(r)}
              onClick={() => void call(`s${r.id}`, { action: "update", id: r.id, ...value(r) }).then((ok) => ok && setDraft((d) => { const n = { ...d }; delete n[r.id]; return n; }))}
              className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-40"
            >
              {busy === `s${r.id}` ? "Saving…" : "Save"}
            </button>
            <button
              type="button"
              disabled={busy !== null}
              onClick={() => { if (window.confirm(`Delete "${r.title}"?`)) void call(`d${r.id}`, { action: "delete", id: r.id }); }}
              className="rounded-lg border border-red-200 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-40"
            >
              Delete
            </button>
          </div>
        </div>
      ))}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void call("new", { action: "create", title: newTitle, body: newBody }).then((ok) => {
            if (ok) { setNewTitle(""); setNewBody(""); }
          });
        }}
        className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-4 space-y-3"
      >
        <p className="text-sm font-semibold text-gray-900">Add a reply</p>
        <input aria-label="New reply title" required minLength={2} maxLength={80} placeholder="Title, e.g. Pricing — ask what they need" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} className={field} />
        <textarea aria-label="New reply text" required minLength={2} maxLength={2000} rows={3} placeholder="Text. Use {name} where the visitor's first name should go, e.g. “Happy to help{name}.”" value={newBody} onChange={(e) => setNewBody(e.target.value)} className={field} />
        <button type="submit" disabled={busy !== null} className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50">
          {busy === "new" ? "Adding…" : "Add reply"}
        </button>
      </form>
    </div>
  );
}
