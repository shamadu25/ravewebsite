import { cn } from "@/lib/utils";

export function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return <section className={cn("rounded-2xl border border-gray-200 bg-white p-5", className)}>{children}</section>;
}

export function Stat({ label, value, hint, tone }: { label: string; value: string; hint?: string; tone?: "bad" | "good" }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4">
      <p className="text-xs uppercase tracking-wide text-gray-500">{label}</p>
      <p className={cn("mt-1 text-2xl font-semibold text-gray-900", tone === "bad" && "text-red-700", tone === "good" && "text-emerald-700")}>{value}</p>
      {hint && <p className="mt-1 text-xs text-gray-500">{hint}</p>}
    </div>
  );
}

const BADGE: Record<string, string> = {
  ACTIVE: "bg-emerald-50 text-emerald-700", COMPLETED: "bg-emerald-50 text-emerald-700", GREEN: "bg-emerald-50 text-emerald-700", SENT: "bg-emerald-50 text-emerald-700", APPROVED: "bg-emerald-50 text-emerald-700", WON: "bg-emerald-50 text-emerald-700",
  RUNNING: "bg-blue-50 text-blue-700", QUEUED: "bg-gray-100 text-gray-700", DRAFT: "bg-gray-100 text-gray-700", PAUSED: "bg-amber-50 text-amber-700",
  WAITING_APPROVAL: "bg-amber-50 text-amber-800", PENDING: "bg-amber-50 text-amber-800", YELLOW: "bg-amber-50 text-amber-800", REQUIRES_APPROVAL: "bg-amber-50 text-amber-800", PENDING_APPROVAL: "bg-amber-50 text-amber-800",
  FAILED: "bg-red-50 text-red-700", RED: "bg-red-50 text-red-700", ERROR: "bg-red-50 text-red-700", REJECTED: "bg-red-50 text-red-700", BLOCKED: "bg-red-50 text-red-700", LOST: "bg-red-50 text-red-700", CRITICAL: "bg-red-50 text-red-700", HIGH: "bg-orange-50 text-orange-700",
};

export function Badge({ children }: { children: string }) {
  return <span className={cn("inline-block rounded-full px-2 py-0.5 text-[11px] font-medium", BADGE[children] ?? "bg-gray-100 text-gray-700")}>{children.replace(/_/g, " ")}</span>;
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">{title}</h1>
        {subtitle && <p className="mt-1 max-w-2xl text-sm text-gray-500">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export const usd = (n: number | null | undefined) => (n == null ? "—" : `$${Math.round(n).toLocaleString()}`);
export const centsToUsd = (c: number | null | undefined) => (c == null ? "—" : usd(c / 100));
export const ago = (d: Date | null | undefined) => {
  if (!d) return "—";
  const m = Math.round((Date.now() - d.getTime()) / 60000);
  return m < 1 ? "just now" : m < 60 ? `${m}m ago` : m < 1440 ? `${Math.round(m / 60)}h ago` : `${Math.round(m / 1440)}d ago`;
};
