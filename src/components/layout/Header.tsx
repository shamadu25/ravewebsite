"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Menu, X, ChevronDown, ArrowRight } from "lucide-react";
import { NAV_LINKS } from "@/lib/data";

const servicesDropdown = [
  { label: "Custom Software", href: "/services/custom-software", desc: "Tailored systems for your operations" },
  { label: "SaaS Development", href: "/services/saas-development", desc: "Build scalable software products" },
  { label: "Website Design", href: "/services/website-design", desc: "Premium, conversion-focused websites" },
  { label: "Mobile Apps", href: "/services/mobile-apps", desc: "iOS and Android applications" },
  { label: "Business Automation", href: "/services/business-automation", desc: "AI-powered workflow automation" },
  { label: "POS & ERP", href: "/services/pos-erp", desc: "Complete business management" },
];

export default function Header() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [servicesOpen, setServicesOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 30);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Close any open menus when the route changes. Resetting UI state in
  // response to navigation is the intended pattern here.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMobileOpen(false);
    setServicesOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        isScrolled
          ? "bg-[#050816]/92 backdrop-blur-2xl border-b border-white/8 shadow-[0_8px_32px_rgba(0,0,0,0.4)]"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-[1280px] mx-auto px-5 sm:px-8 lg:px-10">
        <div className="flex items-center justify-between h-[68px] lg:h-[72px]">

          {/* Logo */}
          <Link href="/" className="flex items-center shrink-0">
            <div className="bg-white rounded-xl px-2.5 py-1.5 shadow-sm border border-white/20">
              <Image
                src="/img/logo.png"
                alt="RaveSoft Digital Solutions"
                width={134}
                height={80}
                className="h-8 w-auto"
                priority
              />
            </div>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden lg:flex items-center gap-0.5">
            {NAV_LINKS.map((link) => {
              if (link.label === "Services") {
                return (
                  <div
                    key={link.label}
                    className="relative"
                    onMouseEnter={() => setServicesOpen(true)}
                    onMouseLeave={() => setServicesOpen(false)}
                  >
                    <button className={`flex items-center gap-1.5 px-3 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all duration-200 text-gray-300 hover:text-white hover:bg-white/6`}>
                      Services
                      <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${servicesOpen ? "rotate-180 text-blue-400" : ""}`} />
                    </button>

                    {/* Dropdown */}
                    <div className={`absolute top-full left-1/2 -translate-x-1/2 mt-2 w-72 transition-all duration-200 ${servicesOpen ? "opacity-100 translate-y-0 pointer-events-auto" : "opacity-0 -translate-y-2 pointer-events-none"}`}>
                      <div className="rounded-2xl bg-[#080d28]/98 border border-white/10 shadow-[0_24px_64px_rgba(0,0,0,0.6)] backdrop-blur-2xl overflow-hidden p-2">
                        <Link href="/services" className="flex items-center justify-between px-4 py-2.5 rounded-xl text-sm font-semibold text-white hover:bg-blue-600/15 transition-colors group mb-1">
                          All Services
                          <ArrowRight className="w-3.5 h-3.5 text-blue-400 group-hover:translate-x-0.5 transition-transform" />
                        </Link>
                        <div className="h-px bg-white/8 mb-1" />
                        {servicesDropdown.map((s) => (
                          <Link key={s.href} href={s.href}
                            className="flex flex-col px-4 py-2.5 rounded-xl hover:bg-white/5 transition-colors group"
                          >
                            <span className="text-sm font-medium text-gray-200 group-hover:text-white transition-colors">{s.label}</span>
                            <span className="text-[11px] text-gray-500 mt-0.5">{s.desc}</span>
                          </Link>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              }
              return (
                <Link key={link.href} href={link.href}
                  className={`px-3 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all duration-200 ${
                    pathname === link.href
                      ? "text-blue-400 bg-blue-500/10"
                      : "text-gray-300 hover:text-white hover:bg-white/6"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>

          {/* CTAs */}
          <div className="hidden lg:flex items-center gap-3">
            <Link href="/contact"
              className="px-4 py-2 rounded-lg text-sm font-medium text-gray-300 hover:text-white transition-colors"
            >
              Contact
            </Link>
            <Link href="/book-consultation"
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap text-white transition-all duration-200"
              style={{
                background: "linear-gradient(135deg, #F59E0B 0%, #D97706 100%)",
                boxShadow: "0 4px 20px rgba(245,158,11,0.4), inset 0 1px 0 rgba(255,255,255,0.15)"
              }}
            >
              Book a Free Consultation
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Mobile toggle */}
          <button onClick={() => setMobileOpen(!mobileOpen)}
            className="lg:hidden w-10 h-10 flex items-center justify-center rounded-xl text-white hover:bg-white/8 transition-colors"
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile nav */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 top-[68px] bg-[#050816]/99 backdrop-blur-2xl overflow-y-auto z-40">
          <div className="px-5 py-6 space-y-1 max-w-lg mx-auto">
            {NAV_LINKS.map((link) => (
              <Link key={link.href} href={link.href}
                className={`flex items-center justify-between px-4 py-3.5 rounded-xl text-base font-medium transition-colors ${
                  pathname === link.href
                    ? "text-blue-400 bg-blue-500/12 border border-blue-500/20"
                    : "text-gray-300 hover:text-white hover:bg-white/5"
                }`}
              >
                {link.label}
                <ArrowRight className="w-4 h-4 opacity-40" />
              </Link>
            ))}

            <div className="pt-4 pb-2">
              <p className="px-4 text-[11px] text-gray-600 uppercase tracking-widest font-semibold mb-2">Services</p>
              {servicesDropdown.map((s) => (
                <Link key={s.href} href={s.href}
                  className="flex items-center justify-between px-4 py-3 rounded-xl text-sm text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
                >
                  {s.label}
                  <ArrowRight className="w-3.5 h-3.5 opacity-30" />
                </Link>
              ))}
            </div>

            <div className="pt-4 space-y-3">
              <Link href="/contact"
                className="block w-full text-center px-5 py-3.5 rounded-xl text-sm font-semibold border border-white/20 text-white hover:bg-white/5 transition-all"
              >
                Contact Us
              </Link>
              <Link href="/book-consultation"
                className="flex items-center justify-center gap-2 w-full px-5 py-3.5 rounded-xl text-sm font-bold text-white transition-all"
                style={{ background: "linear-gradient(135deg, #F59E0B, #D97706)", boxShadow: "0 4px 20px rgba(245,158,11,0.3)" }}
              >
                Book a Free Consultation
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}


