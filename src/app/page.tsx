import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import FAQSchema from "@/components/seo/FAQSchema";
import {
  Code2,
  Layers,
  Globe,
  Smartphone,
  Zap,
  LayoutDashboard,
  ArrowRight,
  Search,
  Map,
  PenTool,
  Rocket,
  HeartHandshake,
  Target,
  Wrench,
  Package,
  TrendingUp,
  Shield,
  ShoppingCart,
  UtensilsCrossed,
  Heart,
  GraduationCap,
  Building2,
  Globe2,
  Truck,
  Home,
  Briefcase,
} from "lucide-react";
import SectionHeader from "@/components/ui/SectionHeader";
import ServiceCard from "@/components/ui/ServiceCard";
import ProductCard from "@/components/ui/ProductCard";
import CaseStudyCard from "@/components/ui/CaseStudyCard";
import IndustryCard from "@/components/ui/IndustryCard";
import ProcessStep from "@/components/ui/ProcessStep";
import CTASection from "@/components/ui/CTASection";
import ProofBar from "@/components/ui/ProofBar";
import TestimonialsSection from "@/components/ui/TestimonialsSection";
import FAQAccordion from "@/components/ui/FAQAccordion";
import {
  SERVICES,
  PRODUCTS,
  CASE_STUDIES,
  INDUSTRIES,
  PROCESS_STEPS,
  TECH_STACK,
  WHY_RAVESOFT,
  PROOF_ITEMS,
  TESTIMONIALS,
  FAQ_ITEMS,
} from "@/lib/data";

export const metadata: Metadata = {
  title: "Software Company in Ghana | Custom Software, POS, ERP & Web Development — RaveSoft",
  description:
    "RaveSoft is Ghana's #1 software company. We build custom software, POS systems, ERP, mobile apps, SaaS products, and premium websites for businesses across Ghana, Nigeria, Kenya, South Africa, and all 54 African countries.",
  keywords: [
    "software company in Ghana",
    "software development company Ghana",
    "tech company Ghana",
    "custom software Ghana",
    "POS system Ghana",
    "ERP system Ghana",
    "website design Ghana",
    "mobile app development Ghana",
    "SaaS development Africa",
    "RaveSoft",
  ],
  verification: {
    google: "ravesoft-google-site-verification",
  },
};

const SERVICE_ICONS: Record<string, React.ReactNode> = {
  Code2: <Code2 className="w-5 h-5" />,
  Layers: <Layers className="w-5 h-5" />,
  Globe: <Globe className="w-5 h-5" />,
  Smartphone: <Smartphone className="w-5 h-5" />,
  Zap: <Zap className="w-5 h-5" />,
  LayoutDashboard: <LayoutDashboard className="w-5 h-5" />,
};

const PROCESS_ICONS: Record<string, React.ReactNode> = {
  Search: <Search className="w-5 h-5" />,
  Map: <Map className="w-5 h-5" />,
  PenTool: <PenTool className="w-5 h-5" />,
  Code2: <Code2 className="w-5 h-5" />,
  Rocket: <Rocket className="w-5 h-5" />,
  HeartHandshake: <HeartHandshake className="w-5 h-5" />,
};

const WHY_ICONS: Record<string, React.ReactNode> = {
  Target: <Target className="w-5 h-5" />,
  Wrench: <Wrench className="w-5 h-5" />,
  Package: <Package className="w-5 h-5" />,
  Globe: <Globe className="w-5 h-5" />,
  TrendingUp: <TrendingUp className="w-5 h-5" />,
  Shield: <Shield className="w-5 h-5" />,
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

export default function HomePage() {
  return (
    <>
      <FAQSchema items={FAQ_ITEMS.map((f) => ({ question: f.question, answer: f.answer }))} />
      {/* HERO */}
      <section className="relative bg-[#050816] overflow-hidden min-h-[90vh] flex items-center">
        {/* Full-bleed background image */}
        <div className="absolute inset-0">
          <Image
            src="/img/hero1.png"
            alt="RaveSoft Digital Solutions team — building software systems for businesses across Africa"
            fill
            className="object-cover object-[right_top]"
            priority
          />
          {/* Dark base overlay for readability */}
          <div className="absolute inset-0 bg-[#050816]/65" />
          {/* Directional gradient — darker left (text area), lighter right */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#050816]/80 via-[#050816]/50 to-transparent" />
          {/* Bottom fade so section blends into next */}
          <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#050816] to-transparent" />
          {/* Subtle grid overlay */}
          <div className="absolute inset-0 bg-grid-dark opacity-20" />
          {/* Blue glow accent */}
          <div className="absolute top-[-10%] left-[-5%] w-[50vw] h-[50vw] max-w-[700px] max-h-[700px] bg-blue-700/10 rounded-full blur-[120px]" />
          <div className="absolute top-1/3 left-1/4 w-[25vw] h-[25vw] max-w-[350px] max-h-[350px] bg-amber-500/5 rounded-full blur-[100px]" />
        </div>

        <div className="relative w-full max-w-[1280px] mx-auto px-5 sm:px-8 lg:px-10 pt-36 pb-20 lg:pt-44 lg:pb-28">
          {/* Text content — left-aligned, max width to keep readable */}
          <div className="max-w-[700px]">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-2xl bg-amber-500/15 border border-amber-500/30 mb-7 animate-fade-in-up animation-delay-200">
              <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse shrink-0" />
              <span className="text-xs sm:text-sm text-amber-300 font-medium">Ghana&apos;s #1 Software Company · Serving All 54 African Countries</span>
            </div>

            {/* Headline */}
            <h1 className="text-[2.75rem] sm:text-[3.5rem] lg:text-[4.25rem] xl:text-[5rem] font-black text-white leading-[1.05] tracking-tighter mb-6 animate-fade-in-up animation-delay-300">
              Software Solutions{" "}
              <span className="block">Built to</span>
              <span style={{
                background: "linear-gradient(135deg, #60A5FA 0%, #818CF8 45%, #F59E0B 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text"
              }}>
                Power Modern African
              </span>{" "}
              <span className="block">Businesses</span>
            </h1>

            {/* Subheadline */}
            <p className="text-gray-300 text-lg leading-relaxed mb-8 max-w-[580px] animate-fade-in-up animation-delay-400">
              We design, build, and support custom software, SaaS platforms, POS &amp; ERP systems,
              mobile apps, and AI automation that help businesses across Africa run smarter,
              grow faster, and compete at a world-class level.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-4 mb-10 animate-fade-in-up animation-delay-500">
              <Link
                href="/book-consultation"
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-4 rounded-xl text-white font-bold text-base transition-all hover:-translate-y-0.5 hover:shadow-[0_12px_40px_rgba(245,158,11,0.55)]"
                style={{
                  background: "linear-gradient(135deg, #F59E0B, #D97706)",
                  boxShadow: "0 8px 32px rgba(245,158,11,0.40), inset 0 1px 0 rgba(255,255,255,0.15)"
                }}
              >
                Book a Free Consultation
                <ArrowRight className="w-4 h-4" />
              </Link>
              <a
                href={`https://wa.me/233503319610?text=Hi%20RaveSoft%2C%20I%27d%20like%20to%20discuss%20a%20project`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-4 rounded-xl border border-white/30 hover:border-white/50 bg-white/5 hover:bg-white/10 text-white font-semibold text-base transition-all hover:-translate-y-0.5"
              >
                Chat on WhatsApp
              </a>
            </div>

            {/* Trust indicators */}
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 animate-fade-in-up animation-delay-600">
              {[
                "500+ businesses served across Africa",
                "20+ industries covered",
                "Ghana HQ · serving all Africa"
              ].map((item) => (
                <div key={item} className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
                  <span className="text-sm text-gray-300 font-medium">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* PROOF BAR */}
      <ProofBar stats={PROOF_ITEMS} dark />

      {/* TEAM IN ACTION */}
      <section className="bg-[#050816] pb-16 pt-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-dark opacity-40 pointer-events-none" />
        <div className="relative max-w-[1280px] mx-auto px-5 sm:px-8 lg:px-10">
          <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
            {/* Left — image */}
            <div className="relative rounded-2xl overflow-hidden shadow-2xl shadow-black/50 border border-white/8 order-2 lg:order-1">
              <Image
                src="/img/custom-software-development.png"
                alt="RaveSoft Digital Solutions team building software systems"
                width={800}
                height={533}
                className="w-full h-auto object-cover"
                loading="lazy"
              />
              {/* overlay badge */}
              <div className="absolute bottom-4 left-4 flex items-center gap-2 bg-black/70 backdrop-blur-sm border border-white/10 rounded-xl px-4 py-2.5">
                <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                <span className="text-white text-sm font-medium">Ghana HQ · Serving all of Africa</span>
              </div>
            </div>
            {/* Right — text */}
            <div className="order-1 lg:order-2">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 mb-6">
                <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                <span className="text-sm text-amber-400 font-medium">Built from inside African business, for African business</span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-black text-white leading-[1.1] tracking-tight mb-5">
                We don&apos;t just build software.{" "}
                <span style={{ background: "linear-gradient(135deg,#60A5FA,#818CF8)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
                  We solve business problems.
                </span>
              </h2>
              <p className="text-gray-400 text-base leading-relaxed mb-8">
                RaveSoft is a Ghana-based software and digital transformation company. Our engineers,
                designers, and product strategists have built systems running daily inside
                retail chains, hospitals, schools, hotels, and enterprises across Africa.
              </p>
              <div className="space-y-3 mb-8">
                {[
                  "Deep domain experience across 20+ industries",
                  "Your tech partner for strategy, design, build, and support",
                  "Serving all 54 African countries from our Ghana HQ",
                  "Ongoing support and product evolution after launch",
                ].map((item) => (
                  <div key={item} className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center shrink-0">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                    </div>
                    <span className="text-gray-300 text-sm">{item}</span>
                  </div>
                ))}
              </div>
              <Link href="/about"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-white/20 hover:border-white/35 text-white font-semibold text-sm transition-all hover:bg-white/5"
              >
                About RaveSoft
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* AFRICA COVERAGE BELT — scrolling marquee */}
      <section className="bg-[#050816] border-y border-white/6 py-7 overflow-hidden">
        <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-gray-600 text-center mb-5 px-4">
          Serving businesses across Africa
        </p>
        {/* Row 1 — scrolls left */}
        <div
          className="relative overflow-hidden mb-3"
          style={{ maskImage: "linear-gradient(to right, transparent 0%, black 8%, black 92%, transparent 100%)" }}
        >
          <div className="flex animate-marquee whitespace-nowrap gap-3">
            {[
              "Ghana","Nigeria","Kenya","South Africa","Ivory Coast","Senegal",
              "Tanzania","Uganda","Ethiopia","Rwanda","Cameroon","Zimbabwe",
              "Zambia","Mozambique","Botswana","Namibia","Angola","DR Congo",
              "Mali","Burkina Faso","Niger","Chad","Sudan","Egypt","Morocco",
              "Tunisia","Algeria","Mauritius","Madagascar","Malawi",
              "Sierra Leone","Liberia","Guinea","Togo","Benin","Gambia",
              "Gabon","Congo","Eritrea","Somalia",
              "Ghana","Nigeria","Kenya","South Africa","Ivory Coast","Senegal",
              "Tanzania","Uganda","Ethiopia","Rwanda","Cameroon","Zimbabwe",
              "Zambia","Mozambique","Botswana","Namibia","Angola","DR Congo",
              "Mali","Burkina Faso","Niger","Chad","Sudan","Egypt","Morocco",
              "Tunisia","Algeria","Mauritius","Madagascar","Malawi",
              "Sierra Leone","Liberia","Guinea","Togo","Benin","Gambia",
              "Gabon","Congo","Eritrea","Somalia",
            ].map((country, i) => (
              <span
                key={i}
                className="flex-shrink-0 px-3.5 py-1.5 rounded-full text-xs font-medium bg-white/5 border border-white/8 text-gray-400"
              >
                {country}
              </span>
            ))}
          </div>
        </div>
        {/* Row 2 — scrolls right (reversed) */}
        <div
          className="relative overflow-hidden"
          style={{ maskImage: "linear-gradient(to right, transparent 0%, black 8%, black 92%, transparent 100%)" }}
        >
          <div className="flex animate-marquee-reverse whitespace-nowrap gap-3">
            {[
              "Morocco","Tunisia","Algeria","Libya","Egypt","Sudan","Ethiopia",
              "Eritrea","Somalia","Kenya","Tanzania","Uganda","Rwanda","Burundi",
              "Mozambique","Zimbabwe","Zambia","Malawi","Madagascar","Mauritius",
              "South Africa","Botswana","Namibia","Angola","DR Congo","Congo",
              "Gabon","Cameroon","Ivory Coast","Senegal",
              "Mali","Guinea","Sierra Leone","Liberia","Togo","Benin","Gambia",
              // second copy for seamless CSS loop — same unique source
              "Morocco","Tunisia","Algeria","Libya","Egypt","Sudan","Ethiopia",
              "Eritrea","Somalia","Kenya","Tanzania","Uganda","Rwanda","Burundi",
              "Mozambique","Zimbabwe","Zambia","Malawi","Madagascar","Mauritius",
              "South Africa","Botswana","Namibia","Angola","DR Congo","Congo",
              "Gabon","Cameroon","Ivory Coast","Senegal",
              "Mali","Guinea","Sierra Leone","Liberia","Togo","Benin","Gambia",
            ].map((country, i) => (
              <span
                key={i}
                className="flex-shrink-0 px-3.5 py-1.5 rounded-full text-xs font-medium bg-blue-500/8 border border-blue-500/15 text-blue-400/70"
              >
                {country}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* WHAT WE BUILD */}
      <section className="bg-[#F8FAFB] section-padding">
        <div className="max-w-[1280px] mx-auto px-5 sm:px-8 lg:px-10">
          <SectionHeader
            eyebrow="Our Services"
            title="Everything your business needs to compete and grow"
            description="Strategy, design, software engineering, automation, and long-term support — we replace manual bottlenecks with modern digital systems that scale with you."
            className="mb-14"
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
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
          <div className="text-center mt-12">
            <Link href="/services" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-blue-200 bg-blue-50 text-sm font-semibold text-blue-700 hover:bg-blue-100 hover:border-blue-300 transition-all">
              Explore all services
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* PRODUCTS */}
      <section className="bg-[#050816] section-padding relative overflow-hidden">
        {/* Decorative */}
        <div className="absolute inset-0 bg-grid-dark opacity-60 pointer-events-none" />
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-blue-500/30 to-transparent" />
        <div className="absolute top-1/4 -right-32 w-96 h-96 bg-blue-700/8 rounded-full blur-3xl pointer-events-none" />

        <div className="relative max-w-[1280px] mx-auto px-5 sm:px-8 lg:px-10">
          <SectionHeader
            eyebrow="Our Software Products"
            title="Ready-to-deploy platforms built from real operational experience"
            description="Not template software. These are products built from years of working with real businesses — refined, proven, and deployable in days."
            dark
            className="mb-14"
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {PRODUCTS.map((product, i) => (
              <ProductCard
                key={product.id}
                name={product.name}
                tagline={product.tagline}
                description={product.description}
                features={product.features}
                industries={product.industries}
                href={product.href}
                cta={product.cta}
                badge={product.badge}
                index={i}
              />
            ))}
          </div>
          <div className="text-center mt-12">
            <Link href="/products" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-blue-500/30 bg-blue-500/10 text-sm font-semibold text-blue-400 hover:bg-blue-500/20 hover:border-blue-400/40 transition-all">
              View all products
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* INDUSTRIES */}
      <section className="bg-white section-padding">
        <div className="max-w-[1280px] mx-auto px-5 sm:px-8 lg:px-10">
          <SectionHeader
            eyebrow="Industries We Serve"
            title="Proven solutions across every major industry in Africa"
            description="From retail and healthcare to education and hospitality — we understand the workflows, challenges, and growth pressures of each industry we serve."
            className="mb-14"
          />
          {/* Industry collage visual */}
          <div className="relative rounded-2xl overflow-hidden mb-10 border border-gray-100 shadow-lg shadow-gray-200/60">
            <Image
              src="/img/industry-solution-collage.png"
              alt="RaveSoft digital solutions across retail, hospitality, healthcare, education and more industries in Africa"
              width={1280}
              height={500}
              className="w-full h-auto object-cover"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-white/80 via-transparent to-transparent pointer-events-none" />
            <div className="absolute inset-y-0 left-0 flex flex-col justify-center px-8 sm:px-12 max-w-md">
              <span className="text-xs font-bold text-blue-600 uppercase tracking-widest mb-2">Cross-Industry Expertise</span>
              <p className="text-gray-900 text-xl sm:text-2xl font-black leading-tight">
                One technology partner. Unlimited industry applications.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {INDUSTRIES.slice(0, 9).map((industry, i) => (
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
          <div className="text-center mt-12">
            <Link href="/industries" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-blue-200 bg-blue-50 text-sm font-semibold text-blue-700 hover:bg-blue-100 transition-all">
              All industries
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* CASE STUDIES */}
      <section className="bg-[#F8FAFB] section-padding">
        <div className="max-w-[1280px] mx-auto px-5 sm:px-8 lg:px-10">
          <SectionHeader
            eyebrow="Client Results"
            title="Real businesses. Real systems. Real results."
            description="Each project in our portfolio is a business challenge solved — with measurable impact on operations, revenue, and growth."
            className="mb-14"
          />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {CASE_STUDIES.slice(0, 3).map((cs, i) => (
              <CaseStudyCard
                key={cs.id}
                title={cs.title}
                industry={cs.industry}
                tag={cs.tag}
                problem={cs.problem}
                result={cs.result}
                impact={cs.impact}
                href={`/case-studies/${cs.slug}`}
                index={i}
              />
            ))}
          </div>
          <div className="text-center mt-12">
            <Link href="/case-studies" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-blue-200 bg-blue-50 text-sm font-semibold text-blue-700 hover:bg-blue-100 transition-all">
              View all case studies
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* PROCESS */}
      <section className="bg-[#050816] section-padding relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-dark opacity-50 pointer-events-none" />
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-blue-500/20 to-transparent" />

        <div className="relative max-w-[1280px] mx-auto px-5 sm:px-8 lg:px-10">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-start">
            <div className="lg:sticky lg:top-24">
              <SectionHeader
                eyebrow="How We Work"
                title="From idea to launch, we build with clarity and structure"
                description="Our proven six-step process ensures every project we deliver is aligned to your goals, on time, and built to last."
                dark
                align="left"
              />
              <div className="mt-10 flex flex-col sm:flex-row gap-4">
                <Link href="/book-consultation"
                  className="flex items-center gap-2 px-6 py-3.5 rounded-xl text-white font-semibold text-sm transition-all"
                  style={{ background: "linear-gradient(135deg, #F59E0B, #D97706)", boxShadow: "0 4px 20px rgba(245,158,11,0.35)" }}
                >
                  Book a Free Consultation
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link href="/about"
                  className="flex items-center gap-2 px-6 py-3.5 rounded-xl border border-white/20 hover:border-white/35 text-white font-semibold text-sm transition-all hover:bg-white/5"
                >
                  About RaveSoft
                </Link>
              </div>
            </div>
            <div>
              {PROCESS_STEPS.map((step, i) => (
                <ProcessStep
                  key={step.step}
                  step={step.step}
                  title={step.title}
                  description={step.description}
                  icon={PROCESS_ICONS[step.icon]}
                  isLast={i === PROCESS_STEPS.length - 1}
                  index={i}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* TECH STACK */}
      <section className="bg-white section-padding">
        <div className="max-w-[1280px] mx-auto px-5 sm:px-8 lg:px-10">
          <SectionHeader
            eyebrow="Our Tech Stack"
            title="Modern tools for secure, scalable, and maintainable systems"
            description="We use battle-tested, modern technologies to build systems that are reliable, fast, and easy to maintain and evolve."
            className="mb-12"
          />
          <div className="flex flex-wrap justify-center gap-3">
            {TECH_STACK.map((tech) => (
              <div key={tech.name}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gray-50/80 border border-gray-200/80 hover:border-blue-300 hover:bg-blue-50 transition-all group cursor-default"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                <span className="text-sm font-medium text-gray-700 group-hover:text-blue-700 transition-colors">{tech.name}</span>
                <span className="text-xs text-gray-400 group-hover:text-blue-500 transition-colors">{tech.category}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* WHY RAVESOFT */}
      <section className="bg-[#F8FAFB] section-padding">
        <div className="max-w-[1280px] mx-auto px-5 sm:px-8 lg:px-10">
          <div className="grid lg:grid-cols-2 gap-14 lg:gap-20 items-center mb-14">
            <div>
              <SectionHeader
                eyebrow="Why Choose RaveSoft"
                title="More than developers. We are business technology partners."
                description="We understand that technology only has value when it solves real business problems and helps you grow."
                align="left"
              />
            </div>
            <div className="relative rounded-2xl overflow-hidden shadow-xl shadow-gray-200/80 border border-gray-100">
              <Image
                src="/img/digital-transformstion.png"
                alt="Digital transformation and cloud technology powering business growth across Africa"
                width={700}
                height={467}
                className="w-full h-auto object-cover"
                loading="lazy"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {WHY_RAVESOFT.map((item) => (
              <div key={item.title}
                className="p-8 rounded-2xl bg-white border border-gray-100/80 hover:border-blue-200/80 hover:shadow-xl hover:shadow-blue-500/10 transition-all duration-300 hover:-translate-y-1 group"
              >
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-blue-600 mb-5 transition-all duration-300"
                  style={{ background: "linear-gradient(135deg, rgba(59,130,246,0.1) 0%, rgba(99,102,241,0.07) 100%)", border: "1px solid rgba(59,130,246,0.15)" }}
                >
                  <div className="w-5 h-5 [&>svg]:w-5 [&>svg]:h-5">{WHY_ICONS[item.icon]}</div>
                </div>
                <h3 className="font-bold text-gray-900 mb-2.5 text-lg group-hover:text-blue-700 transition-colors">{item.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="bg-white section-padding">
        <div className="max-w-[1280px] mx-auto px-5 sm:px-8 lg:px-10">
          <SectionHeader
            eyebrow="Client Reviews"
            title="What our clients say about working with RaveSoft"
            description="These are real businesses running on systems we built. From retail POS to hospital software — here's what they experienced."
            className="mb-4"
          />
          {/* Verified stamp */}
          <p className="text-center text-sm text-gray-500 mb-8">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-50 border border-green-200 text-green-700 font-medium text-xs">
              <svg className="w-3 h-3 fill-green-500" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
              Verified clients across Ghana, Nigeria &amp; Kenya
            </span>
          </p>
          {/* Client-type strip */}
          <div className="flex flex-wrap justify-center gap-2 mb-12">
            {[
              { label: "Retail &amp; Supermarkets", icon: "🛒" },
              { label: "Hospitals &amp; Clinics", icon: "🏥" },
              { label: "Schools &amp; Colleges", icon: "🎓" },
              { label: "Hotels &amp; Hospitality", icon: "🏨" },
              { label: "Manufacturing &amp; ERP", icon: "🏭" },
              { label: "Construction &amp; HR", icon: "🏗️" },
            ].map((type) => (
              <span
                key={type.label}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-gray-50 border border-gray-200 text-xs font-medium text-gray-600"
              >
                <span role="img" aria-hidden="true">{type.icon}</span>
                <span dangerouslySetInnerHTML={{ __html: type.label }} />
              </span>
            ))}
          </div>
          <TestimonialsSection testimonials={TESTIMONIALS} />

          {/* Star aggregate */}
          <div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-4">
            <div className="flex gap-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <svg key={i} className="w-6 h-6 fill-amber-400 text-amber-400" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              ))}
            </div>
            <p className="text-sm text-gray-500 font-medium">5.0 average · 500+ businesses served across Africa</p>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-[#F8FAFB] section-padding">
        <div className="max-w-[1280px] mx-auto px-5 sm:px-8 lg:px-10">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-start">
            <div className="lg:sticky lg:top-24">
              <SectionHeader
                eyebrow="FAQ"
                title="Questions we get asked most often"
                description="Straight answers about cost, timelines, support, ownership, and how we work."
                align="left"
              />
              <div className="mt-8 flex flex-col sm:flex-row gap-4">
                <Link
                  href="/book-consultation"
                  className="flex items-center gap-2 px-6 py-3.5 rounded-xl text-white font-semibold text-sm transition-all"
                  style={{ background: "linear-gradient(135deg, #F59E0B, #D97706)", boxShadow: "0 4px 20px rgba(245,158,11,0.35)" }}
                >
                  Book a Free Consultation
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  href="/contact"
                  className="flex items-center gap-2 px-6 py-3.5 rounded-xl border border-gray-300 hover:border-blue-300 text-gray-700 hover:text-blue-700 font-semibold text-sm transition-all hover:bg-blue-50"
                >
                  Send Us a Message
                </Link>
              </div>
            </div>
            <div>
              <FAQAccordion items={FAQ_ITEMS} />
            </div>
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <CTASection />
    </>
  );
}

