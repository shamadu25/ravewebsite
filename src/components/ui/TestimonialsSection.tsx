"use client";

import { Star, Quote } from "lucide-react";

interface Testimonial {
  id: number;
  name: string;
  role: string;
  company: string;
  location: string;
  avatar: string;
  avatarColor: string;
  rating: number;
  text: string;
  product: string;
}

interface TestimonialsSectionProps {
  testimonials: Testimonial[];
}

export default function TestimonialsSection({ testimonials }: TestimonialsSectionProps) {
  return (
    <div className="columns-1 sm:columns-2 lg:columns-3 gap-5 space-y-5">
      {testimonials.map((t) => (
        <div
          key={t.id}
          className="break-inside-avoid bg-white rounded-2xl border border-gray-100 p-6 hover:border-blue-200 hover:shadow-xl hover:shadow-blue-500/8 transition-all duration-300 group"
        >
          {/* Top row: avatar + name + stars */}
          <div className="flex items-start justify-between gap-3 mb-4">
            <div className="flex items-center gap-3">
              {/* Avatar */}
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0"
                style={{ background: t.avatarColor }}
              >
                {t.avatar}
              </div>
              <div>
                <p className="font-bold text-gray-900 text-sm leading-tight">{t.name}</p>
                <p className="text-xs text-gray-500 leading-tight mt-0.5">{t.role}, {t.company}</p>
                <p className="text-xs text-gray-400 leading-tight">{t.location}</p>
              </div>
            </div>
            <Quote className="w-6 h-6 text-blue-200 group-hover:text-blue-300 transition-colors shrink-0 mt-0.5" />
          </div>

          {/* Stars */}
          <div className="flex gap-0.5 mb-3">
            {Array.from({ length: t.rating }).map((_, i) => (
              <Star key={i} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
            ))}
          </div>

          {/* Review text */}
          <p className="text-sm text-gray-600 leading-relaxed mb-4">"{t.text}"</p>

          {/* Product badge — Amber bg, Deep Blue text per brand guidelines */}
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border" style={{ backgroundColor: "#FFF8E1", borderColor: "#FFB200" }}>
            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: "#FFB200" }} />
            <span className="text-xs font-semibold" style={{ color: "#060297" }}>{t.product}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
