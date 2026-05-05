"use client";

import { motion } from "framer-motion";

interface ProcessStepProps {
  step: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  isLast?: boolean;
  index?: number;
}

export default function ProcessStep({
  step,
  title,
  description,
  icon,
  isLast = false,
  index = 0,
}: ProcessStepProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      className="relative flex gap-5"
    >
      {/* Step indicator + line */}
      <div className="flex flex-col items-center">
        {/* Glowing node */}
        <div className="relative w-12 h-12 shrink-0 z-10">
          <div className="absolute inset-0 rounded-full bg-blue-500/20 blur-md" />
          <div className="relative w-12 h-12 rounded-full border-2 border-blue-500/40 bg-gradient-to-br from-blue-900/80 to-[#060b1f] flex items-center justify-center text-blue-400 shadow-[0_0_20px_rgba(59,130,246,0.2)]">
            {icon}
          </div>
          {/* Ring pulse */}
          <div className="absolute inset-[-4px] rounded-full border border-blue-500/15" />
        </div>
        {!isLast && (
          <div className="w-px flex-1 mt-2 min-h-[2.5rem]" style={{ background: "linear-gradient(to bottom, rgba(59,130,246,0.4), rgba(59,130,246,0.05))" }} />
        )}
      </div>

      {/* Content */}
      <div className="pb-12 flex-1 relative">
        {/* Background watermark */}
        <div className="absolute -top-6 -left-2 text-[5rem] font-black text-white/[0.03] leading-none select-none pointer-events-none">
          {step.padStart(2, '0')}
        </div>
        <div className="flex items-center gap-2 mb-2">
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-widest uppercase bg-blue-500/15 text-blue-400 border border-blue-500/25">
            Step {step}
          </span>
        </div>
        <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
        <p className="text-sm text-gray-400 leading-relaxed max-w-sm">{description}</p>
      </div>
    </motion.div>
  );
}
