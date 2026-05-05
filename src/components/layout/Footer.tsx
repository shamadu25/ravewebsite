import Link from "next/link";
import Image from "next/image";
import { Mail, Phone, MapPin, ArrowRight, ExternalLink } from "lucide-react";
import { COMPANY, FOOTER_LINKS } from "@/lib/data";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-[#050816] text-gray-300 relative overflow-hidden">
      {/* Background grid */}
      <div className="absolute inset-0 bg-grid-dark opacity-40 pointer-events-none" />

      {/* Top CTA Strip */}
      <div className="relative border-b border-white/8">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/2 left-1/3 -translate-y-1/2 w-96 h-32 bg-blue-600/8 rounded-full blur-3xl" />
          <div className="absolute top-1/2 right-1/4 -translate-y-1/2 w-64 h-32 bg-amber-500/5 rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-[1280px] mx-auto px-5 sm:px-8 lg:px-10 py-14 lg:py-18">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8">
            <div>
              <p className="text-xs font-bold tracking-widest uppercase text-blue-400 mb-3">Get Started</p>
              <h2 className="text-2xl lg:text-3xl xl:text-4xl font-bold text-white mb-2 leading-tight">
                Ready to build something great?
              </h2>
              <p className="text-gray-400 max-w-lg text-sm leading-relaxed">
                Tell us what you want to build. We will help you create a clear strategy and a system your business can depend on.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 shrink-0">
              <Link
                href="/contact"
                className="flex items-center gap-2 px-6 py-3.5 rounded-xl text-white font-semibold text-sm transition-all"
                style={{
                  background: "linear-gradient(135deg, #3B82F6, #2563eb)",
                  boxShadow: "0 4px 20px rgba(59,130,246,0.35), inset 0 1px 0 rgba(255,255,255,0.12)"
                }}
              >
                Start a Project
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/book-consultation"
                className="flex items-center gap-2 px-6 py-3.5 rounded-xl border border-white/15 hover:border-white/30 text-white font-semibold text-sm transition-all hover:bg-white/5"
              >
                Book Consultation
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Main Footer */}
      <div className="relative max-w-[1280px] mx-auto px-5 sm:px-8 lg:px-10 py-16 lg:py-20">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-12">
          {/* Brand Column */}
          <div className="lg:col-span-2">
            <Link href="/" className="flex items-center mb-5">
              <Image
                src="/img/logo.png"
                alt="RaveSoft Digital Solutions"
                width={140}
                height={84}
                className="h-11 w-auto rounded-lg"
              />
            </Link>
            <p className="text-gray-400 text-sm leading-relaxed mb-3 max-w-xs">
              {COMPANY.description}
            </p>
            <p className="text-gray-600 text-xs leading-relaxed mb-6 max-w-xs">
              Active in Ghana · Nigeria · Kenya · South Africa · Ivory Coast · Senegal · Tanzania · Uganda · Rwanda · Ethiopia · Cameroon · and all 54 African countries.
            </p>
            {/* Contact Info */}
            <div className="space-y-3">
              <a
                href={`mailto:${COMPANY.email}`}
                className="flex items-center gap-3 text-sm text-gray-400 hover:text-white transition-colors group"
              >
                <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/6 flex items-center justify-center group-hover:bg-blue-600/20 group-hover:border-blue-500/25 transition-colors shrink-0">
                  <Mail className="w-3.5 h-3.5 text-blue-400" />
                </div>
                {COMPANY.email}
              </a>
              <a
                href={`tel:${COMPANY.phoneGhana}`}
                className="flex items-center gap-3 text-sm text-gray-400 hover:text-white transition-colors group"
              >
                <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/6 flex items-center justify-center group-hover:bg-blue-600/20 group-hover:border-blue-500/25 transition-colors shrink-0">
                  <Phone className="w-3.5 h-3.5 text-blue-400" />
                </div>
                Ghana: {COMPANY.phoneGhana}
              </a>
              <a
                href={`tel:${COMPANY.phoneUS}`}
                className="flex items-center gap-3 text-sm text-gray-400 hover:text-white transition-colors group"
              >
                <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/6 flex items-center justify-center group-hover:bg-blue-600/20 group-hover:border-blue-500/25 transition-colors shrink-0">
                  <Phone className="w-3.5 h-3.5 text-blue-400" />
                </div>
                US: {COMPANY.phoneUS}
              </a>
              <div className="flex items-center gap-3 text-sm text-gray-400">
                <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/6 flex items-center justify-center shrink-0">
                  <MapPin className="w-3.5 h-3.5 text-blue-400" />
                </div>
                {COMPANY.location}
              </div>
            </div>
            {/* Social */}
            <div className="flex items-center gap-2 mt-6">
              {[
                { icon: ExternalLink, href: COMPANY.social.twitter, label: "Twitter" },
                { icon: ExternalLink, href: COMPANY.social.linkedin, label: "LinkedIn" },
                { icon: ExternalLink, href: COMPANY.social.instagram, label: "Instagram" },
                { icon: ExternalLink, href: COMPANY.social.facebook, label: "Facebook" },
              ].map(({ icon: Icon, href, label }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="w-9 h-9 rounded-xl bg-white/5 border border-white/8 flex items-center justify-center text-gray-400 hover:text-white hover:bg-blue-600/25 hover:border-blue-500/30 transition-all"
                >
                  <Icon className="w-3.5 h-3.5" />
                </a>
              ))}
            </div>
          </div>

          {/* Services */}
          <div>
            <h3 className="font-bold text-white mb-5 text-xs tracking-widest uppercase pb-3 border-b border-white/8">Services</h3>
            <ul className="space-y-3">
              {FOOTER_LINKS.services.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-gray-400 hover:text-white transition-colors hover:translate-x-0.5 inline-block"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Products */}
          <div>
            <h3 className="font-bold text-white mb-5 text-xs tracking-widest uppercase pb-3 border-b border-white/8">Products</h3>
            <ul className="space-y-3">
              {FOOTER_LINKS.products.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-gray-400 hover:text-white transition-colors hover:translate-x-0.5 inline-block"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <h3 className="font-bold text-white mb-5 text-xs tracking-widest uppercase pb-3 border-b border-white/8">Company</h3>
            <ul className="space-y-3">
              {FOOTER_LINKS.company.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-gray-400 hover:text-white transition-colors hover:translate-x-0.5 inline-block"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="relative border-t border-white/8">
        <div className="max-w-[1280px] mx-auto px-5 sm:px-8 lg:px-10 py-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-gray-600">
            © {currentYear} RaveSoft Digital Solutions Ltd. All rights reserved.
          </p>
          <div className="flex items-center gap-6">
            <Link href="/privacy" className="text-xs text-gray-600 hover:text-gray-300 transition-colors">
              Privacy Policy
            </Link>
            <Link href="/terms" className="text-xs text-gray-600 hover:text-gray-300 transition-colors">
              Terms of Service
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}


