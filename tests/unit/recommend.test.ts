import { computeRecommendation } from "@/lib/assessment/recommend";
import { AssessmentAnswers } from "@/lib/assessment/types";

function answers(overrides: Partial<AssessmentAnswers> = {}): AssessmentAnswers {
  return {
    businessType: "retail_ecommerce",
    mainProblem: "slow_response",
    inquiryChannel: "website",
    inquiryVolume: "20_100",
    responseSpeed: "after_24h",
    successCriteria: "",
    ...overrides,
  };
}

describe("computeRecommendation", () => {
  it("recommends the AI WhatsApp Employee when the problem is response-related and the channel is WhatsApp", () => {
    const rec = computeRecommendation(answers({ mainProblem: "slow_response", inquiryChannel: "whatsapp" }));
    expect(rec.agentName).toBe("AI WhatsApp Employee");
  });

  it("recommends the AI Sales Employee for slow response on a non-WhatsApp channel", () => {
    const rec = computeRecommendation(answers({ mainProblem: "slow_response", inquiryChannel: "website" }));
    expect(rec.agentName).toBe("AI Sales Employee");
  });

  it("recommends the AI Customer Support Employee for repetitive support questions", () => {
    const rec = computeRecommendation(answers({ mainProblem: "repetitive_support" }));
    expect(rec.agentName).toBe("AI Customer Support Employee");
  });

  it("recommends the AI Appointment & Booking Employee for missed bookings", () => {
    const rec = computeRecommendation(answers({ mainProblem: "missed_bookings" }));
    expect(rec.agentName).toBe("AI Appointment & Booking Employee");
  });

  it("recommends the AI Receivables Employee for payment collection", () => {
    const rec = computeRecommendation(answers({ mainProblem: "payment_collection" }));
    expect(rec.agentName).toBe("AI Receivables Employee");
  });

  it("recommends the AI Operations Employee for repetitive internal work", () => {
    const rec = computeRecommendation(answers({ mainProblem: "repetitive_internal" }));
    expect(rec.agentName).toBe("AI Operations Employee");
  });

  it("marks complexity Advanced for multi-channel or high volume", () => {
    expect(computeRecommendation(answers({ inquiryChannel: "multiple" })).complexity).toBe("Advanced");
    expect(computeRecommendation(answers({ inquiryVolume: "gt_500" })).complexity).toBe("Advanced");
  });

  it("marks complexity Simple for a single channel and low volume", () => {
    expect(computeRecommendation(answers({ inquiryChannel: "website", inquiryVolume: "lt_20" })).complexity).toBe(
      "Simple"
    );
  });

  it("always states a human handoff requirement, never full replacement", () => {
    const rec = computeRecommendation(answers());
    expect(rec.humanHandoff.toLowerCase()).toContain("your team");
  });

  it("falls back to AI Sales Employee for an unmapped 'other' problem", () => {
    const rec = computeRecommendation(answers({ mainProblem: "other" }));
    expect(rec.agentName).toBe("AI Sales Employee");
  });
});
