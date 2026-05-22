"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useInView } from "framer-motion";

interface StatItem {
  value: string;
  label: string;
}

interface ProofBarProps {
  stats: StatItem[];
  dark?: boolean;
}

function CountUp({ value, active }: { value: string; active: boolean }) {
  const match = value.match(/^(\d+)(\D*)$/);
  const [displayed, setDisplayed] = useState(match ? `0${match[2] ?? ""}` : value);

  useEffect(() => {
    if (!active || !match) return;
    const target = parseInt(match[1], 10);
    const suffix = match[2] ?? "";
    const duration = 1800;
    const startTime = performance.now();

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayed(`${Math.round(eased * target)}${suffix}`);
      if (progress < 1) requestAnimationFrame(animate);
    };

    requestAnimationFrame(animate);
  }, [active]); // eslint-disable-line react-hooks/exhaustive-deps

  return <>{displayed}</>;
}

export default function ProofBar({ stats, dark = false }: ProofBarProps) {
  const ref = useRef<HTMLElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section ref={ref} className={`${dark ? "bg-[#060b1f] border-y border-white/8" : "bg-[#F8FAFB] border-y border-gray-100/80"}`}>
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
                i < stats.length - 1 ? (dark ? "md:border-r md:border-white/8" : "md:border-r md:border-gray-100") : ""
              } ${i === stats.length - 1 && stats.length % 2 !== 0 ? "col-span-2 md:col-span-1" : ""}`}
            >
              <div className={`text-3xl lg:text-4xl font-black mb-1.5 tracking-tight tabular-nums ${
                dark ? "text-white" : "text-gray-900"
              }`}>
                <CountUp value={stat.value} active={isInView} />
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
