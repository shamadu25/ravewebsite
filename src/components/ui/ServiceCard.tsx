"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

interface ServiceCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  href: string;
  accentColor?: string;
  index?: number;
}

export default function ServiceCard({
  title,
  description,
  icon,
  href,
  index = 0,
}: ServiceCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.5, delay: index * 0.08 }}
      className="h-full"
    >
      <Link
        href={href}
        className="group flex flex-col h-full p-8 rounded-2xl bg-white border border-gray-100 hover:border-blue-300/70 shadow-sm hover:shadow-[0_24px_64px_rgba(59,130,246,0.18),0_4px_16px_rgba(59,130,246,0.08)] transition-all duration-300 hover:-translate-y-2 relative overflow-hidden"
      >
        {/* Hover gradient wash */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50/0 via-transparent to-indigo-50/0 group-hover:from-blue-50/70 group-hover:to-indigo-50/40 transition-all duration-500 rounded-2xl pointer-events-none" />

        {/* Animated glow border */}
        <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
          style={{ boxShadow: "inset 0 0 0 1px rgba(59,130,246,0.3)" }} />

        {/* Icon */}
        <div className="relative w-14 h-14 rounded-2xl flex items-center justify-center mb-6 transition-all duration-300 shrink-0 group-hover:scale-110 group-hover:rotate-3"
          style={{ background: "linear-gradient(135deg, rgba(59,130,246,0.14) 0%, rgba(99,102,241,0.09) 100%)" }}
        >
          <div className="text-blue-600 group-hover:text-blue-700 transition-colors w-6 h-6 [&>svg]:w-6 [&>svg]:h-6">
            {icon}
          </div>
          <div className="absolute inset-0 rounded-2xl border border-blue-200/60 group-hover:border-blue-400/60 transition-colors" />
        </div>

        {/* Content */}
        <h3 className="text-xl font-bold text-gray-900 mb-3 group-hover:text-blue-700 transition-colors leading-tight relative">
          {title}
        </h3>
        <p className="text-base text-gray-500 leading-relaxed flex-1 mb-6 relative">{description}</p>

        {/* CTA */}
        <div className="flex items-center gap-1.5 text-sm font-semibold text-blue-600 group-hover:text-blue-700 relative transition-colors">
          Learn more
          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-200" />
        </div>
      </Link>
    </motion.div>
  );
}
