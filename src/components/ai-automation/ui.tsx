import Link from "next/link";
import { ArrowRight, ChevronRight } from "lucide-react";
import {
  Home, Heart, Building2, ShoppingCart, Truck, TrendingUp, Briefcase, GraduationCap, Cog, Layers, MessageCircle, Megaphone, Target, Headphones, CalendarCheck, Wallet, Users, ClipboardList, BarChart3, Wrench,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

/** RaveSoft brand tokens for the AI Automation pages. */
export const BRAND = { blue: "#060297", navy: "#071536", amber: "#FFB200", light: "#F7F9FC", text: "#172033", muted: "#64748B" } as const;

export const ICONS: Record<string, LucideIcon> = { Home, Heart, Building2, ShoppingCart, Truck, TrendingUp, Briefcase, GraduationCap, Cog, Layers, MessageCircle, Megaphone, Target, Headphones, CalendarCheck, Wallet, Users, ClipboardList, BarChart3, Wrench };
export const iconFor = (name: string): LucideIcon => ICONS[name] ?? Layers;

export function Container({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn("mx-auto w-full max-w-[1200px] px-5 sm:px-8 lg:px-10", className)}>{children}</div>;
}

export function Section({ id, tone = "white", className, children, labelledBy }: { id?: string; tone?: "white" | "light" | "navy"; className?: string; children: React.ReactNode; labelledBy?: string }) {
  const bg = tone === "navy" ? "bg-[#071536] text-white" : tone === "light" ? "bg-[#F7F9FC] text-[#172033]" : "bg-white text-[#172033]";
  return (
    <section id={id} aria-labelledby={labelledBy} className={cn("scroll-mt-20 py-14 sm:py-16 lg:py-24", bg, className)}>
      <Container>{children}</Container>
    </section>
  );
}

export function SectionHeading({ id, eyebrow, title, intro, tone = "light", align = "left" }: { id?: string; eyebrow?: string; title: string; intro?: string; tone?: "light" | "dark"; align?: "left" | "center" }) {
  return (
    <div className={cn("mb-10 max-w-3xl lg:mb-12", align === "center" && "mx-auto text-center")}>
      {eyebrow && <p className={cn("mb-3 text-xs font-bold uppercase tracking-[0.14em]", tone === "dark" ? "text-[#FFB200]" : "text-[#060297]")}>{eyebrow}</p>}
      <h2 id={id} className={cn("text-[1.65rem] font-bold leading-tight tracking-tight sm:text-3xl lg:text-[2.1rem]", tone === "dark" ? "text-white" : "text-[#071536]")}>{title}</h2>
      {intro && <p className={cn("mt-4 text-base leading-relaxed sm:text-lg", tone === "dark" ? "text-slate-300" : "text-[#64748B]")}>{intro}</p>}
    </div>
  );
}

export function CtaLink({ href, children, variant = "primary", className, onDark = false }: { href: string; children: React.ReactNode; variant?: "primary" | "secondary"; className?: string; onDark?: boolean }) {
  const base = "inline-flex min-h-[48px] w-full items-center justify-center gap-2 whitespace-nowrap rounded-lg px-5 text-center sm:w-auto text-[15px] font-bold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2";
  const styles =
    variant === "primary"
      ? "bg-[#FFB200] text-[#071536] hover:bg-[#ffc233] focus-visible:ring-[#FFB200]"
      : onDark
        ? "border border-white/30 text-white hover:bg-white/10 focus-visible:ring-white"
        : "border border-[#060297]/30 text-[#060297] hover:bg-[#060297]/5 focus-visible:ring-[#060297]";
  return (
    <Link href={href} className={cn(base, styles, className)}>
      {children}
      {variant === "primary" && <ArrowRight className="h-4 w-4" aria-hidden="true" />}
    </Link>
  );
}

export function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn("rounded-lg border border-slate-200 bg-white p-6", className)}>{children}</div>;
}

export function IconBox({ icon: Icon, tone = "blue" }: { icon: LucideIcon; tone?: "blue" | "amber" }) {
  return (
    <span className={cn("inline-flex h-11 w-11 items-center justify-center rounded-lg", tone === "amber" ? "bg-[#FFB200]/15 text-[#8a5f00]" : "bg-[#060297]/8 text-[#060297]")}>
      <Icon className="h-5 w-5" aria-hidden="true" />
    </span>
  );
}

export function Breadcrumbs({ items, dark = false }: { items: Array<{ name: string; href?: string }>; dark?: boolean }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-6">
      <ol className={cn("flex flex-wrap items-center gap-1.5 text-sm", dark ? "text-slate-300" : "text-[#64748B]")}>
        {items.map((it, i) => (
          <li key={it.name} className="flex items-center gap-1.5">
            {i > 0 && <ChevronRight className="h-3.5 w-3.5 opacity-60" aria-hidden="true" />}
            {it.href && i < items.length - 1 ? <Link href={it.href} className="underline-offset-4 hover:underline">{it.name}</Link> : <span aria-current={i === items.length - 1 ? "page" : undefined} className={dark ? "text-white" : "text-[#172033]"}>{it.name}</span>}
          </li>
        ))}
      </ol>
    </nav>
  );
}

/** Six-step progress used in the hero starter and the engine. */
export function StepDots({ current, total = 6 }: { current: number; total?: number }) {
  return (
    <div aria-hidden="true" className="flex items-center gap-1.5">
      {Array.from({ length: total }, (_, i) => (
        <span key={i} className={cn("h-1.5 flex-1 rounded-full", i + 1 < current ? "bg-[#060297]" : i + 1 === current ? "bg-[#FFB200]" : "bg-slate-200")} />
      ))}
    </div>
  );
}
