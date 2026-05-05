"use client";

import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import Link from "next/link";

interface IndustryCardProps {
  name: string;
  description: string;
  icon: React.ReactNode;
  solutions: string[];
  href?: string;
  index?: number;
}

export default function IndustryCard({
  name,
  description,
  icon,
  solutions,
  href = "/industries",
  index = 0,
}: IndustryCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.45, delay: index * 0.07 }}
      className="h-full"
    >
      <Link
        href={href}
        className="group flex flex-col p-7 rounded-2xl bg-white border border-gray-100/80 hover:border-blue-200/80 hover:shadow-xl hover:shadow-blue-500/10 transition-all duration-300 h-full hover:-translate-y-1 relative overflow-hidden"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50/0 to-indigo-50/0 group-hover:from-blue-50/50 group-hover:to-indigo-50/20 transition-all duration-500 pointer-events-none rounded-2xl" />
        <div className="relative w-12 h-12 rounded-2xl flex items-center justify-center text-blue-600 mb-5 transition-all duration-300 shrink-0"
          style={{ background: "linear-gradient(135deg, rgba(59,130,246,0.1) 0%, rgba(99,102,241,0.07) 100%)", border: "1px solid rgba(59,130,246,0.2)" }}
        >
          <div className="w-5 h-5 [&>svg]:w-5 [&>svg]:h-5">{icon}</div>
        </div>
        <h3 className="font-bold text-lg text-gray-900 mb-2.5 group-hover:text-blue-700 transition-colors relative">
          {name}
        </h3>
        <p className="text-sm text-gray-500 leading-relaxed mb-5 flex-1 line-clamp-3 relative">
          {description}
        </p>
        <div className="flex flex-wrap gap-1.5 mb-5 relative">
          {solutions.map((s) => (
            <span
              key={s}
              className="px-2.5 py-1 rounded-full text-xs font-medium text-blue-700 bg-blue-50 border border-blue-100"
            >
              {s}
            </span>
          ))}
        </div>
        <div className="flex items-center gap-1.5 text-sm font-semibold text-blue-600 group-hover:text-blue-700 relative">
          See solutions
          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-200" />
        </div>
      </Link>
    </motion.div>
  );
}
