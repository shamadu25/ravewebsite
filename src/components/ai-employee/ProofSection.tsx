import Link from "next/link";
import Image from "next/image";
import SectionHeader from "@/components/ui/SectionHeader";
import { PROOF_ITEMS } from "./proofConfig";

/** Renders nothing at all when there's no approved proof — never shows
 * placeholder testimonials or fabricated results. */
export default function ProofSection() {
  if (PROOF_ITEMS.length === 0) return null;

  return (
    <section className="bg-white section-padding">
      <div className="max-w-[1100px] mx-auto px-5 sm:px-8 lg:px-10">
        <SectionHeader eyebrow="Verified Results" title="Real businesses, real AI Employees" className="mb-10" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {PROOF_ITEMS.map((item) => (
            <div key={item.customerName} className="p-6 rounded-2xl border border-gray-200 bg-[#F5F7FA]">
              {item.customerLogo && (
                <Image src={item.customerLogo} alt={item.customerName} width={120} height={40} className="h-8 w-auto mb-4" />
              )}
              <p className="text-gray-800 text-sm leading-relaxed mb-4">&ldquo;{item.testimonial}&rdquo;</p>
              <p className="text-sm font-semibold text-gray-900">{item.personName}</p>
              <p className="text-xs text-gray-500 mb-3">
                {item.personRole}, {item.customerName}
              </p>
              <p className="text-xs text-gray-600 mb-1">
                <span className="font-medium">Problem:</span> {item.problem}
              </p>
              <p className="text-xs text-gray-600 mb-1">
                <span className="font-medium">Deployed:</span> {item.agentDeployed}
              </p>
              <p className="text-xs text-gray-600 mb-3">
                <span className="font-medium">Result:</span> {item.verifiedResult}
              </p>
              {item.caseStudyHref && (
                <Link href={item.caseStudyHref} className="text-sm font-semibold text-blue-600 hover:underline">
                  Read the full case study →
                </Link>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
