import type { Metadata } from "next";
import Image from "next/image";
import { CheckCircle2, Target, Lightbulb, Users, Globe } from "lucide-react";
import SectionHeader from "@/components/ui/SectionHeader";
import CTASection from "@/components/ui/CTASection";

export const metadata: Metadata = {
  title: "About RaveSoft | Software Company in Ghana Serving All of Africa",
  description:
    "RaveSoft Digital Solutions is Ghana's leading software company. Based in Accra, we've built custom software, POS systems, ERP, and web solutions for 100+ businesses across 54 African countries.",
  keywords: [
    "about RaveSoft",
    "software company Ghana",
    "software development company Accra",
    "Ghana tech company",
    "African software company",
  ],
};

const TEAM = [
  {
    name: "Saheed Abdulhakeem",
    role: "Founder & Lead Engineer",
    bio: "Full-stack engineer with deep expertise in custom software, SaaS architecture, and African business digital transformation.",
    linkedin: "https://linkedin.com/in/saheedabdulhakeem",
    twitter: "https://twitter.com/saheedabdulhakeem",
    initials: "SA",
    gradient: "from-blue-600 to-indigo-700",
  },
  {
    name: "RaveSoft Team",
    role: "Engineering & Design",
    bio: "A multidisciplinary team of engineers, designers, and product thinkers who build systems that work in the real world.",
    linkedin: "https://linkedin.com/company/ravesoftsolutions",
    twitter: null,
    initials: "RT",
    gradient: "from-indigo-600 to-purple-700",
  },
];

const VALUES = [
  {
    icon: <Target className="w-5 h-5" />,
    title: "Business-first thinking",
    description: "We understand your operations before we write a single line of code.",
  },
  {
    icon: <Lightbulb className="w-5 h-5" />,
    title: "Clarity over complexity",
    description: "We build systems that are simple to use, easy to understand, and built to last.",
  },
  {
    icon: <Users className="w-5 h-5" />,
    title: "Long-term partnership",
    description: "We stay involved after launch to ensure your system continues to grow with you.",
  },
  {
    icon: <Globe className="w-5 h-5" />,
    title: "African excellence",
    description: "We are proud to build world-class digital systems rooted in the African context.",
  },
];

const DIFFERENTIATORS = [
  "We combine software engineering with business thinking",
  "We build custom systems for real workflows",
  "We understand African business environments",
  "We create products used by real businesses",
  "We provide long-term technical support",
  "We deliver production-ready, scalable systems",
];

export default function AboutPage() {
  return (
    <>
      {/* HERO */}
      <section className="relative bg-[#050816] pt-32 pb-20 lg:pt-40 lg:pb-28 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute bg-grid-dark inset-0 opacity-60" />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[440px] bg-blue-700/14 rounded-full blur-[130px]" />
          <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-[280px] h-[280px] bg-indigo-700/7 rounded-full blur-[100px]" />
          <div className="absolute top-1/2 right-1/4 -translate-y-1/2 w-[200px] h-[200px] bg-amber-500/5 rounded-full blur-[80px]" />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-px h-28 bg-gradient-to-b from-transparent to-blue-500/30" />
        </div>
        <div className="relative max-w-[1280px] mx-auto px-5 sm:px-8 lg:px-10 text-center">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-blue-500/12 border border-blue-500/25 mb-7">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
            <span className="text-sm text-blue-400 font-semibold">About RaveSoft</span>
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-[3.5rem] font-black text-white leading-[1.08] tracking-tighter mb-6 max-w-4xl mx-auto">
            Building Digital Systems for Businesses{" "}
            <span style={{background:"linear-gradient(135deg,#60A5FA,#818CF8)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",backgroundClip:"text"}}>
              Ready to Grow
            </span>
          </h1>
          <p className="text-gray-400 text-lg leading-relaxed max-w-3xl mx-auto">
            RaveSoft Digital Solutions Ltd is a Ghana-based software and digital transformation
            company serving businesses, startups, NGOs, and enterprises across all African countries
            — building websites, software, automation systems, and digital platforms that improve
            operations and drive growth.
          </p>
        </div>
      </section>

      {/* STORY */}
      <section className="bg-white section-padding">
        <div className="max-w-[1280px] mx-auto px-5 sm:px-8 lg:px-10">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            <div>
              <SectionHeader
                eyebrow="Our Story"
                title="Why RaveSoft exists"
                align="left"
              />
              <div className="mt-6 space-y-4 text-gray-600 leading-relaxed">
                <p>
                  RaveSoft was created to help businesses move beyond manual processes, outdated
                  websites, disconnected tools, and inefficient operations.
                </p>
                <p>
                  We saw businesses across every African country losing time and money to manual
                  spreadsheets, paper records, and fragmented systems. We knew technology could
                  change that — but only if it was built to match how African businesses actually
                  work.
                </p>
                <p>
                  We believe every serious business deserves technology that is reliable, easy to
                  use, scalable, and built around real operational needs. That is why we build
                  custom systems instead of adapting generic tools.
                </p>
              </div>
            </div>

            {/* Team in action photo */}
            <div className="relative rounded-2xl overflow-hidden shadow-2xl shadow-gray-200/60 border border-gray-100">
              <Image
                src="/img/custom-software-development.png"
                alt="RaveSoft team building software and digital systems for African businesses"
                width={800}
                height={533}
                className="w-full h-auto object-cover"
                priority
              />
              <div className="absolute inset-0 bg-gradient-to-t from-gray-900/70 via-transparent to-transparent pointer-events-none" />
              <div className="absolute bottom-5 left-5 right-5">
                <p className="text-white font-semibold text-sm">RaveSoft HQ · Accra, Ghana</p>
                <p className="text-gray-300 text-xs mt-0.5">Engineering & Design team at work</p>
              </div>
            </div>
          </div>

          {/* Mission & Vision — below the split */}
          <div className="grid sm:grid-cols-2 gap-6 mt-10">
            <div className="p-7 rounded-2xl bg-[#050816] border border-white/10">
              <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center mb-4">
                <Target className="w-5 h-5 text-blue-400" />
              </div>
              <h3 className="font-bold text-white mb-2 text-lg">Our Mission</h3>
              <p className="text-gray-400 leading-relaxed text-sm">
                To help businesses build smarter digital systems that improve efficiency,
                visibility, customer experience, and growth.
              </p>
            </div>
            <div className="p-7 rounded-2xl bg-[#050816] border border-white/10">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center mb-4">
                <Globe className="w-5 h-5 text-amber-400" />
              </div>
              <h3 className="font-bold text-white mb-2 text-lg">Our Vision</h3>
              <p className="text-gray-400 leading-relaxed text-sm">
                To become one of Africa&apos;s most trusted software and digital transformation
                companies, building systems that power businesses across the continent and beyond.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* WHAT MAKES US DIFFERENT */}
      <section className="bg-[#F8FAFB] section-padding">
        <div className="max-w-[1280px] mx-auto px-5 sm:px-8 lg:px-10">
          <div className="grid lg:grid-cols-2 gap-12 items-start">
            <div>
              <SectionHeader
                eyebrow="What Makes Us Different"
                title="We build with business intelligence, not just technical skill"
                description="Our approach combines deep software engineering expertise with a genuine understanding of how businesses operate across all African countries and beyond."
                align="left"
              />
              <div className="grid grid-cols-1 gap-3 mt-8">
                {DIFFERENTIATORS.map((item, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-3 p-4 rounded-xl bg-white border border-gray-100 hover:border-blue-100 hover:shadow-sm transition-all"
                  >
                    <CheckCircle2 className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
                    <span className="text-gray-700 font-medium text-sm">{item}</span>
                  </div>
                ))}
              </div>
            </div>
            {/* Visuals */}
            <div className="space-y-5">
              <div className="relative rounded-2xl overflow-hidden shadow-lg border border-gray-100">
                <Image
                  src="/img/security&cloud.png"
                  alt="Enterprise-grade cloud infrastructure and security powering RaveSoft systems"
                  width={700}
                  height={420}
                  className="w-full h-auto object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-gray-900/60 via-transparent to-transparent pointer-events-none" />
                <div className="absolute bottom-4 left-4 right-4">
                  <span className="text-white text-sm font-semibold">Enterprise-grade Security & Cloud</span>
                  <p className="text-gray-300 text-xs mt-0.5">Built on secure, scalable cloud infrastructure</p>
                </div>
              </div>
              <div className="relative rounded-2xl overflow-hidden shadow-lg border border-gray-100">
                <Image
                  src="/img/support-training-onboarding.png"
                  alt="RaveSoft client onboarding, training, and ongoing support services"
                  width={700}
                  height={420}
                  className="w-full h-auto object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-gray-900/60 via-transparent to-transparent pointer-events-none" />
                <div className="absolute bottom-4 left-4 right-4">
                  <span className="text-white text-sm font-semibold">Dedicated Support & Training</span>
                  <p className="text-gray-300 text-xs mt-0.5">Full onboarding, team training, and ongoing assistance</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* VALUES */}
      <section className="bg-white section-padding">
        <div className="max-w-[1280px] mx-auto px-5 sm:px-8 lg:px-10">
          <SectionHeader
            eyebrow="Our Values"
            title="Principles that guide every project we build"
            className="mb-14"
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {VALUES.map((value) => (
              <div
                key={value.title}
                className="p-6 rounded-2xl bg-[#F8FAFB] border border-gray-100 hover:border-blue-200 hover:shadow-lg hover:shadow-blue-500/8 hover:-translate-y-1 transition-all"
              >
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500/15 to-indigo-600/10 border border-blue-500/20 flex items-center justify-center text-blue-500 mb-4">
                  {value.icon}
                </div>
                <h3 className="font-bold text-gray-900 mb-2">{value.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{value.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TEAM */}
      <section className="bg-[#050816] section-padding">
        <div className="max-w-[1280px] mx-auto px-5 sm:px-8 lg:px-10">
          <SectionHeader
            eyebrow="The Team"
            title="People who build your systems"
            dark
            className="mb-10"
          />
          {/* Team photo */}
          <div className="relative rounded-2xl overflow-hidden mb-10 border border-white/10 shadow-2xl shadow-black/40">
            <Image
              src="/img/ravesoft-team.png"
              alt="RaveSoft Digital Solutions full team — engineers, designers, and product specialists"
              width={1280}
              height={600}
              className="w-full h-auto object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#050816] via-transparent to-transparent pointer-events-none" />
            <div className="absolute bottom-6 left-6">
              <p className="text-white font-bold text-lg">The RaveSoft Team</p>
              <p className="text-gray-300 text-sm mt-0.5">Engineering, Design & Product — Accra, Ghana</p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-2xl mx-auto">
            {TEAM.map((member) => (
              <div
                key={member.name}
                className="p-7 rounded-2xl bg-white/4 border border-white/10 hover:border-white/20 hover:-translate-y-1 transition-all"
              >
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${member.gradient} flex items-center justify-center mb-5 text-white font-black text-xl`}>
                  {member.initials}
                </div>
                <h3 className="font-bold text-white text-lg mb-0.5">{member.name}</h3>
                <p className="text-blue-400 text-sm font-medium mb-3">{member.role}</p>
                <p className="text-gray-400 text-sm leading-relaxed mb-4">{member.bio}</p>
                <div className="flex items-center gap-3">
                  {member.linkedin && (
                    <a href={member.linkedin} target="_blank" rel="noopener noreferrer"
                      className="w-8 h-8 rounded-lg bg-white/8 border border-white/10 flex items-center justify-center text-gray-400 hover:text-blue-400 hover:border-blue-500/30 transition-colors">
                      <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
                    </a>
                  )}
                  {member.twitter && (
                    <a href={member.twitter} target="_blank" rel="noopener noreferrer"
                      className="w-8 h-8 rounded-lg bg-white/8 border border-white/10 flex items-center justify-center text-gray-400 hover:text-blue-400 hover:border-blue-500/30 transition-colors">
                      <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.26 5.632zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <CTASection
        headline="Ready to work with a team that understands your business?"
        subheadline="Tell us about your project and we will show you what we can build together."
        primaryCTA={{ label: "Start a Project", href: "/contact" }}
        secondaryCTA={{ label: "View Our Work", href: "/case-studies" }}
      />
    </>
  );
}
