import Link from "next/link";
import { ArrowRight, Calendar } from "lucide-react";
import { COMPANY } from "@/lib/data";

interface CTASectionProps {
  headline?: string;
  subheadline?: string;
  primaryCTA?: { label: string; href: string };
  secondaryCTA?: { label: string; href: string };
  showWhatsApp?: boolean;
  dark?: boolean;
}

export default function CTASection({
  headline = "Ready to Build the Digital System Your Business Needs?",
  subheadline = "Tell us what you want to build. We will help you turn it into a clear strategy, modern design, scalable software, and a system your business can depend on.",
  primaryCTA = { label: "Book a Free Consultation", href: "/book-consultation" },
  secondaryCTA = { label: "Contact Us", href: "/contact" },
  showWhatsApp = true,
  dark = true,
}: CTASectionProps) {
  if (dark) {
    return (
      <section className="bg-[#050816] relative overflow-hidden">
        {/* Background glows */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] bg-blue-600/12 rounded-full blur-[130px]" />
          <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-[300px] h-[300px] bg-amber-500/6 rounded-full blur-[100px]" />
          <div className="absolute top-1/2 right-1/4 -translate-y-1/2 w-[300px] h-[300px] bg-indigo-500/8 rounded-full blur-[100px]" />
          {/* Grid */}
          <div className="absolute inset-0 bg-grid-dark opacity-50" />
          {/* Decorative lines */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-px h-32 bg-gradient-to-b from-transparent to-blue-500/30" />
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-px h-32 bg-gradient-to-t from-transparent to-blue-500/30" />
        </div>

        <div className="relative max-w-[1280px] mx-auto px-5 sm:px-8 lg:px-10 py-24 lg:py-32 text-center">
          {/* Eyebrow */}
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-blue-500/12 border border-blue-500/25 text-xs font-bold tracking-widest uppercase text-blue-400 mb-7">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
            Get Started Today
          </div>

          <h2 className="text-4xl sm:text-5xl lg:text-[3.5rem] font-bold text-white mb-6 max-w-3xl mx-auto leading-[1.1] tracking-tight">
            {headline}
          </h2>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto mb-10 leading-relaxed">
            {subheadline}
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href={primaryCTA.href}
              className="flex items-center gap-2 px-8 py-4 rounded-xl text-white font-bold text-base transition-all"
              style={{
                background: "linear-gradient(135deg, #F59E0B, #D97706)",
                boxShadow: "0 8px 32px rgba(245,158,11,0.4), inset 0 1px 0 rgba(255,255,255,0.15)"
              }}
            >
              {primaryCTA.label}
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href={secondaryCTA.href}
              className="flex items-center gap-2 px-8 py-4 rounded-xl border border-white/20 hover:border-white/40 text-white font-semibold text-base transition-all hover:bg-white/5"
            >
              <Calendar className="w-4 h-4" />
              {secondaryCTA.label}
            </Link>
            {showWhatsApp && (
              <a
                href={`https://wa.me/${COMPANY.whatsapp}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-8 py-4 rounded-xl bg-green-600/15 border border-green-500/25 hover:bg-green-600/25 text-green-400 font-semibold text-base transition-all"
              >
                Chat on WhatsApp
              </a>
            )}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="relative overflow-hidden" style={{ background: "linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%)" }}>
      <div className="absolute inset-0 bg-grid-dark opacity-30 pointer-events-none" />
      <div className="relative max-w-[1280px] mx-auto px-5 sm:px-8 lg:px-10 py-16 lg:py-20">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-8">
          <div>
            <h2 className="text-2xl lg:text-3xl font-bold text-white mb-2">{headline}</h2>
            <p className="text-blue-100 max-w-xl">{subheadline}</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 shrink-0">
            <Link
              href={primaryCTA.href}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-white text-blue-700 font-semibold text-sm hover:bg-blue-50 transition-all"
            >
              {primaryCTA.label}
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href={secondaryCTA.href}
              className="flex items-center gap-2 px-6 py-3 rounded-xl border-2 border-white/40 text-white font-semibold text-sm hover:bg-white/10 transition-all"
            >
              {secondaryCTA.label}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
