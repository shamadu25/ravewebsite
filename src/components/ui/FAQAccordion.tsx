"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface FAQItem {
  question: string;
  answer: string;
}

interface FAQAccordionProps {
  items: FAQItem[];
  dark?: boolean;
}

export default function FAQAccordion({ items, dark = false }: FAQAccordionProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <div className="space-y-3">
      {items.map((item, index) => {
        const isOpen = openIndex === index;
        return (
          <div
            key={index}
            className={`rounded-xl border transition-all duration-200 overflow-hidden ${
              dark
                ? isOpen
                  ? "border-blue-500/40 bg-blue-900/20"
                  : "border-white/10 bg-white/5"
                : isOpen
                ? "border-blue-200 bg-blue-50/50"
                : "border-gray-200 bg-white"
            }`}
          >
            <button
              onClick={() => setOpenIndex(isOpen ? null : index)}
              className={`w-full flex items-center justify-between px-5 py-4 text-left ${
                dark ? "text-white" : "text-gray-900"
              }`}
            >
              <span className="font-semibold text-sm pr-4">{item.question}</span>
              <ChevronDown
                className={`w-4 h-4 shrink-0 transition-transform duration-200 ${
                  isOpen ? "rotate-180 text-blue-500" : dark ? "text-gray-400" : "text-gray-400"
                }`}
              />
            </button>
            <AnimatePresence>
              {isOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25 }}
                >
                  <div className={`px-5 pb-4 text-sm leading-relaxed ${dark ? "text-gray-400" : "text-gray-600"}`}>
                    {item.answer}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
