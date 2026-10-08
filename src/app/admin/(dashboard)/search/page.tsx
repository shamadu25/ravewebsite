import Link from "next/link";
import { PageHeader, Card } from "@/components/os/ui";
import { cookies, headers } from "next/headers";

export const dynamic = "force-dynamic";

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  let results: Array<{ type: string; title: string; subtitle: string; href: string }> = [];
  if (q && q.trim().length >= 2) {
    const h = await headers();
    const base = `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;
    const res = await fetch(`${base}/api/os/search?q=${encodeURIComponent(q)}`, { headers: { cookie: (await cookies()).toString() }, cache: "no-store" });
    if (res.ok) results = (await res.json()).data.results;
  }
  return (
    <div className="space-y-4">
      <PageHeader title="Search" subtitle="Customers, prospects, agents, tasks, knowledge, decisions and audit events." />
      <form className="flex gap-2"><input name="q" defaultValue={q} placeholder="Search…" className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm" /><button className="rounded-lg bg-[var(--primary)] px-4 py-2 text-sm text-white">Search</button></form>
      {q && results.length === 0 && <p className="text-sm text-gray-500">No results for “{q}”.</p>}
      <Card><ul className="divide-y divide-gray-100 text-sm">{results.map((r, i) => <li key={i} className="py-2"><Link href={r.href} className="block"><span className="mr-2 text-[11px] uppercase text-gray-400">{r.type}</span><span className="font-medium text-gray-900">{r.title}</span><span className="block text-xs text-gray-500">{r.subtitle}</span></Link></li>)}</ul></Card>
    </div>
  );
}
