import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import {
  Headset,
  ClipboardList,
  CalendarClock,
  Wallet,
  Layers,
  Clock,
  MessageSquareOff,
  UserX,
  HelpCircle,
  CalendarX,
  EyeOff,
  Database,
  Megaphone,
  Moon,
} from "lucide-react";
import SectionHeader from "@/components/ui/SectionHeader";
import CTASection from "@/components/ui/CTASection";
import FAQAccordion from "@/components/ui/FAQAccordion";
import FAQSchema from "@/components/seo/FAQSchema";
import BreadcrumbSchema from "@/components/seo/BreadcrumbSchema";
import StartDiagnosisButton from "@/components/ai/StartDiagnosisButton";
import { COMPANY } from "@/lib/data";

export const metadata: Metadata = {
  title: "AI Employee for Your Business | Sales, Support & Follow-Up Automation — RaveSoft",
  description:
    "Get an AI Employee built around your business — handling sales inquiries, customer service, follow-up, appointments, and repetitive admin work 24/7. Start a free AI business diagnosis.",
  keywords: [
    "AI employee for business",
    "AI agent for business Ghana",
    "WhatsApp AI sales agent",
    "AI customer service agent Ghana",
    "AI automation Ghana Nigeria",
    "AI receptionist for business",
    "AI lead follow-up system",
  ],
};

const PROBLEMS = [
  { icon: MessageSquareOff, text: "Leads are not answered quickly enough to convert them." },
  { icon: UserX, text: "WhatsApp inquiries pile up and get forgotten." },
  { icon: Clock, text: "Staff don't follow up consistently after the first contact." },
  { icon: HelpCircle, text: "The same questions get answered manually, over and over." },
  { icon: CalendarX, text: "Appointments and demos aren't booked efficiently." },
  { icon: EyeOff, text: "Owners can't see what's actually happening across the business." },
  { icon: Database, text: "Customer information is scattered across chats, notebooks, and memory." },
  { icon: Moon, text: "Opportunities are lost outside business hours." },
];

const STEPS = [
  {
    step: "01",
    title: "Tell Us About Your Business",
    description: "Have a guided conversation with Rave AI, our AI Business Consultant.",
  },
  {
    step: "02",
    title: "Get Your AI Opportunity Diagnosis",
    description: "We identify bottlenecks, repetitive work, and where automation would help most.",
  },
  {
    step: "03",
    title: "See Your Recommended AI Employee",
    description: "Get a recommendation on the right agent type, integrations, and priorities.",
  },
  {
    step: "04",
    title: "Launch Your AI Employee",
    description: "Approve the plan, connect the tools you use, and we build and deploy it for you.",
  },
];

const AGENT_TYPES = [
  {
    icon: Headset,
    name: "AI Sales Employee",
    description: "Responds to inquiries, qualifies leads, recommends products, handles objections, and follows up automatically.",
  },
  {
    icon: ClipboardList,
    name: "AI Customer Service Employee",
    description: "Answers FAQs, checks order/service status, provides support, and escalates complex cases to a human.",
  },
  {
    icon: Megaphone,
    name: "AI Marketing Employee",
    description: "Helps plan campaigns, segment audiences, manage follow-up sequences, and re-engage inactive prospects.",
  },
  {
    icon: Layers,
    name: "AI Operations Employee",
    description: "Collects information, produces reports, routes tasks, and sends reminders for recurring workflows.",
  },
  {
    icon: CalendarClock,
    name: "AI Appointment & Reception Employee",
    description: "Captures contact details, checks availability, books appointments, and handles rescheduling.",
  },
  {
    icon: Wallet,
    name: "AI Collections Employee",
    description: "Sends respectful payment reminders, captures payment promises, and escalates overdue accounts.",
  },
];

const OUTCOMES = [
  "Faster response to every inquiry",
  "Consistent follow-up, every time",
  "More qualified sales conversations",
  "Less repetitive work for your team",
  "Availability outside business hours",
  "Centralized record of every interaction",
  "Faster appointment booking",
  "Staff free to focus on higher-value work",
];

const INTEGRATIONS = [
  { name: "WhatsApp", status: "Native", available: true },
  { name: "Website Live Chat", status: "Native", available: true },
  { name: "Email", status: "Native", available: true },
  { name: "CRM & Admin Dashboard", status: "Native", available: true },
  { name: "Calendar / Booking", status: "Available on request", available: false },
  { name: "Payment Providers", status: "Available on request", available: false },
  { name: "POS & ERP Systems", status: "Custom integration", available: false },
  { name: "Facebook & Instagram", status: "Custom integration", available: false },
];

const FAQS = [
  {
    q: "Is this just a chatbot?",
    a: "No. A chatbot answers scripted questions. Your AI Employee is trained on your actual business, qualifies leads, remembers context, captures contact details, scores opportunities, and hands off to a human when a conversation needs one — with the full history preserved.",
  },
  {
    q: "Will it understand my business?",
    a: "The AI Business Consultant conversation is how we learn your business — your services, common questions, and workflow — so the agent we build is trained on your real operation, not a generic script.",
  },
  {
    q: "Can it use WhatsApp?",
    a: "Yes. Once a visitor has been chatting on your website, the agent offers a \"Continue on WhatsApp\" option that carries the conversation's context over, so nothing restarts from zero.",
  },
  {
    q: "Can it connect to my current software?",
    a: "We connect to WhatsApp, your website, and email natively today. CRM, calendar, payment, and POS/ERP integrations are built per project based on what you already use — we'll tell you plainly if something isn't available yet rather than promise it.",
  },
  {
    q: "What happens when the AI can't answer?",
    a: "It says so honestly and offers to connect you with a human, instead of guessing. Every handoff is logged and the RaveSoft team is notified by email.",
  },
  {
    q: "Can a human take over?",
    a: "Yes, at any point. Conversations, lead scores, and full transcripts are visible in RaveSoft's admin dashboard.",
  },
  {
    q: "Who owns my business data?",
    a: "You do. Your conversation and lead data lives in your own project database — the same answer as our standard software projects: no ongoing lock-in for data you generate.",
  },
  {
    q: "Will it replace my current staff?",
    a: "No. It's built to handle repetitive first-response and follow-up work so your team can focus on the conversations that need a human — not to replace your workforce.",
  },
];

export default function AiEmployeePage() {
  return (
    <>
      <FAQSchema items={FAQS.map((f) => ({ question: f.q, answer: f.a }))} />
      <BreadcrumbSchema
        items={[
          { name: "Home", url: "https://ravesoftsolutions.com" },
          { name: "AI Employee", url: "https://ravesoftsolutions.com/ai-employee" },
        ]}
      />

      {/* HERO */}
      <section className="relative bg-[#050816] pt-32 pb-20 lg:pt-40 lg:pb-28 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute bg-grid-dark inset-0 opacity-60" />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-blue-700/14 rounded-full blur-[130px]" />
          <div className="absolute top-1/3 right-1/4 w-[300px] h-[300px] bg-amber-500/8 rounded-full blur-[110px]" />
        </div>
        <div className="relative max-w-[1000px] mx-auto px-5 sm:px-8 lg:px-10 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/12 border border-amber-500/25 mb-7">
            <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            <span className="text-sm text-amber-300 font-semibold">AI Employee — by RaveSoft Digital Solutions</span>
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-[3.5rem] font-black text-white leading-[1.08] tracking-tighter mb-6">
            Build the Right{" "}
            <span className="bg-gradient-to-r from-blue-400 to-indigo-300 bg-clip-text text-transparent">
              AI Employee
            </span>{" "}
            for Your Business
          </h1>
          <p className="text-gray-400 text-lg leading-relaxed max-w-2xl mx-auto mb-10">
            Complete a short AI-powered business diagnosis. We&apos;ll identify what can be
            automated, recommend the right AI Employee, and prepare a deployment plan for your
            business.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-6">
            <StartDiagnosisButton />
            <Link
              href="/book-consultation"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl border border-white/30 hover:border-white/50 bg-white/5 hover:bg-white/10 text-white font-semibold text-base transition-all"
            >
              Book an AI Strategy Call
            </Link>
          </div>
          <p className="text-sm text-gray-500">
            Takes about 5 minutes · Personalized recommendations · No technical knowledge required
          </p>
        </div>
      </section>

      {/* THE PROBLEM */}
      <section className="bg-white section-padding">
        <div className="max-w-[1280px] mx-auto px-5 sm:px-8 lg:px-10">
          <SectionHeader
            eyebrow="The Real Problem"
            title="Your business may not need more software. It may need an AI Employee that actually does the work."
            description="Each of these has a real, observable cost — in lost sales, wasted staff hours, or frustrated customers."
            className="mb-14"
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {PROBLEMS.map((problem, i) => (
              <div
                key={i}
                className="flex items-start gap-3 p-5 rounded-xl bg-[#F5F7FA] border border-gray-100 hover:border-blue-200 hover:shadow-md transition-all"
              >
                <problem.icon className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
                <span className="text-gray-700 text-sm leading-relaxed">{problem.text}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="bg-[#050816] section-padding relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-dark opacity-40 pointer-events-none" />
        <div className="relative max-w-[1280px] mx-auto px-5 sm:px-8 lg:px-10">
          <SectionHeader
            eyebrow="How It Works"
            title="From conversation to a working AI Employee"
            dark
            className="mb-14"
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {STEPS.map((s) => (
              <div key={s.step} className="p-6 rounded-2xl bg-white/5 border border-white/10">
                <span className="text-amber-400 font-black text-2xl">{s.step}</span>
                <h3 className="text-white font-bold mt-3 mb-2">{s.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{s.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* AI EMPLOYEE TYPES */}
      <section className="bg-[#F5F7FA] section-padding">
        <div className="max-w-[1280px] mx-auto px-5 sm:px-8 lg:px-10">
          <SectionHeader
            eyebrow="AI Employees We Build"
            title="We only recommend the agent your business actually needs"
            description="Every AI Employee is custom-built around your workflow — these are the roles we most commonly deploy for businesses like yours."
            className="mb-14"
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {AGENT_TYPES.map((agent) => (
              <div
                key={agent.name}
                className="p-7 rounded-2xl bg-white border border-gray-100 hover:border-blue-200 hover:shadow-lg transition-all"
              >
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center text-blue-600 mb-5"
                  style={{ background: "linear-gradient(135deg, rgba(59,130,246,0.1), rgba(99,102,241,0.07))", border: "1px solid rgba(59,130,246,0.15)" }}
                >
                  <agent.icon className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-gray-900 mb-2">{agent.name}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{agent.description}</p>
              </div>
            ))}
          </div>
          <div className="mt-10 p-6 rounded-2xl bg-white border border-dashed border-gray-300 text-center">
            <p className="text-gray-700 font-medium">
              Need several connected agents across sales, support, and operations?{" "}
              <Link href="/contact" className="text-blue-600 font-semibold hover:underline">
                Ask about a Custom AI Workforce →
              </Link>
            </p>
          </div>
        </div>
      </section>

      {/* EXAMPLE CONVERSATION */}
      <section className="bg-white section-padding">
        <div className="max-w-[1280px] mx-auto px-5 sm:px-8 lg:px-10">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <SectionHeader
                eyebrow="See It In Action"
                title="A short conversation is all it takes"
                align="left"
              />
              <p className="text-gray-500 mt-4 mb-8 leading-relaxed">
                This is an illustrative example of how the diagnosis conversation flows — the real
                one, powered by Rave AI, adapts to your actual business as you answer.
              </p>
              <StartDiagnosisButton label="Start My Business Diagnosis" />
            </div>
            <div className="rounded-2xl border border-gray-200 bg-[#F5F7FA] p-6 space-y-3">
              {[
                { role: "assistant", text: "What kind of business do you operate?" },
                { role: "visitor", text: "I run a hotel with 42 rooms." },
                { role: "assistant", text: "Where do most booking inquiries come from?" },
                { role: "visitor", text: "WhatsApp, Instagram, calls, and walk-ins." },
                {
                  role: "assistant",
                  text: "About how many inquiries do you get each week, and how quickly does your team usually respond?",
                },
                { role: "visitor", text: "About 80. Response can take several hours." },
                {
                  role: "assistant",
                  text: "Delayed responses may be affecting your booking conversion. Let's see whether a 24/7 Booking & Guest-Service AI Employee makes sense for your hotel.",
                },
              ].map((m, i) => (
                <div
                  key={i}
                  className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                    m.role === "assistant"
                      ? "bg-white border border-gray-200 text-gray-800 mr-auto"
                      : "bg-blue-600 text-white ml-auto"
                  }`}
                >
                  {m.text}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* OUTCOMES */}
      <section className="bg-[#F5F7FA] section-padding">
        <div className="max-w-[1280px] mx-auto px-5 sm:px-8 lg:px-10">
          <SectionHeader eyebrow="What Changes" title="Practical outcomes, not vague promises" className="mb-12" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {OUTCOMES.map((outcome) => (
              <div key={outcome} className="flex items-center gap-3 p-4 rounded-xl bg-white border border-gray-100">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                <span className="text-gray-700 text-sm font-medium">{outcome}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* INTEGRATIONS */}
      <section className="bg-white section-padding">
        <div className="max-w-[1280px] mx-auto px-5 sm:px-8 lg:px-10">
          <SectionHeader eyebrow="Integrations" title="Where your AI Employee can work" className="mb-12" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {INTEGRATIONS.map((integration) => (
              <div
                key={integration.name}
                className="p-5 rounded-xl bg-[#F5F7FA] border border-gray-100 flex items-center justify-between gap-3"
              >
                <span className="text-gray-800 text-sm font-semibold">{integration.name}</span>
                <span
                  className={`text-xs font-medium px-2.5 py-1 rounded-full shrink-0 ${
                    integration.available ? "bg-green-100 text-green-700" : "bg-gray-200 text-gray-600"
                  }`}
                >
                  {integration.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* VISUAL BREAK */}
      <section className="bg-[#050816] py-16 relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-dark opacity-40 pointer-events-none" />
        <div className="relative max-w-[1280px] mx-auto px-5 sm:px-8 lg:px-10">
          <div className="relative rounded-2xl overflow-hidden border border-white/10">
            <Image
              src="/img/business-automation.png"
              alt="AI-powered business automation connecting sales, support, and operations for African businesses"
              width={1280}
              height={480}
              className="w-full h-auto object-cover"
              loading="lazy"
            />
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section className="bg-white section-padding">
        <div className="max-w-[1280px] mx-auto px-5 sm:px-8 lg:px-10">
          <SectionHeader
            eyebrow="Packages"
            title="Every AI Employee is scoped to your business"
            description="Pricing depends on the workflows, channels, and integrations involved — we'll give you a clear, fixed quote after your diagnosis."
            className="mb-14"
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              {
                name: "Starter AI Employee",
                description: "One high-priority workflow (e.g. WhatsApp sales replies) with limited integrations.",
              },
              {
                name: "Growth AI Employee",
                description: "Multiple workflows, automated follow-up, CRM integration, and reporting.",
              },
              {
                name: "AI Workforce",
                description: "Several connected agents across sales, support, and operations.",
              },
              {
                name: "Custom Enterprise",
                description: "Advanced integrations, dedicated infrastructure, and high-volume usage.",
              },
            ].map((tier) => (
              <div key={tier.name} className="p-7 rounded-2xl bg-[#F5F7FA] border border-gray-100 flex flex-col">
                <h3 className="font-bold text-gray-900 mb-2">{tier.name}</h3>
                <p className="text-sm text-gray-500 leading-relaxed mb-6 flex-1">{tier.description}</p>
                <Link
                  href="/contact"
                  className="text-center text-sm font-semibold px-4 py-2.5 rounded-xl border border-blue-200 text-blue-700 hover:bg-blue-50 transition-colors"
                >
                  Request Pricing
                </Link>
              </div>
            ))}
          </div>
          <p className="text-center text-sm text-gray-500 mt-8">
            Every quote separates one-time setup, monthly platform cost, and any usage-based fees clearly — no hidden charges.
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-[#F5F7FA] section-padding">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeader eyebrow="Common Questions" title="Before you start" className="mb-12" />
          <FAQAccordion items={FAQS.map((f) => ({ question: f.q, answer: f.a }))} />
        </div>
      </section>

      {/* RELATED */}
      <section className="bg-white border-t border-gray-100 py-10">
        <div className="max-w-[1280px] mx-auto px-5 sm:px-8 lg:px-10">
          <p className="text-sm text-gray-500 font-medium mb-4">Also explore</p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/services/business-automation"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gray-50 border border-gray-200 text-sm font-medium text-gray-700 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 transition-all"
            >
              Business Automation & AI Service →
            </Link>
            <Link
              href="/contact"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gray-50 border border-gray-200 text-sm font-medium text-gray-700 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 transition-all"
            >
              Contact RaveSoft →
            </Link>
            <a
              href={`https://wa.me/${COMPANY.whatsapp.replace(/[^0-9]/g, "")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gray-50 border border-gray-200 text-sm font-medium text-gray-700 hover:border-green-300 hover:bg-green-50 hover:text-green-700 transition-all"
            >
              Chat on WhatsApp →
            </a>
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <CTASection
        headline="Discover which AI Employee your business actually needs"
        subheadline="Complete the guided diagnosis and get a tailored recommendation, implementation priorities, and next-step plan."
        primaryCTA={{ label: "Start My Free AI Business Diagnosis", href: "/contact" }}
        secondaryCTA={{ label: "Book a Strategy Call", href: "/book-consultation" }}
      />
    </>
  );
}
