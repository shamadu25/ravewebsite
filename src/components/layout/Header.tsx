"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Menu, X, ChevronDown, ArrowRight } from "lucide-react";
import { NAV_LINKS, NAV_SERVICES, PRODUCTS, type NavChild, type NavLink } from "@/lib/data";

type MenuKey = NonNullable<NavLink["menu"]>;

/** Children for each dropdown. Products are derived from PRODUCTS so a new product appears automatically. */
const MENUS: Record<MenuKey, { allLabel: string; items: NavChild[] }> = {
  services: { allLabel: "All Services", items: NAV_SERVICES },
  products: {
    allLabel: "All Products",
    items: PRODUCTS.map((p) => ({ label: p.name, href: p.href, desc: p.tagline })),
  },
};

const isActivePath = (pathname: string | null, href: string) =>
  !!pathname && (href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`));

function DesktopMenu({
  link,
  pathname,
  open,
  active,
  onOpen,
  onClose,
}: {
  link: NavLink & { menu: MenuKey };
  pathname: string | null;
  open: boolean;
  active: boolean;
  onOpen: () => void;
  onClose: () => void;
}) {
  const panelId = useId();
  const button = useRef<HTMLButtonElement>(null);
  const root = useRef<HTMLDivElement>(null);
  const { allLabel, items } = MENUS[link.menu];

  return (
    <div
      ref={root}
      className="relative"
      onMouseEnter={onOpen}
      onMouseLeave={onClose}
      onBlur={(e) => {
        // Close when keyboard focus leaves the whole menu (not when it moves between its own links).
        if (!root.current?.contains(e.relatedTarget as Node | null)) onClose();
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape" && open) {
          onClose();
          button.current?.focus();
        }
      }}
    >
      <button
        ref={button}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => (open ? onClose() : onOpen())}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            onOpen();
            // focus the first link once the panel is visible
            requestAnimationFrame(() => root.current?.querySelector<HTMLAnchorElement>(`#${CSS.escape(panelId)} a`)?.focus());
          }
        }}
        className={`flex items-center gap-1.5 px-3 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 ${
          active ? "text-blue-400 bg-blue-500/10" : "text-gray-300 hover:text-white hover:bg-white/6"
        }`}
      >
        {link.label}
        <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${open ? "rotate-180 text-blue-400" : ""}`} aria-hidden="true" />
      </button>

      {/* `invisible` removes the hidden links from the tab order (opacity alone would not). */}
      <div
        id={panelId}
        className={`absolute top-full left-1/2 -translate-x-1/2 pt-2 w-80 transition-all duration-200 ${
          open ? "opacity-100 translate-y-0 visible" : "opacity-0 -translate-y-2 invisible pointer-events-none"
        }`}
      >
        <div className="rounded-2xl bg-[#080d28]/98 border border-white/10 shadow-[0_24px_64px_rgba(0,0,0,0.6)] backdrop-blur-2xl overflow-hidden p-2">
          <Link
            href={link.href}
            className="flex items-center justify-between px-4 py-2.5 rounded-xl text-sm font-semibold text-white hover:bg-blue-600/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 transition-colors group mb-1"
          >
            {allLabel}
            <ArrowRight className="w-3.5 h-3.5 text-blue-400 group-hover:translate-x-0.5 transition-transform" aria-hidden="true" />
          </Link>
          <div className="h-px bg-white/8 mb-1" />
          {items.map((s) => (
            <Link
              key={s.href}
              href={s.href}
              aria-current={isActivePath(pathname, s.href) ? "page" : undefined}
              className="flex flex-col px-4 py-2.5 rounded-xl hover:bg-white/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 transition-colors group"
            >
              <span className="text-sm font-medium text-gray-200 group-hover:text-white transition-colors">{s.label}</span>
              <span className="text-[11px] text-gray-400 mt-0.5">{s.desc}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

function MobileAccordion({ link, pathname }: { link: NavLink & { menu: MenuKey }; pathname: string | null }) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const { allLabel, items } = MENUS[link.menu];
  return (
    <div>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((o) => !o)}
        className={`w-full flex items-center justify-between px-4 py-3.5 rounded-xl text-base font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 ${
          isActivePath(pathname, link.href) ? "text-blue-400 bg-blue-500/12 border border-blue-500/20" : "text-gray-300 hover:text-white hover:bg-white/5"
        }`}
      >
        {link.label}
        <ChevronDown className={`w-4 h-4 opacity-60 transition-transform duration-200 ${open ? "rotate-180" : ""}`} aria-hidden="true" />
      </button>
      {open && (
        <div id={panelId} className="mt-1 mb-2 ml-3 pl-3 border-l border-white/10 space-y-0.5">
          <Link href={link.href} className="flex items-center justify-between px-4 py-3 rounded-xl text-sm font-semibold text-white hover:bg-white/5">
            {allLabel}
            <ArrowRight className="w-3.5 h-3.5 opacity-50" aria-hidden="true" />
          </Link>
          {items.map((s) => (
            <Link
              key={s.href}
              href={s.href}
              aria-current={isActivePath(pathname, s.href) ? "page" : undefined}
              className="flex flex-col px-4 py-3 rounded-xl text-sm text-gray-300 hover:text-white hover:bg-white/5 transition-colors"
            >
              {s.label}
              <span className="text-[11px] text-gray-400 mt-0.5">{s.desc}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Header() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openMenu, setOpenMenu] = useState<MenuKey | null>(null);
  const pathname = usePathname();
  const toggle = useRef<HTMLButtonElement>(null);
  const mobileId = useId();

  // Close menus when the route changes (state reset during render — the React-recommended pattern).
  const [prevPath, setPrevPath] = useState(pathname);
  if (pathname !== prevPath) {
    setPrevPath(pathname);
    setMobileOpen(false);
    setOpenMenu(null);
  }

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 30);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    // Lets CSS hide the floating chat launcher while the full-screen menu is open (it would cover menu rows).
    if (mobileOpen) document.body.dataset.mobileNavOpen = "true";
    else delete document.body.dataset.mobileNavOpen;
    return () => {
      document.body.style.overflow = "";
      delete document.body.dataset.mobileNavOpen;
    };
  }, [mobileOpen]);

  // Esc closes the mobile menu and gives focus back to its toggle button.
  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMobileOpen(false);
        toggle.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [mobileOpen]);

  if (pathname?.startsWith("/ai-employee")) {
    return null;
  }

  // The logo already links home, so "Home" is only listed in the mobile menu.
  const desktopLinks = NAV_LINKS.filter((l) => l.href !== "/");

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        isScrolled ? "bg-[#050816]/92 backdrop-blur-2xl border-b border-white/8 shadow-[0_8px_32px_rgba(0,0,0,0.4)]" : "bg-transparent"
      }`}
    >
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[60] focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-gray-900 focus:shadow-lg"
      >
        Skip to main content
      </a>

      <div className="max-w-[1280px] mx-auto px-5 sm:px-8 lg:px-10">
        <div className="flex items-center justify-between h-[68px] lg:h-[72px]">
          {/* Logo */}
          <Link href="/" className="flex items-center shrink-0" aria-label="RaveSoft Digital Solutions — home">
            <div className="bg-white rounded-xl px-2.5 py-1.5 shadow-sm border border-white/20">
              <Image src="/img/logo.png" alt="" width={134} height={80} className="h-8 w-auto" priority />
            </div>
          </Link>

          {/* Desktop Nav */}
          <nav aria-label="Main" className="hidden lg:flex items-center gap-0.5">
            {desktopLinks.map((link) =>
              link.menu ? (
                <DesktopMenu
                  key={link.label}
                  link={{ ...link, menu: link.menu }}
                  pathname={pathname}
                  open={openMenu === link.menu}
                  active={isActivePath(pathname, link.href)}
                  onOpen={() => setOpenMenu(link.menu as MenuKey)}
                  onClose={() => setOpenMenu((m) => (m === link.menu ? null : m))}
                />
              ) : (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={isActivePath(pathname, link.href) ? "page" : undefined}
                  className={`px-3 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 ${
                    isActivePath(pathname, link.href) ? "text-blue-400 bg-blue-500/10" : "text-gray-300 hover:text-white hover:bg-white/6"
                  }`}
                >
                  {link.label}
                </Link>
              )
            )}
          </nav>

          {/* CTAs */}
          <div className="hidden lg:flex items-center gap-3">
            <Link href="/contact" className="px-4 py-2 rounded-lg text-sm font-medium text-gray-300 hover:text-white transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400">
              Contact
            </Link>
            <Link
              href="/book-consultation"
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap text-white transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
              style={{
                background: "linear-gradient(135deg, #F59E0B 0%, #D97706 100%)",
                boxShadow: "0 4px 20px rgba(245,158,11,0.4), inset 0 1px 0 rgba(255,255,255,0.15)",
              }}
            >
              Book a Free Consultation
              <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
            </Link>
          </div>

          {/* Mobile toggle */}
          <button
            ref={toggle}
            type="button"
            onClick={() => setMobileOpen((o) => !o)}
            aria-expanded={mobileOpen}
            aria-controls={mobileId}
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            className="lg:hidden w-11 h-11 flex items-center justify-center rounded-xl text-white hover:bg-white/8 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
          >
            {mobileOpen ? <X className="w-5 h-5" aria-hidden="true" /> : <Menu className="w-5 h-5" aria-hidden="true" />}
          </button>
        </div>
      </div>

      {/* Mobile nav */}
      {mobileOpen && (
        <nav id={mobileId} aria-label="Mobile" className="lg:hidden fixed inset-0 top-[68px] bg-[#050816] backdrop-blur-2xl overflow-y-auto z-40">
          <div className="px-5 py-6 space-y-1 max-w-lg mx-auto">
            {NAV_LINKS.map((link) =>
              link.menu ? (
                <MobileAccordion key={link.label} link={{ ...link, menu: link.menu }} pathname={pathname} />
              ) : (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={isActivePath(pathname, link.href) ? "page" : undefined}
                  className={`flex items-center justify-between px-4 py-3.5 rounded-xl text-base font-medium transition-colors ${
                    isActivePath(pathname, link.href) ? "text-blue-400 bg-blue-500/12 border border-blue-500/20" : "text-gray-300 hover:text-white hover:bg-white/5"
                  }`}
                >
                  {link.label}
                  <ArrowRight className="w-4 h-4 opacity-40" aria-hidden="true" />
                </Link>
              )
            )}

            <div className="pt-4 space-y-3">
              <Link href="/contact" className="block w-full text-center px-5 py-3.5 rounded-xl text-sm font-semibold border border-white/20 text-white hover:bg-white/5 transition-all">
                Contact Us
              </Link>
              <Link
                href="/book-consultation"
                className="flex items-center justify-center gap-2 w-full px-5 py-3.5 rounded-xl text-sm font-bold text-white transition-all"
                style={{ background: "linear-gradient(135deg, #F59E0B, #D97706)", boxShadow: "0 4px 20px rgba(245,158,11,0.3)" }}
              >
                Book a Free Consultation
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </nav>
      )}
    </header>
  );
}
