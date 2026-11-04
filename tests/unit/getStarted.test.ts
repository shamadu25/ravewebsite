/** @jest-environment node */
import { BUSINESS_TYPES, SOLUTIONS, resolveSolution, validateLead, type LeadValues } from "@/lib/getStarted";

describe("form options match the brief exactly", () => {
  it("business types", () => {
    expect(BUSINESS_TYPES.map((b) => b.label)).toEqual([
      "Retail / Supermarket / Wholesale", "Hospitality / Hotel", "Restaurant / Food Service", "Healthcare / Hospital / Clinic",
      "Education / School", "Legal / Professional Services", "Real Estate", "Financial Services", "Manufacturing / Distribution", "Other",
    ]);
  });
  it("solutions", () => {
    expect(SOLUTIONS.map((s) => s.label)).toEqual([
      "POS / Retail Management Software", "ERP / Business Management Software", "Hospital Management System", "Hotel Management System",
      "School Management System", "Restaurant Management System", "Legal Practice Management Software", "Custom Software Development",
      "Website Development", "Mobile App Development", "AI Agents / AI Employees", "Business Process Automation", "Other / Not Sure Yet",
    ]);
  });
});

describe("resolveSolution (query-driven preselection)", () => {
  const cases: [string, string][] = [
    ["cliqpos", "pos"], ["erp", "erp"], ["hospital-management", "hospital-management"], ["hotel-management", "hotel-management"],
    ["school-management", "school-management"], ["restaurant-management", "restaurant-management"], ["legal-practice", "legal-practice"],
    ["custom-software", "custom-software"], ["ai-automation", "ai-agents"],
  ];
  it.each(cases)("?solution=%s → %s", (q, expected) => expect(resolveSolution(q)?.value).toBe(expected));
  it("is case-insensitive and trims", () => expect(resolveSolution("  CliqPOS ")?.value).toBe("pos"));
  it("uses the first value when repeated", () => expect(resolveSolution(["erp", "pos"])?.value).toBe("erp"));
  it.each([undefined, "", "nonsense", "<script>alert(1)</script>", "__proto__", "constructor", "toString", "a".repeat(5000)])(
    "ignores unknown/hostile value %p safely", (v) => expect(resolveSolution(v as string)).toBeUndefined());
});

describe("validateLead", () => {
  const good: LeadValues = { fullName: "Ama Mensah", businessName: "Ama Ltd", phone: "+233 24 123 4567", email: "ama@company.com", businessType: "retail", solution: "pos", message: "" };
  it("accepts a complete enquiry (message optional)", () => expect(validateLead(good)).toEqual({}));
  it("requires every required field", () => {
    const e = validateLead({ fullName: "", businessName: "", phone: "", email: "", businessType: "", solution: "", message: "" });
    expect(Object.keys(e).sort()).toEqual(["businessName", "businessType", "email", "fullName", "phone", "solution"]);
  });
  it.each(["not-an-email", "a@b", "a b@c.com", "@c.com"])("rejects email %p", (email) => expect(validateLead({ ...good, email }).email).toBeTruthy());
  it.each(["abc", "123", "+233 ()", "0".repeat(20)])("rejects phone %p", (phone) => expect(validateLead({ ...good, phone }).phone).toBeTruthy());
  it.each(["0244123456", "+233 24 123 4567", "(024) 412-3456", "+44 20 7946 0958"])("accepts phone %p", (phone) => expect(validateLead({ ...good, phone }).phone).toBeUndefined());
  it("rejects values outside the option lists", () => {
    expect(validateLead({ ...good, solution: "hacked" }).solution).toBeTruthy();
    expect(validateLead({ ...good, businessType: "hacked" }).businessType).toBeTruthy();
  });
  it("limits the message length", () => expect(validateLead({ ...good, message: "x".repeat(2001) }).message).toBeTruthy());
});
