import type { Metadata } from "next";
import Link from "next/link";
import {
  Code2,
  Layers,
  Globe,
  Smartphone,
  Zap,
  LayoutDashboard,
  ArrowRight,
} from "lucide-react";
import SectionHeader from "@/components/ui/SectionHeader";
import ServiceCard from "@/components/ui/ServiceCard";
import CTASection from "@/components/ui/CTASection";
import { SERVICES } from "@/lib/data";

export const metadata: Metadata = {
  title: "Software Development Services in Ghana & Africa | RaveSoft Digital Solutions",
  description:
    "Full-service software company in Ghana — custom software development, SaaS platforms, website design, mobile app development, business automation, and POS/ERP systems for businesses across Africa.",
  keywords: [
    "software services Ghana",
    "custom software development Ghana",
    "website design Ghana",
    "mobile app development Ghana",
    "business automation Ghana",
    "POS system Ghana",
    "software company services Africa",
  ],
};

const SERVICE_ICONS: Record<string, React.ReactNode> = {
  Code2: <Code2 className="w-5 h-5" />,
  Layers: <Layers className="w-5 h-5" />,
  Globe: <Globe className="w-5 h-5" />,
  Smartphone: <Smartphone className="w-5 h-5" />,
  Zap: <Zap className="w-5 h-5" />,
  LayoutDashboard: <LayoutDashboard className="w-5 h-5" />,
};

export default function ServicesPage() {
  return (
    <>
      {/* HERO */}
      <section className="relative bg-[#050816] pt-32 pb-20 lg:pt-40 lg:pb-28 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute bg-grid-dark inset-0 opacity-60" />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-blue-700/14 rounded-full blur-[130px]" />
          <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-[300px] h-[300px] bg-amber-500/5 rounded-full blur-[100px]" />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-px h-24 bg-gradient-to-b from-transparent to-blue-500/30" />
        </div>
        <div className="relative max-w-[1280px] mx-auto px-5 sm:px-8 lg:px-10 text-center">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-blue-500/12 border border-blue-500/25 mb-7">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
            <span className="text-sm text-blue-400 font-semibold">What We Build</span>
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-[3.5rem] font-black text-white leading-[1.08] tracking-tighter mb-6 max-w-4xl mx-auto">
            Software & Digital Services for{" "}
            <span style={{background:"linear-gradient(135deg,#60A5FA,#818CF8)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",backgroundClip:"text"}}>
              Businesses That Demand Results
            </span>
          </h1>
          <p className="text-gray-400 text-lg leading-relaxed max-w-3xl mx-auto mb-10">
            From websites and mobile apps to full ERP systems and automation platforms, we build
            the digital infrastructure that helps businesses operate smarter, serve customers
            better, and grow faster.
          </p>
          <Link
            href="/contact"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-base transition-all shadow-xl shadow-blue-600/30"
          >
            Discuss Your Project
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* SERVICES GRID */}
      <section className="bg-[#F8FAFB] section-padding">
        <div className="max-w-[1280px] mx-auto px-5 sm:px-8 lg:px-10">
          <SectionHeader
            eyebrow="All Services"
            title="Six core capability areas. One integrated team."
            description="Every service we offer is designed to solve specific operational and growth challenges your business faces today."
            className="mb-14"
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {SERVICES.map((service, i) => (
              <ServiceCard
                key={service.id}
                title={service.title}
                description={service.shortDescription}
                icon={SERVICE_ICONS[service.icon]}
                href={`/services/${service.slug}`}
                index={i}
              />
            ))}
          </div>
        </div>
      </section>

      {/* APPROACH */}
      <section className="bg-white section-padding">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <SectionHeader
            eyebrow="Our Approach"
            title="Every engagement starts with understanding your business"
            description="We don't start building until we understand your operations, your customers, your biggest problems, and your most important goals. Every system we build is designed around how your business actually works."
            className="mb-10"
          />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left mt-12">
            {[
              { num: "01", title: "Discovery & Strategy", desc: "We map your operations, identify gaps, and define the right scope before writing any code." },
              { num: "02", title: "Build & Iterate", desc: "We build in structured sprints, showing you progress at every stage for continuous feedback." },
              { num: "03", title: "Launch & Support", desc: "We deploy your system, train your team, and stay available for long-term support and iteration." },
            ].map((item) => (
              <div key={item.num} className="p-6 rounded-2xl bg-[#F5F7FA] border border-gray-100">
                <div className="text-3xl font-black text-blue-100 mb-3">{item.num}</div>
                <h3 className="font-bold text-gray-900 mb-2">{item.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <CTASection
        headline="Not sure which service you need?"
        subheadline="Tell us about your business challenges and we will recommend the right solution."
        primaryCTA={{ label: "Start a Conversation", href: "/contact" }}
        secondaryCTA={{ label: "Book a Free Consultation", href: "/book-consultation" }}
      />
    </>
  );
}
