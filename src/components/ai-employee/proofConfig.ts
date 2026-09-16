export interface ProofItem {
  customerLogo?: string;
  customerName: string;
  personName: string;
  personRole: string;
  problem: string;
  agentDeployed: string;
  verifiedResult: string;
  testimonial: string;
  screenshotOrVideo?: string;
  caseStudyHref?: string;
}

/**
 * No AI Employee case studies have been verified/approved yet. Per instruction,
 * do not fabricate testimonials or logos — this stays empty until real, approved
 * content is supplied, and the whole proof section hides itself when empty.
 */
export const PROOF_ITEMS: ProofItem[] = [];
