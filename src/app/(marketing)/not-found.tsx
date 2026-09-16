"use client";

import Link from "next/link";
import { ArrowRight, Home, Search } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#050816] flex items-center justify-center px-4">
      {/* Background gradient */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-blue-700/8 rounded-full blur-[120px]" />
      </div>

      <div className="relative text-center max-w-lg">
        <div className="text-[10rem] font-black text-white/5 leading-none select-none mb-0">
          404
        </div>
        <div className="-mt-8 mb-6">
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-3">Page not found</h1>
          <p className="text-gray-400 leading-relaxed">
            The page you are looking for doesn&apos;t exist or has been moved. Let&apos;s get
            you back on track.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center mb-10">
          <Link
            href="/"
            className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm transition-all"
          >
            <Home className="w-4 h-4" />
            Back to Home
          </Link>
          <Link
            href="/contact"
            className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl border border-white/20 hover:border-white/40 text-white font-semibold text-sm transition-all hover:bg-white/5"
          >
            Contact Us
          </Link>
        </div>

        {/* Quick links */}
        <div className="text-left">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3 text-center">
            Popular pages
          </p>
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: "Services", href: "/services" },
              { label: "Products", href: "/products" },
              { label: "Case Studies", href: "/case-studies" },
              { label: "About Us", href: "/about" },
            ].map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="flex items-center justify-between px-4 py-3 rounded-xl border border-white/10 hover:border-blue-500/40 text-gray-400 hover:text-white text-sm font-medium transition-all group"
              >
                {link.label}
                <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
