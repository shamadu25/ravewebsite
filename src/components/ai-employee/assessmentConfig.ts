import {
  BusinessType,
  InquiryChannel,
  InquiryVolume,
  MainProblem,
  ResponseSpeed,
} from "@/lib/assessment/types";

export interface ChoiceOption<T extends string> {
  value: T;
  label: string;
}

export const BUSINESS_TYPE_OPTIONS: ChoiceOption<BusinessType>[] = [
  { value: "retail_ecommerce", label: "Retail or ecommerce" },
  { value: "professional_services", label: "Professional services" },
  { value: "hotel_hospitality", label: "Hotel or hospitality" },
  { value: "restaurant", label: "Restaurant" },
  { value: "healthcare", label: "Healthcare" },
  { value: "education", label: "Education" },
  { value: "real_estate", label: "Real estate" },
  { value: "financial_services", label: "Financial services" },
  { value: "logistics", label: "Logistics" },
  { value: "other", label: "Other" },
];

export const MAIN_PROBLEM_OPTIONS: ChoiceOption<MainProblem>[] = [
  { value: "slow_response", label: "Slow response to inquiries" },
  { value: "poor_followup", label: "Poor or inconsistent follow-up" },
  { value: "repetitive_support", label: "Too many repetitive support questions" },
  { value: "lead_qualification", label: "Difficulty qualifying leads" },
  { value: "missed_bookings", label: "Missed bookings or appointments" },
  { value: "payment_collection", label: "Outstanding payment collection" },
  { value: "repetitive_internal", label: "Repetitive internal work" },
  { value: "other", label: "Other" },
];

export const INQUIRY_CHANNEL_OPTIONS: ChoiceOption<InquiryChannel>[] = [
  { value: "whatsapp", label: "WhatsApp" },
  { value: "social", label: "Instagram or Facebook" },
  { value: "website", label: "Website" },
  { value: "email", label: "Email" },
  { value: "phone", label: "Phone calls" },
  { value: "multiple", label: "Multiple channels" },
];

export const INQUIRY_VOLUME_OPTIONS: ChoiceOption<InquiryVolume>[] = [
  { value: "lt_20", label: "Fewer than 20 per month" },
  { value: "20_100", label: "20–100 per month" },
  { value: "101_500", label: "101–500 per month" },
  { value: "gt_500", label: "More than 500 per month" },
  { value: "not_sure", label: "Not sure" },
];

export const RESPONSE_SPEED_OPTIONS: ChoiceOption<ResponseSpeed>[] = [
  { value: "within_5min", label: "Within 5 minutes" },
  { value: "within_1hr", label: "Within 1 hour" },
  { value: "same_day", label: "Within the same day" },
  { value: "after_24h", label: "After 24 hours" },
  { value: "varies", label: "It varies considerably" },
];

export const COUNTRIES: { name: string; dialCode: string }[] = [
  { name: "Ghana", dialCode: "+233" },
  { name: "Nigeria", dialCode: "+234" },
  { name: "Kenya", dialCode: "+254" },
  { name: "South Africa", dialCode: "+27" },
  { name: "Ivory Coast", dialCode: "+225" },
  { name: "Senegal", dialCode: "+221" },
  { name: "Tanzania", dialCode: "+255" },
  { name: "Uganda", dialCode: "+256" },
  { name: "Ethiopia", dialCode: "+251" },
  { name: "Rwanda", dialCode: "+250" },
  { name: "Cameroon", dialCode: "+237" },
  { name: "United Kingdom", dialCode: "+44" },
  { name: "United States", dialCode: "+1" },
  { name: "Other", dialCode: "+" },
];
