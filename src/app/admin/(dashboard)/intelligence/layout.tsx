import IntelNav from "@/components/analytics/IntelNav";

export const dynamic = "force-dynamic";

/** Visual shell only. Authorisation is enforced inside every page (layouts are not re-run on client navigation). */
export default function IntelligenceLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-400"><span className="inline-block h-2 w-2 rounded-full bg-[#FFB200]" />RaveSoft Intelligence</div>
      <IntelNav />
      {children}
    </div>
  );
}
