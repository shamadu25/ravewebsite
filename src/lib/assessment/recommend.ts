import { AssessmentAnswers, AssessmentRecommendation, Complexity } from "./types";

const PROBLEM_LABELS: Record<AssessmentAnswers["mainProblem"], string> = {
  slow_response: "Inquiries wait too long for a first reply, which loses winnable customers.",
  poor_followup: "Leads go cold because follow-up depends on staff remembering to do it.",
  repetitive_support: "Staff time is consumed answering the same support questions repeatedly.",
  lead_qualification: "Inbound leads aren't consistently qualified before reaching your sales team.",
  missed_bookings: "Appointments and bookings are missed or mismanaged.",
  payment_collection: "Outstanding payments aren't followed up consistently.",
  repetitive_internal: "Repetitive internal admin work is consuming staff time.",
  other: "Repetitive, high-volume work is taking time away from higher-value tasks.",
};

function agentForProblem(answers: AssessmentAnswers): string {
  const { mainProblem, inquiryChannel } = answers;

  if (
    (mainProblem === "slow_response" || mainProblem === "poor_followup" || mainProblem === "lead_qualification") &&
    inquiryChannel === "whatsapp"
  ) {
    return "AI WhatsApp Employee";
  }

  switch (mainProblem) {
    case "slow_response":
    case "poor_followup":
    case "lead_qualification":
      return "AI Sales Employee";
    case "repetitive_support":
      return "AI Customer Support Employee";
    case "missed_bookings":
      return "AI Appointment & Booking Employee";
    case "payment_collection":
      return "AI Receivables Employee";
    case "repetitive_internal":
      return "AI Operations Employee";
    default:
      return "AI Sales Employee";
  }
}

function firstWorkflowFor(agentName: string): string {
  const workflows: Record<string, string> = {
    "AI WhatsApp Employee": "Instant WhatsApp replies to new inquiries, with automatic qualification and follow-up.",
    "AI Sales Employee": "Instant reply to new inquiries, qualification, and automatic follow-up on unqualified leads.",
    "AI Customer Support Employee": "Answering your most frequently asked support questions with an escalation path to your team.",
    "AI Appointment & Booking Employee": "Checking requirements and booking appointments, with automatic reminders.",
    "AI Receivables Employee": "Sending scheduled, professional payment reminders for overdue accounts.",
    "AI Operations Employee": "Automating one clearly-defined repetitive internal workflow first.",
  };
  return workflows[agentName] ?? "A single, clearly-scoped workflow, expanded once it's proven.";
}

function channelsFor(inquiryChannel: AssessmentAnswers["inquiryChannel"]): string[] {
  switch (inquiryChannel) {
    case "whatsapp":
      return ["WhatsApp"];
    case "social":
      return ["Instagram/Facebook", "Website chat"];
    case "website":
      return ["Website chat"];
    case "email":
      return ["Email"];
    case "phone":
      return ["Website chat", "WhatsApp"];
    case "multiple":
      return ["WhatsApp", "Website chat", "Email"];
    default:
      return ["Website chat"];
  }
}

function complexityFor(answers: AssessmentAnswers): Complexity {
  const { inquiryChannel, inquiryVolume } = answers;

  if (inquiryChannel === "multiple" || inquiryVolume === "gt_500") {
    return "Advanced";
  }
  if (inquiryVolume === "101_500" || inquiryVolume === "not_sure") {
    return "Moderate";
  }
  return "Simple";
}

function nextStepFor(complexity: Complexity): string {
  if (complexity === "Advanced") {
    return "Book a free AI strategy call so we can scope the integrations and channels involved.";
  }
  if (complexity === "Moderate") {
    return "Book a free AI strategy call to confirm scope, or start the conversation on WhatsApp.";
  }
  return "Start with this single workflow — book a free AI strategy call to confirm timeline and next steps.";
}

export function computeRecommendation(answers: AssessmentAnswers): AssessmentRecommendation {
  const agentName = agentForProblem(answers);
  const complexity = complexityFor(answers);

  return {
    agentName,
    problemSolved: PROBLEM_LABELS[answers.mainProblem],
    firstWorkflow: firstWorkflowFor(agentName),
    recommendedChannels: channelsFor(answers.inquiryChannel),
    humanHandoff: "Yes — conversations that need judgment or are sensitive are handed to your team, with the full history.",
    nextStep: nextStepFor(complexity),
    complexity,
  };
}
