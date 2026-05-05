"use client";

import { motion } from "framer-motion";

interface StatItem {
  value: string;
  label: string;
}

interface ProofBarProps {
  stats: StatItem[];
  dark?: boolean;
}

export default function ProofBar({ stats, dark = false }: ProofBarProps) {
  return (
    <section className={`${dark ? "bg-[#060b1f] border-y border-white/8" : "bg-[#F8FAFB] border-y border-gray-100/80"}`}>
      <div className="max-w-[1280px] mx-auto px-5 sm:px-8 lg:px-10 py-10 lg:py-14">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.07 }}
              className={`text-center px-6 py-6 relative ${
                i < stats.length - 1 ? (dark ? "border-r border-white/8" : "border-r border-gray-100") : ""
              } ${i === stats.length - 1 && stats.length % 2 !== 0 ? "col-span-2 md:col-span-1" : ""}`}
            >
              <div className={`text-3xl lg:text-4xl font-black mb-1.5 tracking-tight ${
                dark ? "text-white" : "text-gray-900"
              }`}>
                {stat.value}
              </div>
              <div className={`text-xs leading-relaxed ${dark ? "text-gray-400" : "text-gray-500"}`}>
                {stat.label}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
