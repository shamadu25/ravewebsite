import {
  Boxes,
  Building2,
  Code2,
  Smartphone,
  Bot,
  Workflow,
  Clock3,
  Eye,
  Unplug,
  Users,
  Repeat2,
  MessageSquareWarning,
  BarChart3,
  ArrowRight,
  ShoppingCart,
  Hotel,
  GraduationCap,
  UtensilsCrossed,
  Scale,
  Stethoscope,
  Globe,
  type LucideIcon,
} from "lucide-react";
import FormCta from "./FormCta";
import FAQAccordion from "@/components/ui/FAQAccordion";
import { COMPANY } from "@/lib/data";
import { solutionByValue } from "@/lib/getStarted";

const wrap = "mx-auto w-full max-w-[1200px] px-5 sm:px-8";
const h2 = "text-2xl font-extrabold tracking-tight sm:text-4xl";
const amberBtn =
  "inline-flex min-h-[52px] items-center justify-center gap-2 rounded-xl bg-[#FFB200] px-7 text-base font-extrabold tracking-wide text-[#070B19] shadow-[0_8px_24px_rgba(255,178,0,0.3)] transition hover:bg-[#ffc233] focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#070B19]";

const label = (v: string) => solutionByValue(v)?.label ?? v;

// ── SECTION 3 — Solutions selector ───────────────────────────────────────────────────────────────

const SELECTOR: { title: string; desc: string; icon: LucideIcon; primary: string; options: string[] }[] = [
  { title: "Business Management Software", desc: "Run sales, stock, purchasing and reporting from one system — POS for shops, ERP for wider operations.", icon: Boxes, primary: "pos", options: ["pos", "erp"] },
  { title: "Industry-Specific Software", desc: "Purpose-built systems for hospitals, hotels, schools, restaurants and legal practices.", icon: Building2, primary: "hospital-management", options: ["hospital-management", "hotel-management", "school-management", "restaurant-management", "legal-practice"] },
  { title: "Custom Software Development", desc: "Software designed around your processes when off-the-shelf tools don't fit.", icon: Code2, primary: "custom-software", options: ["custom-software"] },
  { title: "Websites and Mobile Applications", desc: "Professional websites, web applications and mobile apps for your customers and your team.", icon: Smartphone, primary: "website-development", options: ["website-development", "mobile-app"] },
  { title: "AI Agents and Business Automation", desc: "AI assistants that respond to and follow up customers, plus automation of repetitive admin work.", icon: Bot, primary: "ai-agents", options: ["ai-agents", "business-automation"] },
];

export function SolutionSelector() {
  return (
    <section aria-labelledby="selector-title" className="bg-white py-14 text-gray-900 sm:py-20">
      <div className={wrap}>
        <h2 id="selector-title" className={`${h2} text-center text-[#070B19]`}>WHAT CAN WE HELP YOU SOLVE?</h2>
        <p className="mx-auto mt-3 max-w-2xl text-center text-gray-600">Choose the closest match and we&apos;ll preselect it in the form. You can change it at any time.</p>
        <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {SELECTOR.map((c) => (
            <li key={c.title} className="flex flex-col rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#060297]/8 text-[#060297]" style={{ background: "rgba(6,2,151,0.08)" }}>
                <c.icon className="h-6 w-6" aria-hidden="true" />
              </span>
              <h3 className="mt-4 text-lg font-bold text-[#070B19]">{c.title}</h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-gray-600">{c.desc}</p>
              {c.options.length > 1 && (
                <ul className="mt-4 flex flex-wrap gap-2" aria-label={`${c.title} options`}>
                  {c.options.map((o) => (
                    <li key={o}>
                      <FormCta solution={o} location={`selector_chip_${o}`} className="inline-flex min-h-[36px] items-center rounded-full border border-gray-300 px-3 text-xs font-semibold text-gray-700 hover:border-[#397BFF] hover:text-[#060297] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#397BFF]">
                        {label(o).replace(/ \/ .*$/, "").replace(" Software", "").replace(" System", "")}
                      </FormCta>
                    </li>
                  ))}
                </ul>
              )}
              <FormCta
                solution={c.primary}
                location={`selector_${c.primary}`}
                ariaLabel={`Select ${c.title} and go to the form`}
                className="mt-5 inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-[#060297] px-5 text-sm font-bold text-white hover:bg-[#0a04c4] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#397BFF] focus-visible:ring-offset-2"
              >
                Select this solution <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </FormCta>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

// ── SECTION 4 — Business challenges ──────────────────────────────────────────────────────────────

const CHALLENGES: { text: string; icon: LucideIcon }[] = [
  { text: "Manual processes consuming staff time", icon: Clock3 },
  { text: "Poor visibility into sales, stock and operations", icon: Eye },
  { text: "Disconnected business systems", icon: Unplug },
  { text: "Difficult customer and employee management", icon: Users },
  { text: "Repetitive administrative work", icon: Repeat2 },
  { text: "Slow lead handling", icon: MessageSquareWarning },
  { text: "Inadequate reporting and operational visibility", icon: BarChart3 },
];

export function Challenges() {
  return (
    <section aria-labelledby="challenges-title" className="bg-[#F5F7FA] py-14 text-gray-900 sm:py-20">
      <div className={wrap}>
        <h2 id="challenges-title" className={`${h2} text-center text-[#070B19]`}>YOUR BUSINESS DESERVES BETTER SYSTEMS.</h2>
        <p className="mx-auto mt-3 max-w-2xl text-center text-gray-600">Many growing businesses run into some of these. If any sound familiar, that&apos;s a good place to start the conversation.</p>
        <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {CHALLENGES.map((c) => (
            <li key={c.text} className="flex items-start gap-3 rounded-xl border border-gray-200 bg-white p-4">
              <c.icon className="mt-0.5 h-5 w-5 shrink-0 text-[#397BFF]" aria-hidden="true" />
              <span className="text-sm font-medium text-gray-800">{c.text}</span>
            </li>
          ))}
          <li className="flex items-center rounded-xl bg-[#060297] p-4 text-sm font-semibold text-white sm:col-span-2 lg:col-span-1">
            RaveSoft works as your technology partner — helping you find, implement or build the right solution for the challenges you actually have.
          </li>
        </ul>
      </div>
    </section>
  );
}

// ── SECTION 5 — RaveSoft solutions (four categories) ─────────────────────────────────────────────

const CATEGORIES: { title: string; icon: LucideIcon; primary: string; items: { name: string; solution: string }[] }[] = [
  { title: "BUSINESS OPERATIONS", icon: ShoppingCart, primary: "pos", items: [{ name: "CliqPOS", solution: "pos" }, { name: "ERP", solution: "erp" }] },
  {
    title: "INDUSTRY SOFTWARE",
    icon: Stethoscope,
    primary: "hospital-management",
    items: [
      { name: "Hospital Management", solution: "hospital-management" },
      { name: "Hotel Management", solution: "hotel-management" },
      { name: "School Management", solution: "school-management" },
      { name: "Restaurant Management", solution: "restaurant-management" },
      { name: "Legal Practice Management", solution: "legal-practice" },
    ],
  },
  {
    title: "DIGITAL DEVELOPMENT",
    icon: Globe,
    primary: "custom-software",
    items: [
      { name: "Custom Software", solution: "custom-software" },
      { name: "Website Development", solution: "website-development" },
      { name: "Web Applications", solution: "custom-software" },
      { name: "Mobile Applications", solution: "mobile-app" },
    ],
  },
  {
    title: "AI AND AUTOMATION",
    icon: Workflow,
    primary: "ai-agents",
    items: [
      { name: "AI Agents", solution: "ai-agents" },
      { name: "AI Employees", solution: "ai-agents" },
      { name: "AI Sales Automation", solution: "ai-agents" },
      { name: "Business Process Automation", solution: "business-automation" },
    ],
  },
];

const ITEM_ICON: Record<string, LucideIcon> = { "hotel-management": Hotel, "school-management": GraduationCap, "restaurant-management": UtensilsCrossed, "legal-practice": Scale };

export function Offerings() {
  return (
    <section aria-labelledby="offerings-title" className="bg-[#070B19] py-14 text-white sm:py-20">
      <div className={wrap}>
        <h2 id="offerings-title" className={`${h2} text-center`}>RAVESOFT SOLUTIONS</h2>
        <p className="mx-auto mt-3 max-w-2xl text-center text-gray-300">Business software, industry systems, custom development and AI — from one provider.</p>
        <div className="mt-10 grid gap-5 md:grid-cols-2">
          {CATEGORIES.map((c) => (
            <div key={c.title} className="flex flex-col rounded-2xl border border-white/10 bg-white/[0.04] p-6">
              <h3 className="flex items-center gap-3 text-sm font-extrabold tracking-[0.14em] text-[#FFB200]">
                <c.icon className="h-5 w-5" aria-hidden="true" /> {c.title}
              </h3>
              <ul className="mt-4 flex-1 space-y-1">
                {c.items.map((i) => {
                  const Icon = ITEM_ICON[i.solution];
                  return (
                    <li key={i.name}>
                      <FormCta solution={i.solution} location={`offering_${i.name.toLowerCase().replace(/\W+/g, "_")}`} className="group flex min-h-[44px] items-center justify-between rounded-lg px-3 text-[15px] font-medium text-gray-100 hover:bg-white/8 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#397BFF]">
                        <span className="flex items-center gap-2.5">
                          {Icon ? <Icon className="h-4 w-4 text-[#397BFF]" aria-hidden="true" /> : <span className="h-1.5 w-1.5 rounded-full bg-[#397BFF]" aria-hidden="true" />}
                          {i.name}
                        </span>
                        <ArrowRight className="h-4 w-4 opacity-0 transition group-hover:opacity-70 group-focus-visible:opacity-70" aria-hidden="true" />
                      </FormCta>
                    </li>
                  );
                })}
              </ul>
              <FormCta solution={c.primary} location={`category_${c.title.toLowerCase().replace(/\W+/g, "_")}`} ariaLabel={`Enquire about ${c.title.toLowerCase()}`} className="mt-5 inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-[#FFB200]/60 px-5 text-sm font-bold text-[#FFB200] hover:bg-[#FFB200] hover:text-[#070B19] focus:outline-none focus-visible:ring-2 focus-visible:ring-white">
                Enquire about this <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </FormCta>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── SECTION 6 — How it works ─────────────────────────────────────────────────────────────────────

const STEPS = [
  { t: "Tell us what you need", d: "Share your business details and the solution you're interested in." },
  { t: "We understand your business requirements", d: "Our team reviews your enquiry and gets in touch to learn how your business works." },
  { t: "We recommend an appropriate solution", d: "You get a recommendation based on your needs — not a one-size-fits-all package." },
  { t: "If there is a fit, proceed with the agreed implementation", d: "We agree the scope and next steps with you before anything begins." },
];

export function HowItWorks() {
  return (
    <section aria-labelledby="how-title" className="bg-white py-14 text-gray-900 sm:py-20">
      <div className={wrap}>
        <h2 id="how-title" className={`${h2} text-center text-[#070B19]`}>GET STARTED IN FOUR SIMPLE STEPS.</h2>
        <ol className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s, i) => (
            <li key={s.t} className="rounded-2xl border border-gray-200 p-6">
              <span aria-hidden="true" className="flex h-10 w-10 items-center justify-center rounded-full bg-[#FFB200] text-base font-extrabold text-[#070B19]">{i + 1}</span>
              <h3 className="mt-4 text-base font-bold text-[#070B19]"><span className="sr-only">Step {i + 1}: </span>{s.t}</h3>
              <p className="mt-2 text-sm leading-relaxed text-gray-600">{s.d}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

// ── SECTION 7 — Why RaveSoft (factual positioning only: no statistics, rankings or testimonials) ──

const WHY = [
  { t: "Software and digital solutions from one provider", d: "Business software, custom development and AI automation under one roof, so your systems are planned together." },
  { t: "Solutions across multiple industries", d: "Retail, hospitality, healthcare, education, legal and more — with industry-specific systems where they fit." },
  { t: "Custom software development", d: "When a ready-made product isn't right, we design and build software around your processes." },
  { t: "AI and business automation", d: "AI agents and workflow automation to reduce repetitive work and speed up customer response." },
  { t: "A consultation-led approach", d: "We start by understanding your business, then recommend what fits — including telling you if something isn't a fit." },
];

export function WhyRaveSoft() {
  return (
    <section aria-labelledby="why-title" className="bg-[#F5F7FA] py-14 text-gray-900 sm:py-20">
      <div className={wrap}>
        <h2 id="why-title" className={`${h2} text-center text-[#070B19]`}>WHY RAVESOFT</h2>
        <p className="mx-auto mt-3 max-w-2xl text-center text-gray-600">{COMPANY.name} is based in {COMPANY.location}.</p>
        <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {WHY.map((w) => (
            <li key={w.t} className="rounded-2xl border border-gray-200 bg-white p-6">
              <h3 className="text-base font-bold text-[#070B19]">{w.t}</h3>
              <p className="mt-2 text-sm leading-relaxed text-gray-600">{w.d}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

// ── SECTION 8 — FAQ ──────────────────────────────────────────────────────────────────────────────

export const LANDING_FAQS = [
  { question: "What types of businesses does RaveSoft work with?", answer: "RaveSoft works with businesses in retail and wholesale, hospitality, restaurants and food service, healthcare, education, legal and professional services, real estate, financial services, and manufacturing and distribution — as well as organisations whose needs don't fit a standard category. If you're unsure, tell us what your business does and we'll advise." },
  { question: "What software solutions do you offer?", answer: "Business management software (CliqPOS point-of-sale and ERP), industry-specific systems (hospital, hotel, school, restaurant and legal practice management), custom software, website and mobile app development, and AI agents and business process automation." },
  { question: "Can RaveSoft build software specifically for my business?", answer: "Yes. Custom software development is one of RaveSoft's core services. Share your requirements and we'll discuss what's possible and the best way to approach it." },
  { question: "Can I request a consultation before purchasing?", answer: "Yes. The consultation is free and carries no obligation. It's a conversation about your needs so we can recommend an appropriate solution — submitting the form does not commit you to anything." },
  { question: "Do you serve businesses outside Ghana?", answer: "RaveSoft is based in Accra, Ghana, and works with businesses in Ghana, Nigeria and other markets. Tell us where your business operates in the form and we'll confirm how we can support you." },
  { question: "How long does it take to receive a response?", answer: "Our team reviews each enquiry and contacts you using the phone number or email you provide. We don't promise a fixed response time, but we work through enquiries during business hours: Monday to Friday 8am–6pm GMT and Saturday 9am–2pm GMT." },
  { question: "What happens after I submit the form?", answer: "You'll see a confirmation straight away and your enquiry is sent to the RaveSoft team. We review your requirements, contact you using the details you gave, and — if there's a fit — recommend an appropriate solution and agree the next steps with you." },
];

export function Faq() {
  return (
    <section aria-labelledby="faq-title" className="bg-white py-14 text-gray-900 sm:py-20">
      <div className={`${wrap} max-w-3xl`}>
        <h2 id="faq-title" className={`${h2} text-center text-[#070B19]`}>FREQUENTLY ASKED QUESTIONS</h2>
        <div className="mt-8">
          <FAQAccordion items={LANDING_FAQS} />
        </div>
      </div>
    </section>
  );
}

// ── SECTION 9 — Final CTA ────────────────────────────────────────────────────────────────────────

export function FinalCta() {
  return (
    <section aria-labelledby="final-title" className="relative overflow-hidden bg-[#060297] py-16 text-white sm:py-24">
      <div className={`${wrap} text-center`}>
        <h2 id="final-title" className="mx-auto max-w-3xl text-2xl font-extrabold tracking-tight sm:text-4xl">LET&apos;S FIND THE RIGHT TECHNOLOGY SOLUTION FOR YOUR BUSINESS.</h2>
        <p className="mx-auto mt-4 max-w-xl text-blue-100">Free consultation. No obligation.</p>
        <FormCta location="final_cta" className={`${amberBtn} mt-8`}>
          GET STARTED WITH RAVESOFT <ArrowRight className="h-5 w-5" aria-hidden="true" />
        </FormCta>
      </div>
    </section>
  );
}
