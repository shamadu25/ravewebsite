import type { Metadata } from "next";
import Link from "next/link";
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
import HeroAnimation from "@/components/ui/HeroAnimation";
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
  title: "RaveSoft Digital Solutions | Software Company in Ghana",
  description:
    "RaveSoft Digital Solutions builds premium websites, custom software, SaaS platforms, POS systems, ERP solutions, mobile apps, and automation systems for businesses across all African countries and international markets.",
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
      <section className="relative bg-[#050816] overflow-hidden">
        {/* Background elements */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {/* Grid */}
          <div className="absolute inset-0 bg-grid-dark" />
          {/* Glows */}
          <div className="absolute top-[-15%] left-[-10%] w-[60vw] h-[60vw] max-w-[800px] max-h-[800px] bg-blue-700/12 rounded-full blur-[140px]" />
          <div className="absolute bottom-[-10%] right-[-5%] w-[40vw] h-[40vw] max-w-[500px] max-h-[500px] bg-indigo-800/12 rounded-full blur-[100px]" />
          <div className="absolute top-1/3 left-1/2 w-[30vw] h-[30vw] max-w-[400px] max-h-[400px] bg-amber-500/4 rounded-full blur-[120px]" />
        </div>

        <div className="relative max-w-[1280px] mx-auto px-5 sm:px-8 lg:px-10 pt-32 pb-16 lg:pt-40 lg:pb-24 w-full">
          <div className="grid lg:grid-cols-[5fr_7fr] gap-10 lg:gap-8 items-center">
            {/* Left: Text content */}
            <div>
              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 mb-7">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                <span className="text-sm text-blue-400 font-medium">Software · SaaS · Automation · Digital Transformation</span>
              </div>

              {/* Headline */}
              <h1 className="text-[2.75rem] sm:text-[3.5rem] lg:text-[4rem] xl:text-[4.5rem] font-black text-white leading-[1.05] tracking-tighter mb-6">
                Build Software That{" "}
                <span style={{
                  background: "linear-gradient(135deg, #60A5FA 0%, #818CF8 40%, #FFB200 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text"
                }}>
                  Moves Your Business
                </span>{" "}
                Forward
              </h1>

              {/* Subheadline */}
              <p className="text-gray-400 text-lg leading-relaxed mb-8 max-w-xl">
                RaveSoft builds premium websites, custom software, SaaS platforms, POS &amp; ERP systems,
                mobile apps, and AI-powered automation for businesses across every African country
                — and beyond.
              </p>

              {/* CTAs */}
              <div className="flex flex-col sm:flex-row gap-4 mb-10">
                <Link
                  href="/contact"
                  className="flex items-center justify-center gap-2 px-8 py-4 rounded-xl text-white font-bold text-base transition-all"
                  style={{
                    background: "linear-gradient(135deg, #3B82F6, #2563eb)",
                    boxShadow: "0 8px 32px rgba(59,130,246,0.4), inset 0 1px 0 rgba(255,255,255,0.15)"
                  }}
                >
                  Get a Free Quote
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  href="/case-studies"
                  className="flex items-center justify-center gap-2 px-8 py-4 rounded-xl border border-white/20 hover:border-white/35 text-white font-semibold text-base transition-all hover:bg-white/5"
                >
                  View Case Studies
                </Link>
              </div>

              {/* Trust indicators */}
              <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
                {[
                  "500+ businesses served",
                  "All 54 African countries",
                  "Ghana HQ · global delivery"
                ].map((item) => (
                  <div key={item} className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                    <span className="text-sm text-gray-400 font-medium">{item}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Hero animation */}
            <div className="relative lg:pl-4 xl:pl-8">
              <HeroAnimation />
            </div>
          </div>
        </div>
      </section>

      {/* PROOF BAR */}
      <ProofBar stats={PROOF_ITEMS} dark />

      {/* AFRICA COVERAGE BELT */}
      <section className="bg-white border-b border-gray-100 py-10">
        <div className="max-w-[1280px] mx-auto px-5 sm:px-8 lg:px-10">
          <p className="text-xs font-bold tracking-widest uppercase text-gray-400 text-center mb-5">Serving businesses across Africa</p>
          <div className="flex flex-wrap justify-center gap-2">
            {[
              "Ghana","Nigeria","Kenya","South Africa","Ivory Coast","Senegal",
              "Tanzania","Uganda","Ethiopia","Rwanda","Cameroon","Zimbabwe",
              "Zambia","Mozambique","Botswana","Namibia","Angola","DR Congo",
              "Côte d'Ivoire","Mali","Burkina Faso","Niger","Chad","Sudan",
              "Egypt","Morocco","Tunisia","Algeria","Libya","Mauritius",
              "Madagascar","Malawi","Sierra Leone","Liberia","Guinea",
              "Togo","Benin","Gambia","Gabon","Congo","Eritrea","Somalia",
            ].map((country) => (
              <span key={country} className="px-3 py-1 text-xs font-medium rounded-full bg-gray-50 border border-gray-200 text-gray-600">
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
            eyebrow="What We Build"
            title="Digital systems built for growth, automation, and scale"
            description="We combine strategy, design, software engineering, automation, and ongoing support to help businesses replace manual processes with modern digital systems."
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
            title="Business platforms built from real operational experience"
            description="RaveSoft is more than a development agency. We build and operate software products used by real businesses every day."
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
            title="Technology solutions for businesses that run real operations"
            className="mb-14"
          />
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
            eyebrow="Case Studies"
            title="Proof that our systems solve real business problems"
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
                <Link href="/contact"
                  className="flex items-center gap-2 px-6 py-3.5 rounded-xl text-white font-semibold text-sm transition-all"
                  style={{ background: "linear-gradient(135deg, #3B82F6, #2563eb)", boxShadow: "0 4px 20px rgba(59,130,246,0.35)" }}
                >
                  Start Your Project
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
          <SectionHeader
            eyebrow="Why Choose RaveSoft"
            title="More than developers. We are business technology partners."
            description="We understand that technology only has value when it solves real business problems and helps you grow."
            className="mb-14"
          />
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
            title="Real businesses. Real results. Real feedback."
            description="Our products and systems are running in businesses across Ghana, Nigeria, Kenya, and beyond. Here's what our clients say."
            className="mb-14"
          />
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
                  href="/contact"
                  className="flex items-center gap-2 px-6 py-3.5 rounded-xl text-white font-semibold text-sm transition-all"
                  style={{ background: "linear-gradient(135deg, #3B82F6, #2563eb)", boxShadow: "0 4px 20px rgba(59,130,246,0.35)" }}
                >
                  Get a Free Quote
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  href="/contact"
                  className="flex items-center gap-2 px-6 py-3.5 rounded-xl border border-gray-300 hover:border-blue-300 text-gray-700 hover:text-blue-700 font-semibold text-sm transition-all hover:bg-blue-50"
                >
                  Book a Free Call
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

