import type { Complexity, SolutionSeed } from "../types";

/**
 * Reusable AI solution definitions. NOTE: there are deliberately NO prices, hours or delivery estimates here.
 * Those are commercial decisions that must be entered and approved by RaveSoft in Admin → Solutions / Pricing.
 * Until then, any quote that includes the solution is flagged MANUAL_REVIEW (see pricing.ts).
 */

const ALL: Complexity[] = ["LOW", "MEDIUM", "HIGH"];

function sol(
  key: string,
  name: string,
  description: string,
  o: {
    problems: string[];
    caps: string[];
    integrations?: string[];
    deps?: string[];
    areas: string[];
    challenges: string[];
    industries: Record<string, number>;
    complexity?: Complexity;
    extraDeliverables?: string[];
  }
): SolutionSeed {
  return {
    key,
    name,
    description,
    problemsSolved: o.problems,
    capabilities: o.caps,
    deliverables: [
      "Agent configuration, prompts and guardrails agreed with your team",
      "Workflow set-up and integration with the systems listed",
      "Testing with realistic scenarios before go-live",
      "Staff training and handover documentation",
      ...(o.extraDeliverables ?? []),
    ],
    integrations: o.integrations ?? [],
    dependencies: o.deps ?? ["Named business owner for approvals", "Access to the systems to be integrated", "Business content: FAQs, policies, price lists as relevant"],
    complexityLevels: ALL,
    defaultComplexity: o.complexity ?? "MEDIUM",
    areas: o.areas,
    challenges: o.challenges,
    industries: o.industries,
  };
}

export const SOLUTION_SEEDS: SolutionSeed[] = [
  // ───────────── Shared across industries ─────────────
  sol("ai-lead-qualification-agent", "AI Lead Qualification Agent", "Asks the right screening questions on WhatsApp, web chat or email, scores each enquiry against criteria you set, and routes qualified leads to the right person.", {
    problems: ["Unqualified prospects waste sales time", "Enquiries are handled inconsistently"],
    caps: ["Conversational screening against your qualification criteria", "Lead scoring with a visible reason", "Hand-off to a human with the full conversation attached", "Writes lead records to your CRM"],
    integrations: ["crm", "whatsapp-business", "email"],
    areas: ["AI_SALES", "AI_LEADGEN", "AI_WHATSAPP"], challenges: ["LOST_SALES", "POOR_FOLLOWUP", "MANUAL_WORK"],
    industries: { "real-estate": 20, "professional-services": 20, other: 30, manufacturing: 30 },
  }),
  sol("ai-whatsapp-agent", "AI WhatsApp Agent", "Answers customer messages on the WhatsApp Business Platform around the clock using your approved information, and escalates to your team when it should.", {
    problems: ["Slow WhatsApp replies", "Staff tied up answering repeat questions"],
    caps: ["Instant replies from approved business knowledge", "Handles repeat questions and collects details", "Escalates to a human when confidence is low or the customer asks", "Conversation history visible to your team"],
    integrations: ["whatsapp-business", "crm"],
    deps: ["WhatsApp Business Platform account and approved number", "Message templates approved by WhatsApp where required", "Business content: FAQs, policies, price lists as relevant"],
    areas: ["AI_WHATSAPP", "AI_SUPPORT", "AI_SALES"], challenges: ["SLOW_RESPONSES", "CUSTOMER_SERVICE", "LOST_SALES"],
    industries: { "real-estate": 30, other: 10, manufacturing: 20 },
  }),
  sol("ai-administrative-assistant", "AI Administrative Assistant", "Takes over repetitive back-office tasks: data entry, document filing, internal reminders and routine requests.", {
    problems: ["Staff time lost to repetitive admin", "Tasks fall through the cracks"],
    caps: ["Drafts and files routine documents", "Creates and tracks internal tasks and reminders", "Pulls information together for staff on request", "Keeps a log of every action it takes"],
    integrations: ["email", "document-storage"],
    areas: ["AI_OPERATIONS", "AI_HR"], challenges: ["MANUAL_WORK", "INEFFICIENCY", "STAFF_MANAGEMENT"],
    industries: { healthcare: 40, "professional-services": 60, education: 50, other: 20, manufacturing: 10 },
  }),
  sol("ai-reporting-agent", "AI Reporting Agent", "Collects data from your systems on a schedule and produces plain-language management reports for owners and managers.", {
    problems: ["Reports are late, manual or missing", "Owners lack visibility into performance"],
    caps: ["Scheduled daily / weekly / monthly summaries", "Highlights changes and exceptions for follow-up", "Answers questions about the data in plain language", "Delivers by email or WhatsApp to named recipients"],
    integrations: ["analytics-bi", "accounting", "crm"],
    areas: ["AI_BI", "AI_FINANCE", "AI_OPERATIONS"], challenges: ["POOR_REPORTING", "INEFFICIENCY"],
    industries: { logistics: 60, "financial-services": 50, "professional-services": 70, education: 60, other: 40, manufacturing: 40 },
  }),
  sol("ai-reporting-assistant", "AI Reporting Assistant", "Turns daily operational and sales data into short reports and answers managers' questions about performance.", {
    problems: ["Managers cannot see branch performance quickly", "Manual spreadsheet reporting"],
    caps: ["Scheduled sales and stock summaries", "Highlights unusual activity for review", "Plain-language answers about the numbers", "Delivered by email or WhatsApp"],
    integrations: ["pos-erp", "analytics-bi"],
    areas: ["AI_BI", "AI_OPERATIONS", "AI_FINANCE"], challenges: ["POOR_REPORTING", "INEFFICIENCY"],
    industries: { healthcare: 60, retail: 70 },
  }),
  sol("ai-document-processing-agent", "AI Document Processing Agent", "Reads incoming documents (forms, invoices, delivery notes, referrals), extracts the fields you need and routes them for review or entry.", {
    problems: ["Manual document data entry", "Errors and delays from re-typing information"],
    caps: ["Extracts defined fields from documents", "Flags missing or inconsistent information for human review", "Routes documents to the right queue or system", "Keeps an audit trail of what was extracted and by whom it was approved"],
    integrations: ["document-storage", "email"],
    deps: ["Representative sample documents", "Defined fields and review rules", "Named reviewer for exceptions"],
    complexity: "HIGH",
    areas: ["AI_OPERATIONS", "AI_FINANCE"], challenges: ["MANUAL_WORK", "INEFFICIENCY"],
    industries: { healthcare: 70, logistics: 70, "financial-services": 20, other: 50, manufacturing: 50 },
  }),
  sol("ai-customer-support-agent", "AI Customer Support Agent", "Handles first-line customer questions across web chat and messaging from approved knowledge, and hands complex cases to your team.", {
    problems: ["Customers wait too long for answers", "Support staff spend time on repeat questions"],
    caps: ["Answers from your approved knowledge base only", "Collects case details before escalation", "Escalates sensitive or unclear cases to staff", "Reports on common questions so content can improve"],
    integrations: ["website-chat", "whatsapp-business", "crm"],
    areas: ["AI_SUPPORT", "AI_WHATSAPP"], challenges: ["SLOW_RESPONSES", "CUSTOMER_SERVICE"],
    industries: { retail: 20, "financial-services": 30, other: 15, manufacturing: 25 },
  }),
  sol("ai-marketing-agent", "AI Marketing Agent", "Drafts campaign copy, schedules follow-up messages and segments customers using your own customer data, with human approval before anything is sent.", {
    problems: ["Inconsistent marketing activity", "No time to follow up with past customers"],
    caps: ["Drafts campaign and social copy in your voice for approval", "Segments customers from your records", "Schedules approved messages", "Summarises campaign responses"],
    integrations: ["email", "whatsapp-business", "crm"],
    areas: ["AI_MARKETING", "AI_LEADGEN"], challenges: ["LOST_SALES", "POOR_FOLLOWUP"],
    industries: { retail: 50, hospitality: 60, other: 35 },
  }),
  sol("ai-workflow-assistant", "AI Workflow Assistant", "Moves work between steps and people: reminders, approvals, status updates and hand-offs, following rules your team defines.", {
    problems: ["Work stalls between steps", "No clear status on in-flight requests"],
    caps: ["Rule-based routing and approvals", "Automatic reminders and escalations", "Status updates to staff or customers", "Full activity history"],
    integrations: ["email", "crm"],
    areas: ["AI_OPERATIONS", "AI_CUSTOM"], challenges: ["INEFFICIENCY", "MANUAL_WORK", "STAFF_MANAGEMENT"],
    industries: { "financial-services": 40, other: 25, manufacturing: 15 },
  }),
  sol("ai-custom-solution", "Custom AI Solution", "A bespoke AI agent or workflow scoped with you for needs that are not covered by a standard solution.", {
    problems: ["A process specific to your business that standard tools do not cover"],
    caps: ["Discovery workshop to define scope", "Custom agent and workflow design", "Integration to the systems involved"],
    integrations: ["custom-api"],
    deps: ["Workshop with process owners", "Written scope approved by both parties"],
    complexity: "HIGH",
    areas: ["AI_CUSTOM", "NOT_SURE"], challenges: ["OTHER"],
    industries: { other: 90, manufacturing: 90 },
  }),

  // ───────────── Real estate ─────────────
  sol("ai-property-sales-agent", "AI Property Sales Agent", "Engages buyers and renters on WhatsApp and web chat: answers questions about listings, shares details and moves serious prospects toward a viewing.", {
    problems: ["Lost enquiries", "Slow responses to property enquiries"],
    caps: ["Answers listing questions from your property data", "Shares photos, brochures and pricing you have approved", "Captures budget, location and timeline preferences", "Books a viewing or hands over to a sales representative"],
    integrations: ["whatsapp-business", "crm", "website-chat"],
    areas: ["AI_SALES", "AI_WHATSAPP", "AI_LEADGEN"], challenges: ["LOST_SALES", "SLOW_RESPONSES"],
    industries: { "real-estate": 10 },
  }),
  sol("ai-property-viewing-scheduler", "AI Property Viewing Scheduler", "Coordinates viewing appointments between prospects and sales representatives, including reminders and rescheduling.", {
    problems: ["Poor viewing appointment coordination", "No-shows and double bookings"],
    caps: ["Offers available slots from agents' calendars", "Confirms and reminds both parties", "Handles rescheduling requests", "Updates the CRM after each viewing"],
    integrations: ["calendar-scheduling", "whatsapp-business", "crm"],
    areas: ["AI_BOOKING", "AI_WHATSAPP"], challenges: ["SCHEDULING", "MANUAL_WORK"],
    industries: { "real-estate": 40 },
  }),
  sol("ai-lead-recovery-agent", "AI Lead Recovery Agent", "Re-engages enquiries that went quiet with relevant, approved follow-up messages and flags the ones worth a call.", {
    problems: ["Inconsistent lead follow-up", "Old enquiries never revisited"],
    caps: ["Identifies stalled leads from your records", "Sends approved follow-up sequences with opt-out respected", "Detects renewed interest and alerts a salesperson", "Reports recovery activity"],
    integrations: ["crm", "whatsapp-business", "email"],
    areas: ["AI_SALES", "AI_LEADGEN", "AI_MARKETING"], challenges: ["POOR_FOLLOWUP", "LOST_SALES"],
    industries: { "real-estate": 50 },
  }),
  sol("ai-property-marketing-agent", "AI Property Marketing Agent", "Drafts listing descriptions, social posts and broadcast messages from your property data for your approval.", {
    problems: ["Listings take too long to market", "Inconsistent promotion of properties"],
    caps: ["Drafts listing copy from structured property details", "Prepares social and broadcast content for approval", "Keeps a content calendar", "Summarises responses by listing"],
    integrations: ["email", "whatsapp-business", "crm"],
    areas: ["AI_MARKETING"], challenges: ["LOST_SALES", "MANUAL_WORK"],
    industries: { "real-estate": 60 },
  }),
  sol("ai-crm-assistant", "AI CRM Assistant", "Keeps your CRM accurate: logs conversations, updates stages, creates follow-up tasks and reminds staff what is due.", {
    problems: ["Poor visibility of sales activity", "CRM data entered late or not at all"],
    caps: ["Logs calls, chats and emails against the right record", "Suggests and creates next-step tasks", "Reminds representatives of overdue follow-ups", "Flags duplicate or incomplete records"],
    integrations: ["crm", "email", "whatsapp-business"],
    areas: ["AI_SALES", "AI_OPERATIONS"], challenges: ["POOR_FOLLOWUP", "STAFF_MANAGEMENT", "MANUAL_WORK"],
    industries: { "real-estate": 45 },
  }),
  sol("ai-sales-analytics-agent", "AI Sales Analytics Agent", "Summarises pipeline and representative performance so managers can see where enquiries convert and where they stall.", {
    problems: ["Difficulty managing sales representatives", "Poor visibility into sales performance"],
    caps: ["Response-time and follow-up reporting by representative", "Pipeline stage and source breakdowns", "Plain-language answers to manager questions", "Scheduled management summaries"],
    integrations: ["crm", "analytics-bi"],
    areas: ["AI_BI", "AI_SALES"], challenges: ["POOR_REPORTING", "STAFF_MANAGEMENT"],
    industries: { "real-estate": 70 },
  }),

  // ───────────── Healthcare ─────────────
  sol("ai-patient-enquiry-agent", "AI Patient Enquiry Agent", "Answers general, non-clinical enquiries (services, opening hours, locations, how to book) and directs patients to the right team.", {
    problems: ["Reception overloaded with repeat enquiries", "Patients wait for basic information"],
    caps: ["Answers from information your facility approves", "Does not give medical advice or interpret results", "Escalates clinical or urgent matters to staff with clear emergency guidance", "Minimises personal data collected in chat"],
    integrations: ["whatsapp-business", "website-chat"],
    deps: ["Approved facility information", "Clinical escalation rules signed off by your facility", "Data-protection review before go-live"],
    areas: ["AI_SUPPORT", "AI_WHATSAPP"], challenges: ["SLOW_RESPONSES", "CUSTOMER_SERVICE"],
    industries: { healthcare: 10 },
  }),
  sol("ai-appointment-booking-agent", "AI Appointment Booking Agent", "Lets patients request, confirm and reschedule appointments through chat, using your real availability.", {
    problems: ["Phone-based booking overload", "Missed appointments and double bookings"],
    caps: ["Offers real availability by service and clinician", "Confirms, reschedules and cancels", "Sends reminders", "Writes bookings to your scheduling system"],
    integrations: ["calendar-scheduling", "hms-ehr", "whatsapp-business"],
    areas: ["AI_BOOKING", "AI_WHATSAPP"], challenges: ["SCHEDULING", "MANUAL_WORK"],
    industries: { healthcare: 20 },
  }),
  sol("ai-patient-communication-agent", "AI Patient Communication Agent", "Sends approved administrative messages: appointment details, preparation instructions and facility notices.", {
    problems: ["Patients not informed or prepared", "Staff manually sending notices"],
    caps: ["Templated, staff-approved messages only", "Respects patient communication preferences and opt-outs", "Delivery status visible to staff", "No clinical content generated by AI"],
    integrations: ["whatsapp-business", "sms", "hms-ehr"],
    areas: ["AI_WHATSAPP", "AI_SUPPORT"], challenges: ["CUSTOMER_SERVICE", "MANUAL_WORK"],
    industries: { healthcare: 30 },
  }),
  sol("ai-patient-followup-agent", "AI Follow-up Agent", "Sends appointment reminders and routine follow-up prompts on schedules your clinical and admin teams define.", {
    problems: ["Reminders handled manually or not at all", "Follow-ups missed"],
    caps: ["Schedules reminders from appointment data", "Collects simple confirmations", "Flags non-responses to staff", "Never provides clinical advice"],
    integrations: ["whatsapp-business", "sms", "hms-ehr"],
    areas: ["AI_BOOKING", "AI_SUPPORT"], challenges: ["POOR_FOLLOWUP", "SCHEDULING"],
    industries: { healthcare: 50 },
  }),

  // ───────────── Hospitality ─────────────
  sol("ai-reservation-agent", "AI Reservation Agent", "Handles booking enquiries and reservations across chat channels using live availability and your rate rules.", {
    problems: ["Missed booking enquiries out of hours", "Staff tied to the front desk phone"],
    caps: ["Checks availability and quotes approved rates", "Captures guest and stay details", "Creates the reservation or hands to staff for confirmation", "Handles modification requests within your policy"],
    integrations: ["pms", "booking-platforms", "whatsapp-business", "payment-gateway"],
    areas: ["AI_BOOKING", "AI_SALES", "AI_WHATSAPP"], challenges: ["LOST_SALES", "SLOW_RESPONSES", "SCHEDULING"],
    industries: { hospitality: 10 },
  }),
  sol("ai-guest-support-agent", "AI Guest Support Agent", "Answers guest questions before and during the stay and routes requests to the right department.", {
    problems: ["Guest requests handled inconsistently", "Front desk overloaded"],
    caps: ["Answers from your hotel information", "Logs and routes requests to housekeeping, maintenance or reception", "Escalates complaints to a manager", "Multi-channel guest messaging"],
    integrations: ["whatsapp-business", "pms", "website-chat"],
    areas: ["AI_SUPPORT", "AI_WHATSAPP"], challenges: ["CUSTOMER_SERVICE", "SLOW_RESPONSES"],
    industries: { hospitality: 20 },
  }),
  sol("ai-booking-followup-agent", "AI Booking Follow-up Agent", "Follows up on enquiries and pending bookings, and handles cancellation and reconfirmation workflows.", {
    problems: ["Enquiries that never convert to bookings", "Late cancellations discovered too late"],
    caps: ["Follows up unconfirmed enquiries", "Reconfirmation requests before arrival", "Cancellation handling per your policy", "Alerts staff to rooms that may free up"],
    integrations: ["pms", "whatsapp-business", "email"],
    areas: ["AI_SALES", "AI_BOOKING"], challenges: ["POOR_FOLLOWUP", "LOST_SALES", "SCHEDULING"],
    industries: { hospitality: 30 },
  }),
  sol("ai-checkin-assistant", "AI Check-in Assistant", "Collects arrival details and documents ahead of time so check-in at the desk is faster.", {
    problems: ["Slow check-in queues", "Details gathered manually at arrival"],
    caps: ["Pre-arrival information requests", "Arrival time and special-request capture", "Passes verified details to the front desk", "Respects data-protection and ID-handling rules you set"],
    integrations: ["pms", "whatsapp-business"],
    areas: ["AI_OPERATIONS", "AI_SUPPORT"], challenges: ["MANUAL_WORK", "INEFFICIENCY"],
    industries: { hospitality: 40 },
  }),
  sol("ai-guest-experience-agent", "AI Guest Experience Agent", "Shares local recommendations, hotel services and mid-stay check-ins, and collects feedback.", {
    problems: ["Guests unaware of services", "Feedback collected late or not at all"],
    caps: ["Service and local-information answers from approved content", "Mid-stay check-in messages", "Feedback collection with alerts for negative responses", "Upsell prompts you approve"],
    integrations: ["whatsapp-business", "pms"],
    areas: ["AI_SUPPORT", "AI_MARKETING"], challenges: ["CUSTOMER_SERVICE"],
    industries: { hospitality: 50 },
  }),
  sol("ai-operations-reporting-agent", "AI Operations Reporting Agent", "Produces daily operations summaries from your PMS and booking data for managers.", {
    problems: ["Managers compile reports by hand", "Slow awareness of occupancy and issues"],
    caps: ["Daily arrivals, departures and occupancy digest", "Booking-source breakdown", "Open guest-request summary", "Delivered by email or WhatsApp"],
    integrations: ["pms", "analytics-bi"],
    areas: ["AI_BI", "AI_OPERATIONS"], challenges: ["POOR_REPORTING", "INEFFICIENCY"],
    industries: { hospitality: 70 },
  }),

  // ───────────── Retail ─────────────
  sol("ai-sales-agent", "AI Sales Agent", "Helps shoppers find products, answers pricing and availability questions and moves buyers toward an order.", {
    problems: ["Shoppers leave without buying", "Staff cannot answer every enquiry quickly"],
    caps: ["Product and price answers from your catalogue", "Order capture or hand-off to staff", "Follows up abandoned enquiries", "Respects stock data when connected"],
    integrations: ["pos-erp", "whatsapp-business", "website-chat"],
    areas: ["AI_SALES", "AI_WHATSAPP"], challenges: ["LOST_SALES", "SLOW_RESPONSES"],
    industries: { retail: 10 },
  }),
  sol("ai-whatsapp-commerce-agent", "AI WhatsApp Commerce Agent", "Runs the conversation-to-order flow on WhatsApp: browse, ask, order and pay.", {
    problems: ["Orders managed by hand in chat threads", "Missed orders from slow replies"],
    caps: ["Catalogue browsing and Q&A in chat", "Order summaries for confirmation", "Payment link hand-off where a gateway is connected", "Order records passed to your POS or sheet"],
    integrations: ["whatsapp-business", "pos-erp", "payment-gateway"],
    areas: ["AI_WHATSAPP", "AI_SALES"], challenges: ["LOST_SALES", "MANUAL_WORK", "SLOW_RESPONSES"],
    industries: { retail: 30 },
  }),
  sol("ai-customer-retention-agent", "AI Customer Retention Agent", "Re-engages previous customers with approved offers and reminders, and flags customers at risk of lapsing.", {
    problems: ["Repeat customers not contacted", "No structured loyalty follow-up"],
    caps: ["Segments by purchase history you provide", "Sends approved win-back and reminder messages", "Respects opt-outs", "Reports response and repeat-purchase activity"],
    integrations: ["pos-erp", "whatsapp-business", "email"],
    areas: ["AI_MARKETING", "AI_SALES"], challenges: ["LOST_SALES", "POOR_FOLLOWUP"],
    industries: { retail: 40 },
  }),
  sol("ai-inventory-alert-agent", "AI Inventory Alert Agent", "Watches stock levels in your system and alerts staff about low or unusual stock so reordering happens in time.", {
    problems: ["Stock-outs and overstock", "Manual stock checking"],
    caps: ["Low-stock alerts by branch", "Highlights slow movers and unusual changes", "Reorder suggestions for staff approval", "Works from your system's stock data"],
    integrations: ["pos-erp"],
    deps: ["Reliable stock data in a connectable system (CliqPOS or another)", "Defined reorder thresholds"],
    areas: ["AI_OPERATIONS", "AI_BI"], challenges: ["INVENTORY", "INEFFICIENCY"],
    industries: { retail: 60 },
  }),

  // ───────────── Logistics ─────────────
  sol("ai-dispatch-assistant", "AI Dispatch Assistant", "Assists dispatchers by matching jobs to available vehicles and drivers under rules you define; dispatchers stay in control.", {
    problems: ["Manual dispatch and route assignment", "Delays from phone coordination"],
    caps: ["Suggested assignments for dispatcher approval", "Driver and vehicle availability view", "Notifies drivers of assignments", "Logs every assignment decision"],
    integrations: ["fleet-telematics", "whatsapp-business"],
    complexity: "HIGH",
    areas: ["AI_OPERATIONS"], challenges: ["INEFFICIENCY", "MANUAL_WORK", "SCHEDULING"],
    industries: { logistics: 10 },
  }),
  sol("ai-customer-communication-agent", "AI Customer Communication Agent", "Answers customer questions about bookings and deliveries and keeps them informed without calls to your office.", {
    problems: ["'Where is my delivery?' calls", "Customers not informed of delays"],
    caps: ["Status answers from your tracking data", "Proactive delay notifications", "Escalation to staff for disputes or damage", "Multi-channel messaging"],
    integrations: ["whatsapp-business", "fleet-telematics", "sms"],
    areas: ["AI_SUPPORT", "AI_WHATSAPP"], challenges: ["CUSTOMER_SERVICE", "SLOW_RESPONSES"],
    industries: { logistics: 20 },
  }),
  sol("ai-shipment-update-agent", "AI Shipment Update Agent", "Sends shipment milestone updates automatically when your system records a status change.", {
    problems: ["Manual status messages", "Inconsistent customer updates"],
    caps: ["Triggers on status changes you define", "Templated, approved update messages", "Delivery confirmation capture", "Exceptions flagged to staff"],
    integrations: ["fleet-telematics", "whatsapp-business", "sms", "email"],
    areas: ["AI_OPERATIONS", "AI_SUPPORT"], challenges: ["MANUAL_WORK", "CUSTOMER_SERVICE"],
    industries: { logistics: 30 },
  }),
  sol("ai-fleet-operations-assistant", "AI Fleet Operations Assistant", "Summarises fleet activity and flags maintenance, utilisation and compliance items for fleet managers.", {
    problems: ["Poor visibility of fleet status", "Maintenance and document expiry tracked manually"],
    caps: ["Maintenance and document-expiry reminders", "Utilisation and idle-time summaries", "Exception alerts for managers", "Works from the fleet data you hold"],
    integrations: ["fleet-telematics", "analytics-bi"],
    areas: ["AI_OPERATIONS", "AI_BI"], challenges: ["INEFFICIENCY", "POOR_REPORTING"],
    industries: { logistics: 40 },
  }),
  sol("ai-booking-assistant", "AI Booking Assistant", "Takes transport and delivery booking requests in chat, captures required details and creates the booking.", {
    problems: ["Bookings taken by phone and re-typed", "Incomplete booking details"],
    caps: ["Structured booking capture", "Validation of required details", "Quote hand-off per your approved rate rules", "Creates booking in your system"],
    integrations: ["whatsapp-business", "fleet-telematics", "crm"],
    areas: ["AI_BOOKING", "AI_SALES"], challenges: ["MANUAL_WORK", "LOST_SALES"],
    industries: { logistics: 25 },
  }),

  // ───────────── Financial services ─────────────
  sol("ai-client-onboarding-agent", "AI Client Onboarding Agent", "Guides new clients through onboarding steps and document requests, and prepares complete files for staff review.", {
    problems: ["Slow client onboarding", "Chasing clients for missing documents"],
    caps: ["Checklist-driven onboarding conversations", "Document requests and reminders", "Completeness checks before staff review", "Staff approve every onboarding outcome — the agent never approves clients"],
    integrations: ["document-storage", "crm", "email", "core-systems"],
    deps: ["Your onboarding and KYC procedure as written policy", "Compliance sign-off on the workflow", "Named reviewer for each file"],
    complexity: "HIGH",
    areas: ["AI_OPERATIONS", "AI_FINANCE"], challenges: ["MANUAL_WORK", "INEFFICIENCY"],
    industries: { "financial-services": 10 },
  }),
  sol("ai-compliance-support-assistant", "AI Compliance Support Assistant", "Supports your compliance team with checklists, reminders and document organisation. It supports staff; it does not make compliance decisions.", {
    problems: ["Compliance tasks tracked manually", "Documents hard to find during reviews"],
    caps: ["Checklist and deadline reminders", "Organises evidence and documents", "Flags missing items for staff", "No automated approvals or regulatory advice"],
    integrations: ["document-storage", "email"],
    deps: ["Written compliance procedures", "Compliance officer ownership of the workflow"],
    complexity: "HIGH",
    areas: ["AI_OPERATIONS"], challenges: ["INEFFICIENCY", "MANUAL_WORK"],
    industries: { "financial-services": 60 },
  }),

  // ───────────── Professional services ─────────────
  sol("ai-client-acquisition-agent", "AI Client Acquisition Agent", "Responds to prospective clients quickly, explains your services and books an introductory conversation.", {
    problems: ["Slow response to new enquiries", "Prospects drift away before a first call"],
    caps: ["Answers service and process questions from approved content", "Captures the matter or project in brief", "Books introductory calls", "Passes a summary to the right partner or consultant"],
    integrations: ["website-chat", "calendar-scheduling", "crm", "email"],
    areas: ["AI_SALES", "AI_LEADGEN"], challenges: ["LOST_SALES", "SLOW_RESPONSES"],
    industries: { "professional-services": 10 },
  }),
  sol("ai-appointment-agent", "AI Appointment Agent", "Schedules meetings and consultations around your team's real calendars, with reminders and rescheduling.", {
    problems: ["Back-and-forth emails to schedule meetings", "No-shows"],
    caps: ["Offers real availability", "Confirmations and reminders", "Rescheduling and cancellations", "Pre-meeting information collection"],
    integrations: ["calendar-scheduling", "email", "whatsapp-business"],
    areas: ["AI_BOOKING"], challenges: ["SCHEDULING", "MANUAL_WORK"],
    industries: { "professional-services": 30 },
  }),
  sol("ai-document-workflow-agent", "AI Document Workflow Agent", "Prepares, routes and tracks routine documents such as engagement letters, forms and checklists through your approval steps.", {
    problems: ["Document turnaround delays", "Version and approval confusion"],
    caps: ["Generates documents from approved templates", "Routes for review and signature steps", "Tracks status and sends reminders", "Keeps a clear audit trail; professionals approve all outputs"],
    integrations: ["document-storage", "email"],
    areas: ["AI_OPERATIONS"], challenges: ["MANUAL_WORK", "INEFFICIENCY"],
    industries: { "professional-services": 40 },
  }),
  sol("ai-client-communication-agent", "AI Client Communication Agent", "Keeps clients informed with status updates and answers routine questions, escalating anything substantive to your team.", {
    problems: ["Clients chasing for updates", "Staff interrupted by status questions"],
    caps: ["Status updates from your project or case data", "Answers routine process questions", "Escalates substantive or sensitive questions", "Logs communications against the client record"],
    integrations: ["email", "whatsapp-business", "crm"],
    areas: ["AI_SUPPORT", "AI_WHATSAPP"], challenges: ["CUSTOMER_SERVICE", "SLOW_RESPONSES"],
    industries: { "professional-services": 50 },
  }),

  // ───────────── Education ─────────────
  sol("ai-admissions-agent", "AI Admissions Agent", "Answers prospective-parent and student enquiries and guides applicants through your admissions steps.", {
    problems: ["Admissions enquiries answered slowly", "Applicants lost mid-process"],
    caps: ["Programme, fee and process answers from approved information", "Application checklist and reminders", "Books tours or interviews", "Staff make all admissions decisions"],
    integrations: ["whatsapp-business", "school-management", "calendar-scheduling"],
    areas: ["AI_SALES", "AI_SUPPORT", "AI_BOOKING"], challenges: ["LOST_SALES", "SLOW_RESPONSES"],
    industries: { education: 10 },
  }),
  sol("ai-student-support-agent", "AI Student Support Agent", "Answers routine student questions about timetables, procedures and deadlines and routes other requests to staff.", {
    problems: ["Office staff answering the same questions", "Students unsure where to get help"],
    caps: ["Answers from approved school information", "Routes requests to the right office", "Escalates welfare or safeguarding concerns to designated staff immediately", "Access limited to what each role is permitted to see"],
    integrations: ["school-management", "website-chat"],
    deps: ["Safeguarding escalation procedure owned by your designated lead", "Role-based access rules"],
    areas: ["AI_SUPPORT"], challenges: ["CUSTOMER_SERVICE", "MANUAL_WORK"],
    industries: { education: 20 },
  }),
  sol("ai-parent-communication-agent", "AI Parent Communication Agent", "Sends approved notices to parents and answers routine questions about school life.", {
    problems: ["Notices sent manually", "Parents unsure of dates and requirements"],
    caps: ["Broadcasts staff-approved notices", "Answers routine questions", "Respects contact preferences", "Delivery visibility for staff"],
    integrations: ["whatsapp-business", "sms", "school-management"],
    areas: ["AI_WHATSAPP", "AI_SUPPORT"], challenges: ["CUSTOMER_SERVICE", "MANUAL_WORK"],
    industries: { education: 30 },
  }),
  sol("ai-fee-reminder-agent", "AI Fee Reminder Agent", "Sends courteous fee reminders on a schedule you approve and records responses for the bursar.", {
    problems: ["Late fee payments", "Bursar time spent chasing"],
    caps: ["Scheduled reminders from your fee records", "Records promises-to-pay for follow-up", "Escalates disputes to the bursar", "Does not alter fee records or waive fees"],
    integrations: ["school-management", "whatsapp-business", "sms", "payment-gateway"],
    areas: ["AI_FINANCE", "AI_WHATSAPP"], challenges: ["MANUAL_WORK", "POOR_FOLLOWUP"],
    industries: { education: 40 },
  }),
];

export const SOLUTION_KEYS = SOLUTION_SEEDS.map((s) => s.key);
