import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, Clock, Video, MessageSquare, FileText } from "lucide-react";

export const metadata: Metadata = {
  title: "Book a Free Consultation | RaveSoft Digital Solutions",
  description:
    "Book a free 30-minute consultation with the RaveSoft team. We will discuss your project, recommend the right approach, and give you a clear path forward.",
};

const BENEFITS = [
  "Get expert advice on the right technology for your goals",
  "Understand realistic timelines and budgets before committing",
  "Identify gaps and opportunities in your current systems",
  "Learn what a typical engagement with RaveSoft looks like",
  "Walk away with a clear recommended next step",
];

const FORMATS = [
  {
    icon: <Video className="w-5 h-5" />,
    title: "Video Call",
    desc: "Google Meet or Zoom — your choice",
  },
  {
    icon: <MessageSquare className="w-5 h-5" />,
    title: "WhatsApp / Phone",
    desc: "Voice or chat at a scheduled time",
  },
  {
    icon: <FileText className="w-5 h-5" />,
    title: "Written Brief",
    desc: "Submit a project brief and get a written response",
  },
];

export default function BookConsultationPage() {
  return (
    <>
      {/* HERO */}
      <section className="relative bg-[#050816] pt-32 pb-20 lg:pt-40 lg:pb-28 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute bg-grid-dark inset-0 opacity-60" />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-blue-700/14 rounded-full blur-[130px]" />
          <div className="absolute top-1/2 right-1/3 -translate-y-1/2 w-[250px] h-[250px] bg-amber-500/5 rounded-full blur-[90px]" />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-px h-24 bg-gradient-to-b from-transparent to-blue-500/30" />
        </div>
        <div className="relative max-w-[1280px] mx-auto px-5 sm:px-8 lg:px-10 text-center">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-blue-500/12 border border-blue-500/25 mb-7">
            <Clock className="w-3.5 h-3.5 text-blue-400" />
            <span className="text-sm text-blue-400 font-semibold">Free &middot; 30 minutes</span>
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-[3.5rem] font-black text-white leading-[1.08] tracking-tighter mb-6 max-w-4xl mx-auto">
            Book a Free{" "}
            <span style={{background:"linear-gradient(135deg,#60A5FA,#818CF8)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",backgroundClip:"text"}}>
              Project Consultation
            </span>
          </h1>
          <p className="text-gray-400 text-lg leading-relaxed max-w-2xl mx-auto">
            Get expert advice, project scoping, and a clear path forward — in a free 30-minute
            consultation with the RaveSoft team. No commitment, no pressure.
          </p>
        </div>
      </section>

      {/* MAIN CONTENT */}
      <section className="bg-[#F8FAFB] section-padding">
        <div className="max-w-[1280px] mx-auto px-5 sm:px-8 lg:px-10">
          <div className="grid lg:grid-cols-2 gap-12 items-start">
            {/* Left */}
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">What to expect</h2>
              <p className="text-gray-500 text-sm leading-relaxed mb-7">
                In our 30-minute consultation call, we will discuss your business, your current
                challenges, and your goals. We will ask the right questions to understand your
                situation — and we will give you honest, specific advice on what we recommend.
              </p>

              <div className="space-y-3 mb-8">
                {BENEFITS.map((benefit, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
                    <span className="text-sm text-gray-700">{benefit}</span>
                  </div>
                ))}
              </div>

              <h3 className="font-bold text-gray-900 mb-4">Available formats</h3>
              <div className="space-y-3">
                {FORMATS.map((format) => (
                  <div key={format.title} className="flex items-start gap-4 p-4 rounded-xl bg-white border border-gray-100">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
                      {format.icon}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">{format.title}</p>
                      <p className="text-xs text-gray-500">{format.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right — Booking Widget Placeholder */}
            <div>
              <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm">
                <h2 className="text-xl font-bold text-gray-900 mb-2">Schedule your call</h2>
                <p className="text-sm text-gray-500 mb-6">
                  Pick a time that works for you. All times shown in your local timezone.
                </p>

                {/* Calendly / Cal.com embed placeholder */}
                <div className="w-full h-80 rounded-xl bg-[#F5F7FA] border-2 border-dashed border-gray-200 flex flex-col items-center justify-center text-center p-6">
                  <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center mb-4">
                    <Clock className="w-6 h-6 text-blue-600" />
                  </div>
                  <p className="font-semibold text-gray-700 mb-1">Booking calendar coming soon</p>
                  <p className="text-sm text-gray-400 mb-5">
                    While we set up our scheduling system, click below to reach us directly.
                  </p>
                  <Link
                    href="/contact"
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm transition-all"
                  >
                    Contact Us Instead
                  </Link>
                </div>

                <p className="text-xs text-gray-400 text-center mt-4">
                  Prefer to email? Write to us at{" "}
                  <a href="mailto:info@ravesoftsolutions.com" className="text-blue-600 hover:underline">
                    info@ravesoftsolutions.com
                  </a>
                </p>
              </div>

              {/* Who should book */}
              <div className="mt-5 p-5 rounded-xl bg-amber-50 border border-amber-200">
                <h4 className="font-bold text-amber-900 mb-2 text-sm">Best suited for projects:</h4>
                <ul className="text-xs text-amber-800 space-y-1">
                  <li>• New product development (SaaS, app, platform)</li>
                  <li>• Business system replacements (POS, ERP, CRM)</li>
                  <li>• Automation and integration projects</li>
                  <li>• Website redesigns and digital presence upgrades</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
