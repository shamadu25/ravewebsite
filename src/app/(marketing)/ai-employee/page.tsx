import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import {
  Headset,
  ClipboardList,
  CalendarClock,
  Wallet,
  Layers,
  MessageCircle as WhatsAppIcon,
  MessageSquareOff,
  UserX,
  HelpCircle,
  CalendarX,
  Target,
  EyeOff,
  ArrowRight,
} from "lucide-react";
import SectionHeader from "@/components/ui/SectionHeader";
import FAQAccordion from "@/components/ui/FAQAccordion";
import FAQSchema from "@/components/seo/FAQSchema";
import BreadcrumbSchema from "@/components/seo/BreadcrumbSchema";
import AssessmentWidget from "@/components/ai-employee/AssessmentWidget";
import AssessmentPrimaryCta from "@/components/ai-employee/AssessmentPrimaryCta";
import HeroDemo from "@/components/ai-employee/HeroDemo";
import LiveDemoSelector from "@/components/ai-employee/LiveDemoSelector";
import ProofSection from "@/components/ai-employee/ProofSection";
import StickyMobileCta from "@/components/ai-employee/StickyMobileCta";
import FabOffsetController from "@/components/ai-employee/FabOffsetController";
import ScrollDepthTracker from "@/components/ai-employee/ScrollDepthTracker";
import CampaignVariantTracker from "@/components/ai-employee/CampaignVariantTracker";
import { buildUtmQueryString, resolveHeroContent, resolveIndustryExample } from "@/lib/assessment/campaignContent";
import { COMPANY } from "@/lib/data";

export const metadata: Metadata = {
  title: "AI Employee for Sales, Support & Operations | RaveSoft Digital Solutions",
  description:
    "Get an AI Employee that replies instantly, follows up automatically, qualifies leads and helps turn more inquiries into paying customers — 24/7. Free 2-minute assessment.",
  keywords: [
    "AI employee for business",
    "AI agent for business Ghana",
    "WhatsApp AI sales agent",
    "AI customer service agent Ghana",
    "AI automation Ghana Nigeria",
  ],
  openGraph: {
    title: "Stop Losing Customers Because Your Team Replies Late | RaveSoft AI Employee",
    description:
      "Get an AI Employee that replies instantly, follows up automatically, and qualifies leads — 24/7. Free 2-minute assessment.",
    images: [{ url: "/api/og", width: 1200, height: 630, alt: "RaveSoft AI Employee" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Stop Losing Customers Because Your Team Replies Late | RaveSoft AI Employee",
    images: ["/api/og"],
  },
};

const PAIN_POINTS = [
  { icon: MessageSquareOff, text: "Leads wait too long for a reply." },
  { icon: UserX, text: "Staff forget to follow up." },
  { icon: HelpCircle, text: "The same questions get answered repeatedly." },
  { icon: CalendarX, text: "Inquiries arrive outside working hours." },
  { icon: Target, text: "Sales opportunities aren't properly qualified." },
  { icon: EyeOff, text: "Owners can't see where leads are being lost." },
];

const AGENT_TYPES = [
  {
    icon: Headset,
    name: "AI Sales Employee",
    problem: "Inbound inquiries aren't qualified or followed up consistently.",
    bestFor: "Businesses with inbound sales inquiries",
    tasks: ["Replies to prospects instantly", "Asks qualifying questions", "Follows up automatically"],
    outcome: "More qualified leads reach a booking or purchase.",
    mainProblem: "lead_qualification",
  },
  {
    icon: ClipboardList,
    name: "AI Customer Support Employee",
    problem: "Staff time is consumed answering the same questions repeatedly.",
    bestFor: "Teams overloaded with routine questions",
    tasks: ["Answers approved FAQs", "Guides customers through requests", "Escalates complex issues"],
    outcome: "Faster support without more headcount.",
    mainProblem: "repetitive_support",
  },
  {
    icon: WhatsAppIcon,
    name: "AI WhatsApp Employee",
    problem: "WhatsApp inquiries wait too long for a reply.",
    bestFor: "Businesses that sell through WhatsApp",
    tasks: ["Manages incoming WhatsApp inquiries", "Follows up with prospects", "Keeps conversations consistent"],
    outcome: "No WhatsApp inquiry goes unanswered.",
    mainProblem: "slow_response",
  },
  {
    icon: CalendarClock,
    name: "AI Appointment & Booking Employee",
    problem: "Appointments and bookings are missed or mismanaged.",
    bestFor: "Service and hospitality businesses",
    tasks: ["Checks requirements", "Books appointments", "Sends reminders"],
    outcome: "Fewer missed meetings and no-shows.",
    mainProblem: "missed_bookings",
  },
  {
    icon: Wallet,
    name: "AI Receivables Employee",
    problem: "Outstanding payments aren't followed up consistently.",
    bestFor: "Businesses managing outstanding payments",
    tasks: ["Tracks outstanding payments", "Sends professional reminders", "Escalates overdue accounts"],
    outcome: "More consistent, less awkward collections.",
    mainProblem: "payment_collection",
  },
  {
    icon: Layers,
    name: "AI Operations Employee",
    problem: "Repetitive internal admin work is consuming staff time.",
    bestFor: "Teams drowning in repetitive admin",
    tasks: ["Connects forms, email, CRM and spreadsheets", "Routes repetitive workflows", "Flags exceptions"],
    outcome: "Staff time freed from repetitive internal work.",
    mainProblem: "repetitive_internal",
  },
];

const FAQS = [
  {
    q: "What exactly is an AI Employee?",
    a: "A system built around your business that handles repetitive sales, support, follow-up and admin conversations — trained on your actual business, not a generic script.",
  },
  {
    q: "Is this different from a normal chatbot?",
    a: "Yes. A chatbot answers scripted questions. An AI Employee qualifies leads, remembers context across a conversation, captures contact details, and performs approved actions like booking or sending reminders — with a human able to take over at any point.",
  },
  {
    q: "Can it work with WhatsApp?",
    a: "Yes — WhatsApp is one of the channels we connect natively.",
  },
  {
    q: "Can it connect to our website, CRM, email or other tools?",
    a: "Website and email are native today. CRM and other integrations are scoped per project based on what you already use — we'll tell you plainly if something isn't available yet.",
  },
  {
    q: "Can a staff member take over a conversation?",
    a: "Yes, at any point. Every conversation and lead is visible in RaveSoft's admin dashboard.",
  },
  {
    q: "What happens when the AI doesn't know the answer?",
    a: "It says so honestly and offers to connect the customer with a human, instead of guessing.",
  },
  {
    q: "How is the AI trained on our business?",
    a: "During implementation, we load your approved business information — services, pricing rules, FAQs and workflow — so the agent answers from your actual business, not assumptions.",
  },
  {
    q: "How long does implementation take?",
    a: "Depends on scope. A single workflow (e.g. WhatsApp sales replies) can launch quickly; multi-channel or multi-integration projects take longer. We give a clear timeline after the discovery conversation.",
  },
  {
    q: "How much does an AI Employee cost?",
    a: "Implementation is scoped as a project based on your workflows, channels and integrations — you receive a quotation after the discovery process, not a generic price.",
  },
  {
    q: "Are there monthly AI or API charges?",
    a: "Ongoing AI usage may carry a monthly operating cost depending on conversation volume, models, channels and integrations. This is explained clearly as part of your quotation — no hidden charges.",
  },
  {
    q: "Can we begin with one workflow?",
    a: "Yes — most projects start with the single highest-priority workflow, then expand once it's proven.",
  },
  {
    q: "Who monitors and supports the AI?",
    a: "RaveSoft's team monitors conversations and outcomes as part of implementation, with support and optimization plans available separately.",
  },
  {
    q: "How is customer and business data protected?",
    a: "Conversation and lead data lives in your own project database. We don't sell or share your data, and you retain ownership of it.",
  },
  {
    q: "Will it work outside normal office hours?",
    a: "Yes — that's one of the main reasons businesses deploy an AI Employee. It responds to inquiries around the clock and hands sensitive or complex conversations to your team when they're back online.",
  },
];

interface PageProps {
  searchParams: Promise<{ agent?: string | string[]; industry?: string | string[] }>;
}

export default async function AiEmployeePage({ searchParams }: PageProps) {
  const params = await searchParams;
  const hero = resolveHeroContent(params.agent);
  const industryExample = resolveIndustryExample(params.industry);
  const utmQuery = buildUtmQueryString(params);
  const agentParam = Array.isArray(params.agent) ? params.agent[0] : (params.agent ?? null);

  return (
    <>
      <FAQSchema items={FAQS.map((f) => ({ question: f.q, answer: f.a }))} />
      <BreadcrumbSchema
        items={[
          { name: "Home", url: "https://ravesoftsolutions.com" },
          { name: "AI Employee", url: "https://ravesoftsolutions.com/ai-employee" },
        ]}
      />
      <FabOffsetController />
      <ScrollDepthTracker />
      <CampaignVariantTracker agent={agentParam} />
      <StickyMobileCta targetId="assessment" />

      {/* HERO */}
      <section className="relative bg-[#050816] pt-10 pb-14 lg:pt-14 lg:pb-20 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute bg-grid-dark inset-0 opacity-50" />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[350px] bg-blue-700/14 rounded-full blur-[120px]" />
        </div>
        <div className="relative max-w-[1200px] mx-auto px-5 sm:px-8 lg:px-10">
          <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-10 items-center">
            <div className="text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/12 border border-amber-500/25 mb-5">
                <span className="text-xs font-bold tracking-wide text-amber-300 uppercase">
                  AI Employees for Sales, Support and Operations
                </span>
              </div>
              <h1 className="text-3xl sm:text-4xl lg:text-[2.75rem] font-black text-white leading-[1.15] tracking-tight mb-4 text-balance">
                {hero.headline}
              </h1>
              <p className="text-gray-400 text-base sm:text-lg leading-relaxed mb-2">
                {hero.supporting}
                {industryExample && ` Built for businesses handling ${industryExample}.`}
              </p>
              <p className="text-gray-500 text-sm mb-2">Built and managed by RaveSoft Digital Solutions</p>
              <Link
                href="/ai-agents/demo"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-cyan-400 hover:text-cyan-300 mb-7 transition-colors"
              >
                See Ama live in an interactive demo <ArrowRight className="w-3.5 h-3.5" />
              </Link>

              <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start mb-3">
                <AssessmentPrimaryCta location="hero" />
                <Link
                  href="#how-it-works"
                  className="min-h-[48px] inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl border border-white/30 hover:border-white/50 bg-white/5 hover:bg-white/10 text-white font-semibold text-base transition-all"
                >
                  See How It Works
                </Link>
              </div>
              <p className="text-xs text-gray-500 mb-8 lg:mb-0">Free assessment • Takes about 2 minutes • No obligation</p>
            </div>

            {/* Above-the-fold demo — beside hero copy on desktop, beneath CTA on mobile */}
            <div className="lg:mt-0">
              <HeroDemo />
            </div>
          </div>

          {/* Result strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-3xl mx-auto mt-10">
            {["Reply instantly", "Follow up automatically", "Qualify every lead", "Book more customers"].map((r) => (
              <div key={r} className="text-center px-3 py-3 rounded-xl bg-white/5 border border-white/10">
                <span className="text-white text-sm font-semibold">{r}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PAIN */}
      <section className="bg-white section-padding">
        <div className="max-w-[1100px] mx-auto px-5 sm:px-8 lg:px-10">
          <SectionHeader
            title="Your business may not need more software. It may need an AI Employee that does the work."
            description="Every delayed reply, forgotten follow-up and unanswered inquiry can become a lost customer. Your AI Employee handles repetitive conversations and actions consistently, while your team focuses on the work that needs human judgment."
            className="mb-10"
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
            {PAIN_POINTS.map((p, i) => (
              <div key={i} className="flex items-start gap-3 p-5 rounded-xl bg-[#F5F7FA] border border-gray-100">
                <p.icon className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
                <span className="text-gray-700 text-[15px]">{p.text}</span>
              </div>
            ))}
          </div>
          <div className="text-center p-6 rounded-2xl bg-amber-50 border border-amber-200 mb-8">
            <p className="text-amber-900 font-semibold">
              If any two of these are happening in your business, an AI Employee could recover time and revenue you
              are currently losing.
            </p>
          </div>
          <div className="text-center">
            <AssessmentPrimaryCta location="pain_section" variant="outline" />
          </div>
        </div>
      </section>

      {/* TRANSFORMATION */}
      <section className="bg-[#F5F7FA] section-padding">
        <div className="max-w-[1100px] mx-auto px-5 sm:px-8 lg:px-10">
          <SectionHeader title="See what happens after your AI Employee goes live" className="mb-10" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-10">
            <div className="p-6 rounded-2xl bg-white border border-gray-200">
              <p className="text-xs font-bold text-red-600 uppercase tracking-wide mb-4">Before</p>
              <ul className="space-y-3 text-sm text-gray-600">
                {[
                  "Customer inquiries wait for staff",
                  "Follow-ups depend on memory",
                  "Leads are mixed with unqualified inquiries",
                  "Business information is scattered",
                  "Owners can't monitor every conversation",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <span className="text-red-400 mt-0.5">✕</span> {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="p-6 rounded-2xl bg-white border border-blue-200">
              <p className="text-xs font-bold text-blue-600 uppercase tracking-wide mb-4">After</p>
              <ul className="space-y-3 text-sm text-gray-700">
                {[
                  "Every inquiry gets an immediate response",
                  "Follow-ups run automatically",
                  "Leads are qualified and prioritized",
                  "The AI uses your approved business knowledge",
                  "Conversations and outcomes are recorded",
                  "Staff can take over whenever necessary",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <span className="text-blue-500 mt-0.5">✓</span> {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2 text-sm font-semibold text-gray-700">
            {["Inquiry", "Instant response", "Qualification", "Follow-up", "Booking, order or handoff"].map(
              (step, i, arr) => (
                <span key={step} className="flex items-center gap-2">
                  <span className="px-3 py-1.5 rounded-full bg-white border border-gray-200">{step}</span>
                  {i < arr.length - 1 && <span className="text-gray-400">→</span>}
                </span>
              )
            )}
          </div>
        </div>
      </section>

      {/* AI EMPLOYEE TYPES */}
      <section className="bg-white section-padding">
        <div className="max-w-[1100px] mx-auto px-5 sm:px-8 lg:px-10">
          <SectionHeader eyebrow="Choose The Outcome You Need" title="We build the AI Employee" className="mb-4" />
          <p className="text-center text-gray-600 max-w-2xl mx-auto mb-10">
            You do not need to decide which agent to build. Complete the assessment and we will recommend the first
            AI Employee most likely to create measurable value for your business.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {AGENT_TYPES.map((agent) => (
              <div key={agent.name} className="p-6 rounded-2xl bg-[#F5F7FA] border border-gray-100">
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center text-blue-600 mb-4"
                  style={{ background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.15)" }}
                >
                  <agent.icon className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-gray-900 mb-1">{agent.name}</h3>
                <p className="text-sm text-gray-600 mb-3">{agent.problem}</p>
                <ul className="space-y-1.5 mb-3">
                  {agent.tasks.map((t) => (
                    <li key={t} className="text-sm text-gray-700 flex items-start gap-2">
                      <span className="text-blue-500 mt-0.5">•</span> {t}
                    </li>
                  ))}
                </ul>
                <p className="text-sm font-medium text-gray-900 mb-1">{agent.outcome}</p>
                <p className="text-xs text-gray-500 mb-4">Best fit: {agent.bestFor}</p>
                <AssessmentPrimaryCta
                  location="employee_card"
                  variant="outline"
                  presetProblem={agent.mainProblem}
                  className="!px-5 !py-2.5 !text-sm w-full sm:w-auto"
                />
              </div>
            ))}
          </div>
          <p className="text-center text-sm text-gray-500 mt-8 max-w-xl mx-auto">
            An AI Employee handles repetitive, high-volume work. Humans retain control and handle exceptions — it
            does not replace your team.
          </p>
        </div>
      </section>

      {/* ASSESSMENT */}
      <section className="bg-[#050816] section-padding relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-dark opacity-40 pointer-events-none" />
        <div className="relative max-w-[720px] mx-auto px-5 sm:px-8 lg:px-10">
          <SectionHeader
            eyebrow="Personalized Assessment"
            title="A short conversation is all it takes"
            description="Tell us how your business currently handles inquiries, sales, support and repetitive work. Your assessment identifies the most valuable AI Employee to deploy first."
            dark
            className="mb-8"
          />
          <AssessmentWidget id="assessment" />
        </div>
      </section>

      {/* IMPLEMENTATION */}
      <section id="how-it-works" className="bg-white section-padding scroll-mt-20">
        <div className="max-w-[1100px] mx-auto px-5 sm:px-8 lg:px-10">
          <SectionHeader title="From business problem to a working AI Employee" className="mb-10" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              { title: "Discover", text: "We map the problem, customer journey and business rules." },
              { title: "Design", text: "We define the AI's tasks, knowledge, boundaries and human handoff points." },
              {
                title: "Build & Integrate",
                text: "We connect approved channels and systems and train the AI using your business information.",
              },
              { title: "Launch & Improve", text: "We test, deploy, monitor and improve based on real conversations and outcomes." },
            ].map((step, i) => (
              <div key={step.title} className="p-6 rounded-2xl bg-[#F5F7FA] border border-gray-100">
                <span className="text-blue-600 font-black text-xl">0{i + 1}</span>
                <h3 className="font-bold text-gray-900 mt-2 mb-2">{step.title}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{step.text}</p>
              </div>
            ))}
          </div>
          <p className="text-center text-sm text-gray-500 mt-8">
            Every project is scoped according to workflow complexity, required integrations, conversation volume and
            support needs.
          </p>
        </div>
      </section>

      {/* LIVE DEMO */}
      <section className="bg-[#F5F7FA] section-padding">
        <div className="max-w-[1100px] mx-auto px-5 sm:px-8 lg:px-10">
          <SectionHeader eyebrow="See It Work" title="Choose a scenario" className="mb-8" />
          <div className="rounded-2xl overflow-hidden border border-gray-200 mb-8">
            <Image
              src="/img/ai-image2.png"
              alt="Illustrative preview of an AI Employee dashboard showing inquiry status, lead qualification and consultation booking"
              width={1672}
              height={941}
              className="w-full h-auto"
              sizes="(min-width: 1024px) 1100px, 100vw"
            />
          </div>
          <LiveDemoSelector />
        </div>
      </section>

      {/* OUTCOMES */}
      <section className="bg-white section-padding">
        <div className="max-w-[1100px] mx-auto px-5 sm:px-8 lg:px-10">
          <SectionHeader title="Practical business outcomes — not vague AI promises" className="mb-10" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {[
              "Respond to every qualified inquiry",
              "Follow up without depending on staff memory",
              "Handle repetitive requests outside office hours",
              "Move qualified customers toward booking, payment or human assistance",
            ].map((o) => (
              <div key={o} className="p-6 rounded-2xl bg-[#F5F7FA] border border-gray-200">
                <p className="text-gray-900 text-lg font-bold leading-snug">{o}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <ProofSection />

      {/* TRUST — no fabricated testimonials; real company info only */}
      <section className="bg-[#F5F7FA] section-padding">
        <div className="max-w-[1100px] mx-auto px-5 sm:px-8 lg:px-10">
          <SectionHeader eyebrow="Who's Behind This" title="Built by a team that understands business automation" className="mb-8" />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <div className="p-6 rounded-2xl bg-white border border-gray-100">
              <h3 className="font-bold text-gray-900 mb-2">RaveSoft Digital Solutions Ltd</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                Based in {COMPANY.location}. Building custom software, POS/ERP systems, and automation for
                businesses across Africa.
              </p>
            </div>
            <div className="p-6 rounded-2xl bg-white border border-gray-100">
              <h3 className="font-bold text-gray-900 mb-2">Data & privacy</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                Your conversation and lead data lives in your own project database. We don&apos;t sell or share it.
              </p>
            </div>
            <div className="p-6 rounded-2xl bg-white border border-gray-100">
              <h3 className="font-bold text-gray-900 mb-2">Real project work</h3>
              <p className="text-sm text-gray-600 leading-relaxed mb-3">
                See verified case studies from software and automation projects we&apos;ve delivered.
              </p>
              <Link href="/case-studies" className="text-sm font-semibold text-blue-600 hover:underline">
                View case studies →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* COMMERCIAL MODEL */}
      <section className="bg-white section-padding">
        <div className="max-w-[1100px] mx-auto px-5 sm:px-8 lg:px-10 text-center">
          <SectionHeader title="How AI Employee pricing works" className="mb-8" align="center" />
          <p className="max-w-2xl mx-auto text-gray-600 text-[15px] leading-relaxed mb-8">
            Every AI Employee is designed around your workflows, channels and required integrations. Your proposal
            will clearly separate the one-time implementation cost from ongoing AI usage, infrastructure and support
            costs. You will approve the complete scope and operating cost before development begins.
          </p>
          <p className="text-gray-800 font-semibold max-w-xl mx-auto mb-8">
            One well-designed AI Employee can handle repetitive work across several business functions at a fraction
            of the cost of building a larger manual team.
          </p>
          <AssessmentPrimaryCta location="pricing_section" />
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="bg-[#F5F7FA] section-padding scroll-mt-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeader eyebrow="FAQ" title="Common questions" className="mb-10" />
          <FAQAccordion items={FAQS.map((f) => ({ question: f.q, answer: f.a }))} />
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="bg-[#050816] section-padding relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[350px] bg-blue-600/12 rounded-full blur-[130px]" />
        </div>
        <div className="relative max-w-[720px] mx-auto px-5 sm:px-8 lg:px-10 text-center">
          <h2 className="text-3xl sm:text-4xl font-black text-white mb-4">
            Discover the AI Employee your business actually needs
          </h2>
          <p className="text-gray-400 mb-8">
            Complete the free assessment and receive a personalized recommendation based on your business, customer
            channels and most expensive repetitive workflow.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center mb-4">
            <AssessmentPrimaryCta location="final_cta" />
            <Link
              href={`/book-consultation${utmQuery}`}
              className="min-h-[48px] inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl border border-white/30 hover:border-white/50 bg-white/5 hover:bg-white/10 text-white font-semibold text-base transition-all"
            >
              Book a Free Strategy Call
            </Link>
            <a
              href={`https://wa.me/${COMPANY.whatsapp.replace(/[^0-9]/g, "")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="min-h-[48px] inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl border border-white/30 hover:border-white/50 bg-white/5 hover:bg-white/10 text-white font-semibold text-base transition-all"
            >
              Chat on WhatsApp
            </a>
          </div>
          <p className="text-xs text-gray-500">Free assessment • Takes about 2 minutes • No obligation</p>
        </div>
      </section>
    </>
  );
}
