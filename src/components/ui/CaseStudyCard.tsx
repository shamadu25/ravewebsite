"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Tag } from "lucide-react";

interface CaseStudyCardProps {
  title: string;
  industry: string;
  tag: string;
  problem: string;
  result: string;
  impact: string;
  href: string;
  index?: number;
}

export default function CaseStudyCard({
  title,
  industry,
  tag,
  problem,
  result,
  impact,
  href,
  index = 0,
}: CaseStudyCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
    >
      <Link
        href={href}
        className="group flex flex-col h-full p-7 rounded-2xl bg-white border border-gray-100/80 hover:border-blue-200/80 shadow-sm hover:shadow-xl hover:shadow-blue-500/10 transition-all duration-300 hover:-translate-y-1 relative overflow-hidden"
      >
        {/* Left border accent */}
        <div className="absolute left-0 top-6 bottom-6 w-[3px] rounded-full bg-gradient-to-b from-blue-500 via-blue-600 to-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-5">
          <div className="flex items-center gap-2">
            <Tag className="w-3.5 h-3.5 text-blue-500" />
            <span className="text-xs font-semibold text-blue-600 uppercase tracking-wider">
              {tag}
            </span>
          </div>
          <span className="px-2.5 py-1 rounded-full text-xs font-medium text-gray-500 bg-gray-100/80 border border-gray-200/80 shrink-0">
            {industry}
          </span>
        </div>

        <h3 className="text-lg font-bold text-gray-900 mb-3 group-hover:text-blue-700 transition-colors leading-snug">
          {title}
        </h3>

        {/* Problem */}
        <div className="mb-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
            The Challenge
          </p>
          <p className="text-sm text-gray-600 leading-relaxed line-clamp-3">{problem}</p>
        </div>

        {/* Result */}
        <div className="mb-5 flex-1">
          <p className="text-xs font-semibold text-green-600 uppercase tracking-wider mb-1.5">
            The Result
          </p>
          <p className="text-sm text-gray-600 leading-relaxed line-clamp-2">{result}</p>
        </div>

        {/* Impact */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-100/80">
          <div className="px-3 py-1.5 rounded-full bg-green-50 border border-green-200/60 flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
            <span className="text-xs font-bold text-green-700">{impact}</span>
          </div>
          <div className="flex items-center gap-1.5 text-sm font-semibold text-blue-600 group-hover:text-blue-700">
            Read more
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-200" />
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
