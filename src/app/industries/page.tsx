import type { Metadata } from "next";
import Link from "next/link";
import {
  ShoppingCart,
  UtensilsCrossed,
  Heart,
  GraduationCap,
  Building2,
  Globe2,
  Truck,
  Home,
  Briefcase,
  TrendingUp,
  ArrowRight,
} from "lucide-react";
import SectionHeader from "@/components/ui/SectionHeader";
import IndustryCard from "@/components/ui/IndustryCard";
import CTASection from "@/components/ui/CTASection";
import { INDUSTRIES } from "@/lib/data";

export const metadata: Metadata = {
  title: "Industry Software Solutions in Ghana | Retail, Healthcare, Education & More | RaveSoft",
  description:
    "Software solutions for every industry in Ghana and Africa. RaveSoft builds technology for retail, healthcare, education, hospitality, logistics, manufacturing, and 20+ other industries.",
  keywords: [
    "industry software solutions Ghana",
    "retail software Ghana",
    "healthcare software Ghana",
    "education software Ghana",
    "hospitality software Ghana",
    "logistics software Ghana",
    "manufacturing software Ghana",
  ],
};

const INDUSTRY_ICONS: Record<string, React.ReactNode> = {
  ShoppingCart: <ShoppingCart className="w-5 h-5" />,
  UtensilsCrossed: <UtensilsCrossed className="w-5 h-5" />,
  Heart: <Heart className="w-5 h-5" />,
  GraduationCap: <GraduationCap className="w-5 h-5" />,
  Building2: <Building2 className="w-5 h-5" />,
  Globe2: <Globe2 className="w-5 h-5" />,
  Truck: <Truck className="w-5 h-5" />,
  Home: <Home className="w-5 h-5" />,
  Briefcase: <Briefcase className="w-5 h-5" />,
  TrendingUp: <TrendingUp className="w-5 h-5" />,
};

export default function IndustriesPage() {
  return (
    <>
      {/* HERO */}
      <section className="relative bg-[#050816] pt-32 pb-20 lg:pt-40 lg:pb-28 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-blue-700/14 rounded-full blur-[130px]" />
        </div>
        <div className="relative max-w-[1280px] mx-auto px-5 sm:px-8 lg:px-10 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/12 border border-blue-500/25 mb-7">
            <span className="text-sm text-blue-400 font-medium">Industries We Serve</span>
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-[3.25rem] font-black text-white leading-[1.08] tracking-tighter mb-6">
            Digital Solutions for Businesses{" "}
            <span className="bg-gradient-to-r from-blue-400 to-blue-300 bg-clip-text text-transparent">
              That Run Real Operations
            </span>
          </h1>
          <p className="text-gray-400 text-lg leading-relaxed max-w-3xl mx-auto">
            We have built technology solutions for businesses across ten major industry sectors
            spanning all African countries and internationally. Our team understands the specific
            challenges, workflows, and compliance requirements that vary by sector and country.
          </p>
        </div>
      </section>

      {/* INDUSTRIES GRID */}
      <section className="bg-[#F5F7FA] section-padding">
        <div className="max-w-[1280px] mx-auto px-5 sm:px-8 lg:px-10">
          <SectionHeader
            eyebrow="All Industries"
            title="Sector-specific solutions built on deep operational knowledge"
            className="mb-14"
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {INDUSTRIES.map((industry, i) => (
              <IndustryCard
                key={industry.id}
                name={industry.name}
                description={industry.description}
                icon={INDUSTRY_ICONS[industry.icon]}
                solutions={industry.solutions}
                href={`/industries/${industry.id}`}
                index={i}
              />
            ))}
          </div>
        </div>
      </section>

      {/* CROSS-INDUSTRY NOTE */}
      <section className="bg-white section-padding">
        <div className="max-w-[1280px] mx-auto px-5 sm:px-8 lg:px-10 text-center">
          <SectionHeader
            eyebrow="Cross-Industry Expertise"
            title="Many of our capabilities work across multiple sectors"
            description="Websites, custom software, mobile apps, automation, POS systems, and ERP platforms all transfer across industries. If your sector isn't listed, we still have the capability to build for you — tell us about your operations."
            className="mb-10"
          />
          <Link
            href="/contact"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-base transition-all shadow-xl shadow-blue-600/30"
          >
            Discuss Your Industry
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* CTA */}
      <CTASection />
    </>
  );
}
