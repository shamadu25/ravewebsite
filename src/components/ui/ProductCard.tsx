"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, CheckCircle2 } from "lucide-react";

interface ProductCardProps {
  name: string;
  tagline: string;
  description: string;
  features: string[];
  industries: string[];
  href: string;
  cta: string;
  badge?: string;
  index?: number;
}

export default function ProductCard({
  name,
  tagline,
  description,
  features,
  industries,
  href,
  cta,
  badge,
  index = 0,
}: ProductCardProps) {
  const isFeatured = index === 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      className={`relative flex flex-col h-full rounded-2xl transition-all duration-300 group overflow-hidden ${
        isFeatured
          ? "border border-blue-500/30 hover:border-blue-400/50"
          : "border border-white/8 hover:border-blue-500/25"
      }`}
      style={{
        background: isFeatured
          ? "linear-gradient(145deg, #0d1540 0%, #0a0f2e 60%, #050816 100%)"
          : "#0a0f2e",
        boxShadow: isFeatured
          ? "0 0 0 1px rgba(59,130,246,0.2), 0 20px 60px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)"
          : "0 2px 20px rgba(0,0,0,0.3)"
      }}
    >
      {/* Featured top glow line */}
      {isFeatured && (
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-blue-500/60 to-transparent" />
      )}

      {/* Featured ambient glow */}
      {isFeatured && (
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/8 rounded-full blur-3xl pointer-events-none" />
      )}

      <div className="relative p-6 lg:p-8 flex flex-col h-full">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <h3 className={`text-xl font-bold mb-1 transition-colors ${
              isFeatured
                ? "text-white group-hover:text-blue-200"
                : "text-white group-hover:text-blue-300"
            }`}>
              {name}
            </h3>
            <p className="text-sm text-blue-400 font-medium">{tagline}</p>
          </div>
          {badge && (
            <span className={`shrink-0 px-2.5 py-1 rounded-full text-xs font-bold border ${
              isFeatured
                ? "bg-blue-500/20 text-blue-300 border-blue-400/40"
                : "bg-amber-500/15 text-amber-400 border-amber-500/25"
            }`}>
              {badge}
            </span>
          )}
        </div>

        <p className="text-sm text-gray-400 leading-relaxed mb-6 flex-1">{description}</p>

        {/* Features */}
        <ul className="space-y-2 mb-6">
          {features.slice(0, 4).map((feature) => (
            <li key={feature} className="flex items-start gap-2.5 text-sm text-gray-300">
              <CheckCircle2 className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
              {feature}
            </li>
          ))}
          {features.length > 4 && (
            <li className="text-xs text-gray-500 pl-6">+ {features.length - 4} more features</li>
          )}
        </ul>

        {/* Industries */}
        <div className="mb-6">
          <div className="flex flex-wrap gap-1.5">
            {industries.map((ind) => (
              <span
                key={ind}
                className="px-2.5 py-1 rounded-full text-xs text-gray-400 bg-white/5 border border-white/10"
              >
                {ind}
              </span>
            ))}
          </div>
        </div>

        <Link
          href={href}
          className={`flex items-center gap-2 text-sm font-semibold transition-all group-hover:gap-3 ${
            isFeatured ? "text-blue-300 hover:text-white" : "text-blue-400 hover:text-blue-300"
          }`}
        >
          {cta}
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </motion.div>
  );
}

