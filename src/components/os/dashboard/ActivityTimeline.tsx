import Link from "next/link";
import { Check } from "lucide-react";
import { recentActivity } from "@/lib/os/activity";
import { ago } from "@/components/os/ui";

export default async function ActivityTimeline() {
  const items = await recentActivity(6);
  return (
    <section className="os-card p-6" aria-labelledby="activity">
      <h2 id="activity" className="mb-4 text-[18px] font-semibold tracking-tight">Recent Activity</h2>
      {items.length === 0 ? <p className="py-6 text-center text-[13px] text-[var(--muted)]">No activity yet. Actions taken by you and your AI Employees appear here.</p> : (
        <ol className="relative space-y-4 before:absolute before:bottom-2 before:left-[7px] before:top-2 before:w-px before:bg-[var(--border)]">
          {items.map((a) => {
            const inner = (
              <>
                <span aria-hidden className={`relative z-10 mt-0.5 flex h-[15px] w-[15px] shrink-0 items-center justify-center rounded-full border-2 border-white ${a.tone === "success" ? "bg-[var(--success)] text-white" : a.tone === "danger" ? "bg-[var(--danger)]" : "bg-[var(--primary-bright)]"}`}>{a.tone === "success" && <Check className="h-2.5 w-2.5" strokeWidth={4} />}</span>
                <span className="min-w-0 flex-1"><span className="block text-[14px] font-medium">{a.title}</span>{a.detail && <span className="block truncate text-[12px] text-[var(--muted)]">{a.detail}</span>}<span className="block text-[12px] text-slate-400">{ago(a.at)}</span></span>
              </>
            );
            return <li key={a.id}>{a.href ? <Link href={a.href} className="flex gap-3 rounded-lg hover:opacity-80">{inner}</Link> : <div className="flex gap-3">{inner}</div>}</li>;
          })}
        </ol>
      )}
    </section>
  );
}
