import type { Metadata } from "next";
import { Mail, Phone, MapPin, MessageCircle } from "lucide-react";
import ContactForm from "@/components/ui/ContactForm";
import { COMPANY } from "@/lib/data";

export const metadata: Metadata = {
  title: "Contact Us | RaveSoft Digital Solutions",
  description:
    "Get in touch with RaveSoft Digital Solutions. We are based in Accra, Ghana and actively work with clients across all 54 African countries and internationally.",
};

const CONTACT_ITEMS = [
  {
    icon: <Mail className="w-5 h-5" />,
    label: "Email",
    value: COMPANY.email,
    href: `mailto:${COMPANY.email}`,
  },
  {
    icon: <Phone className="w-5 h-5" />,
    label: "Phone (Ghana)",
    value: COMPANY.phoneGhana,
    href: `tel:${COMPANY.phoneGhana}`,
  },
  {
    icon: <Phone className="w-5 h-5" />,
    label: "Phone (US)",
    value: COMPANY.phoneUS,
    href: `tel:${COMPANY.phoneUS}`,
  },
  {
    icon: <MessageCircle className="w-5 h-5" />,
    label: "WhatsApp",
    value: "Chat with us on WhatsApp",
    href: `https://wa.me/${COMPANY.whatsapp}`,
  },
  {
    icon: <MapPin className="w-5 h-5" />,
    label: "Location",
    value: COMPANY.location,
    href: null,
  },
];

export default function ContactPage() {
  return (
    <>
      {/* HERO */}
      <section className="relative bg-[#050816] pt-32 pb-16 lg:pt-40 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute bg-grid-dark inset-0 opacity-60" />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-blue-700/14 rounded-full blur-[130px]" />
          <div className="absolute top-1/2 left-1/3 -translate-y-1/2 w-[260px] h-[260px] bg-indigo-700/7 rounded-full blur-[90px]" />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-px h-24 bg-gradient-to-b from-transparent to-blue-500/30" />
        </div>
        <div className="relative max-w-[1280px] mx-auto px-5 sm:px-8 lg:px-10 text-center">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-blue-500/12 border border-blue-500/25 mb-7">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
            <span className="text-sm text-blue-400 font-semibold">Let&#39;s Talk</span>
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-[3.5rem] font-black text-white leading-[1.08] tracking-tighter mb-6 max-w-4xl mx-auto">
            Tell Us About{" "}
            <span style={{background:"linear-gradient(135deg,#60A5FA,#818CF8)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",backgroundClip:"text"}}>
              Your Project
            </span>
          </h1>
          <p className="text-gray-400 text-lg leading-relaxed max-w-2xl mx-auto">
            Fill out the form below and one of our team members will get back to you within one
            business day to discuss your project and next steps.
          </p>
        </div>
      </section>

      {/* FORM + CONTACT INFO */}
      <section className="bg-[#F8FAFB] section-padding">
        <div className="max-w-[1280px] mx-auto px-5 sm:px-8 lg:px-10">
          <div className="grid lg:grid-cols-3 gap-12 items-start">
            {/* Contact Info */}
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">Get in touch</h2>
                <p className="text-sm text-gray-500 leading-relaxed">
                  Prefer to reach us directly? Use any of the channels below. We respond to all
                  inquiries within one business day.
                </p>
              </div>

              <div className="space-y-3">
                {CONTACT_ITEMS.map((item) => (
                  <div
                    key={item.label}
                    className="flex items-start gap-4 p-4 rounded-xl bg-white border border-gray-100 hover:border-blue-100 hover:shadow-sm transition-all"
                  >
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/15 to-indigo-600/10 border border-blue-500/20 flex items-center justify-center text-blue-500 shrink-0">
                      {item.icon}
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-0.5">
                        {item.label}
                      </p>
                      {item.href ? (
                        <a
                          href={item.href}
                          target={item.href.startsWith("https") ? "_blank" : undefined}
                          rel={item.href.startsWith("https") ? "noopener noreferrer" : undefined}
                          className="text-sm font-medium text-gray-800 hover:text-blue-600 transition-colors"
                        >
                          {item.value}
                        </a>
                      ) : (
                        <p className="text-sm font-medium text-gray-800">{item.value}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-5 rounded-xl bg-blue-600 text-white">
                <h3 className="font-bold mb-2">Working hours</h3>
                <p className="text-sm text-blue-100 leading-relaxed">
                  Monday – Friday: 8am – 6pm GMT<br />
                  Saturday: 9am – 2pm GMT<br />
                  Response time: within 1 business day
                </p>
              </div>
            </div>

            {/* Form */}
            <div className="lg:col-span-2">
              <ContactForm />
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
