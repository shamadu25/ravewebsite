/** @jest-environment node */
import { buildQuestionSet, INDUSTRY_SEEDS } from "@/lib/ai-automation/catalogue";
import { cleanText, firstInvalidStage, validateAnswers, validateStage } from "@/lib/ai-automation/validation";

const re = INDUSTRY_SEEDS.find((i) => i.slug === "real-estate")!;
const Q = buildQuestionSet(re.questions);

const valid = () => ({
  businessName: "Acme Properties", industry: "real-estate", country: "Ghana", city: "Accra", website: "acme.com", employees: "6_20", branches: "1", businessAge: "4_10_years", description: "We sell homes in Accra.",
  re_portfolio: "11_50", re_enquiries: "50_200", re_channels: ["whatsapp", "phone_calls"], re_reps: "4_10", re_enquiry_handling: "whatsapp_chats_only", re_bottleneck: "responding_fast_enough",
  departments: ["sales"], productsServices: "Apartments", commChannels: ["whatsapp"], challenges: ["LOST_SALES"], automationAreas: ["AI_WHATSAPP"],
  outcomes: "More viewings", improvements: ["more_sales"], urgency: "immediately", timeline: "1_3_months",
  fullName: "Ama Mensah", position: "Director", email: "Ama@Acme.com", phone: "+233 24 000 0000", preferredChannel: "whatsapp", consentProcessing: true,
});

describe("assessment validation", () => {
  it("accepts a complete valid submission and normalises it", () => {
    const r = validateAnswers(Q, valid());
    expect(r.errors).toEqual({});
    expect(r.ok).toBe(true);
    expect(r.answers.email).toBe("ama@acme.com");
    expect(r.answers.website).toBe("https://acme.com/");
  });
  it("reports required fields with clear messages", () => {
    const r = validateAnswers(Q, { ...valid(), businessName: "", challenges: [], consentProcessing: false });
    expect(r.ok).toBe(false);
    expect(r.errors.businessName).toBe("This field is required.");
    expect(r.errors.challenges).toBe("This field is required.");
    expect(r.errors.consentProcessing).toBe("This is required to continue.");
  });
  it("rejects options that are not configured", () => {
    const r = validateAnswers(Q, { ...valid(), re_reps: "999", re_channels: ["telepathy"] });
    expect(r.errors.re_reps).toMatch(/listed options/);
    expect(r.errors.re_channels).toMatch(/listed options/);
  });
  it("validates email, phone and website formats", () => {
    const r = validateAnswers(Q, { ...valid(), email: "not-an-email", phone: "abc", website: "javascript:alert(1)" });
    expect(r.errors.email).toBeTruthy(); expect(r.errors.phone).toBeTruthy(); expect(r.errors.website).toBeTruthy();
  });
  it("does not require conditional questions that are hidden, and requires none it cannot see", () => {
    const base = valid();
    const hidden = validateAnswers(Q, base);
    expect(hidden.ok).toBe(true);
    expect("challengeOther" in hidden.answers).toBe(false);
    const shown = validateAnswers(Q, { ...base, challenges: ["OTHER"], challengeOther: "Seasonal staff" });
    expect(shown.answers.challengeOther).toBe("Seasonal staff");
  });
  it("drops answers to hidden questions and unknown keys (no smuggling)", () => {
    const r = validateAnswers(Q, { ...valid(), challengeOther: "should be dropped", hacker: "x", priceOverride: 1 });
    expect("challengeOther" in r.answers).toBe(false);
    expect("hacker" in r.answers).toBe(false);
    expect("priceOverride" in r.answers).toBe(false);
  });
  it("sanitises markup and control characters and enforces length", () => {
    expect(cleanText("<script>alert(1)</script>Hello\u0000 <b>world</b>")).toBe("alert(1)Hello world");
    const r = validateAnswers(Q, { ...valid(), description: "x".repeat(5000) });
    expect(r.errors.description).toMatch(/under/);
  });
  it("jumps back to the first stage with an error", () => {
    const r = validateAnswers(Q, { ...valid(), email: "bad", businessName: "" });
    expect(firstInvalidStage(Q, r.errors)).toBe(1);
  });
  it("validates one stage at a time for the Next button", () => {
    const partial = { businessName: "A", industry: "real-estate" };
    expect(validateStage(Q, 1, partial).ok).toBe(false);
    expect(validateStage(Q, 1, valid()).ok).toBe(true);
    expect(Object.keys(validateStage(Q, 3, {}).errors)).toEqual(["challenges"]);
  });
  it("treats non-object payloads as empty", () => {
    expect(validateAnswers(Q, null).ok).toBe(false);
    expect(validateAnswers(Q, [1, 2]).ok).toBe(false);
  });
});
