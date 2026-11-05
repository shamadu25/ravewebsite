import type { IndustryConfig } from "../types";
import { area, multi, sel, text } from "./helpers";

const IMG = { src: "/img/business-automation.png", alt: "RaveSoft team reviewing an automation workflow on screen in a modern office" };

export const REAL_ESTATE: IndustryConfig = {
  slug: "real-estate", name: "Real Estate", hasPage: true, sortOrder: 20, active: true,
  seo: {
    title: "AI Automation for Real Estate | AI Sales Agent",
    description: "AI automation for real estate: qualify leads, answer WhatsApp instantly, schedule viewings and follow up every enquiry. Free AI assessment from RaveSoft.",
    keywords: ["AI automation for real estate", "real estate AI sales agent", "real estate lead qualification automation", "property WhatsApp automation"],
  },
  content: {
    shortName: "Real Estate", icon: "Home",
    audience: ["Real estate agencies", "Property developers", "Property management companies", "Real estate brokers", "Property investment firms"],
    hero: {
      eyebrow: "AI automation for real estate",
      headline: "Sell More Properties. Lose Fewer Leads. Grow Without Expanding Your Sales Team.",
      subcopy: "Property buyers message several agents at once and usually go with whoever replies first. Describe how your agency handles enquiries today and our AI consultant will show where leads leak and which AI agents could close the gaps.",
      bullets: ["Qualify enquiries before a salesperson spends time", "Reply on WhatsApp the moment an enquiry arrives", "Follow up every lead on a schedule you control"],
      image: { ...IMG, alt: "Real estate team using an AI-assisted lead workflow on screen" },
    },
    problems: [
      { title: "Lost enquiries", body: "Enquiries arrive from portals, social media, WhatsApp and calls. Without one place to capture them, some are never answered." },
      { title: "Slow WhatsApp responses", body: "Prospects message after hours and at weekends. A reply the next day often means they have already booked a viewing elsewhere." },
      { title: "Unqualified prospects", body: "Representatives spend hours on people who have no budget, wrong location needs or no real timeline." },
      { title: "Inconsistent lead follow-up", body: "Follow-up depends on each salesperson's memory and diary, so strong leads go cold." },
      { title: "Viewing coordination", body: "Arranging viewing times across prospects, agents and property access creates long message chains and no-shows." },
      { title: "Managing sales representatives", body: "Managers cannot easily see who responded quickly, who followed up and who let a lead slip." },
      { title: "No visibility into sales performance", body: "Enquiry sources, response times and conversion by stage live in chats and spreadsheets rather than one report." },
    ],
    useCases: [
      { title: "Instant response with qualification", scenario: "A prospect messages about a three-bedroom apartment late in the evening.", steps: ["The AI agent answers from your approved listing details", "It asks about budget, preferred area and timeline", "It scores the enquiry and records it in your CRM", "A representative receives a qualified lead summary in the morning"] },
      { title: "Viewing scheduling", scenario: "A qualified buyer wants to see two properties on Saturday.", steps: ["The scheduler offers slots from the representative's calendar", "Both sides receive confirmation and a reminder", "Rescheduling is handled in the same chat", "The CRM is updated after the viewing"] },
      { title: "Recovering quiet leads", scenario: "Fifty enquiries from last month never progressed after the first reply.", steps: ["The recovery agent identifies stalled leads", "Sends your approved follow-up message, respecting opt-outs", "Flags anyone who responds to a salesperson", "Reports how many conversations restarted"] },
    ],
    integrations: ["WhatsApp Business Platform", "Your CRM or property management system", "Google or Microsoft calendars", "Property portals (where an export or API is available)", "Website chat", "Email"],
    faqs: [
      { q: "Can the AI answer questions about my specific listings?", a: "Yes, when it is connected to your listing data or a maintained property sheet. It answers only from information you provide and hands over to a representative when it does not know." },
      { q: "Will it replace my sales team?", a: "No. It handles first response, qualification, scheduling and follow-up so your representatives spend their time on viewings and negotiation." },
      { q: "Which CRM do you work with?", a: "That is part of the assessment. We check what you use now and confirm during scoping which systems can be integrated through an available API or export." },
      { q: "How do I get a price for AI agents at my agency?", a: "Complete the free assessment. Your proposal is prepared from RaveSoft's approved pricing and reviewed by our team before it is sent to you." },
    ],
    cta: { primary: "Get My Free Real Estate AI Assessment", secondary: "See Recommended AI Agents", closing: "Find out where your agency is losing enquiries — and what to automate first." },
    related: [{ label: "Business automation services", href: "/services/business-automation" }, { label: "Custom software development", href: "/services/custom-software" }, { label: "Real estate industry solutions", href: "/industries/real-estate" }, { label: "AI Employee for WhatsApp", href: "/ai-employee" }],
    assessmentIntro: "Tell us how your agency handles enquiries and viewings. We only ask what we need to recommend the right agents.",
  },
  questions: [
    sel("re_portfolio", "How many properties do you manage or market?", ["1–10", "11–50", "51–200", "201–1,000", "More than 1,000"], { required: true }),
    sel("re_enquiries", "How many enquiries do you receive monthly?", ["Fewer than 50", "50–200", "201–500", "501–2,000", "More than 2,000"], { required: true }),
    multi("re_channels", "Which channels generate enquiries?", ["WhatsApp", "Phone calls", "Property portals", "Facebook / Instagram", "Your website", "Walk-ins", "Referrals", "Other"], { required: true }),
    sel("re_reps", "How many sales representatives do you employ?", ["None — owner-led", "1–3", "4–10", "11–30", "More than 30"], { required: true }),
    sel("re_enquiry_handling", "How are enquiries currently managed?", ["Notebook or memory", "WhatsApp chats only", "Spreadsheet", "CRM", "Mixed / no standard process"], { required: true }),
    sel("re_contact_speed", "How quickly are leads contacted?", ["Within minutes", "Within an hour", "Same day", "Next day or later", "Varies by representative"]),
    sel("re_viewings", "How do you schedule property viewings?", ["Phone calls", "WhatsApp messages", "Shared calendar", "Booking system", "Ad hoc"]),
    text("re_crm", "What CRM or property management system do you use?", { placeholder: "e.g. HubSpot, Zoho, spreadsheet, none" }),
    sel("re_bottleneck", "What is your biggest sales bottleneck?", ["Responding fast enough", "Qualifying serious buyers", "Follow-up discipline", "Scheduling viewings", "Managing representatives", "Reporting and visibility", "Other"], { required: true }),
    area("re_bottleneck_other", "Tell us more about the bottleneck", { showIf: { key: "re_bottleneck", in: ["other"] } }),
    area("re_automate_first", "What would you most like to automate?", { maxLength: 800 }),
  ],
};

export const HEALTHCARE: IndustryConfig = {
  slug: "healthcare", name: "Healthcare", hasPage: true, sortOrder: 30, active: true,
  seo: {
    title: "Healthcare AI Automation | Patient Support Agents",
    description: "Healthcare AI automation for clinics and hospitals: appointment booking, patient enquiries and admin workflows with privacy and human oversight.",
    keywords: ["healthcare AI automation", "AI patient support", "healthcare administrative automation", "clinic appointment automation"],
  },
  content: {
    shortName: "Healthcare", icon: "Heart",
    audience: ["Hospitals", "Clinics", "Dental practices", "Diagnostic centres", "Specialist healthcare providers"],
    hero: {
      eyebrow: "AI automation for healthcare administration",
      headline: "Improve Patient Experience. Reduce Administrative Work. Run a Smarter Healthcare Operation.",
      subcopy: "Reception teams answer the same questions, confirm the same appointments and chase the same paperwork all day. Our AI consultant looks at your administrative workload and recommends where automation can help — without touching clinical decisions.",
      bullets: ["Answer non-clinical enquiries any time", "Reduce phone-based appointment booking", "Reminders and follow-ups handled consistently"],
      image: { ...IMG, alt: "Healthcare administration team reviewing an appointment workflow" },
    },
    problems: [
      { title: "Overloaded reception", body: "Phone and message volume for opening hours, locations and booking crowds out patients in front of the desk." },
      { title: "Manual appointment management", body: "Bookings, changes and cancellations handled by phone and paper create double bookings and gaps." },
      { title: "Missed appointments", body: "Without consistent reminders, patients forget and slots go unused." },
      { title: "Fragmented communication", body: "Patients contact the facility by call, WhatsApp, walk-in and email, with no single view." },
      { title: "Heavy paperwork", body: "Referral letters, forms and reports are re-typed into systems, using staff time and introducing errors." },
      { title: "Follow-up gaps", body: "Routine administrative follow-ups depend on staff remembering to send them." },
      { title: "Limited reporting", body: "Managers lack a simple view of appointment volumes, no-shows and enquiry demand." },
    ],
    useCases: [
      { title: "Appointment booking assistant", scenario: "A patient messages to book a routine dental check-up.", steps: ["The agent offers available slots from your scheduling system", "Confirms the booking and sends preparation information your team approved", "Sends a reminder before the appointment", "Handles rescheduling without calling reception"] },
      { title: "General enquiry handling", scenario: "Someone asks what services the clinic offers and where it is located.", steps: ["The agent answers from facility-approved information", "It does not provide medical advice", "Clinical or urgent questions are escalated to staff with clear guidance to seek emergency help where relevant"] },
      { title: "Referral and form processing", scenario: "Referral letters arrive as scanned documents.", steps: ["The document agent extracts defined administrative fields", "Staff review flagged or uncertain items", "Approved data is entered into your system", "An audit trail records who approved what"] },
    ],
    integrations: ["Hospital or practice management system (where an API or export exists)", "Calendar / scheduling platform", "WhatsApp Business Platform", "SMS gateway", "Email", "Document storage"],
    safeguards: {
      title: "Privacy and clinical safety by design",
      body: "Healthcare workflows must respect the privacy, security and regulatory requirements that apply to your facility and country. Patient information is not sent to an external AI provider without appropriate safeguards and authorisation. Agents handle administrative tasks only: they do not diagnose, interpret results or give medical advice, and clinical matters are escalated to your staff. Please do not enter patient-identifiable information in the assessment.",
    },
    faqs: [
      { q: "Do the agents give medical advice?", a: "No. They handle administrative tasks such as booking, reminders and general information, and escalate clinical questions to your staff." },
      { q: "How is patient data protected?", a: "Scope, data flows and safeguards are agreed before build, based on the rules that apply to you. Personal health information is not shared with external AI providers without appropriate authorisation and safeguards. This is reviewed with your team during scoping." },
      { q: "Does this work with our hospital management software?", a: "We assess what you use now and confirm which systems can be integrated. If a system has no API or export, we say so in the proposal rather than assume." },
      { q: "What should I put in the assessment?", a: "Business information only — facility type, volumes, processes and tools. Never include patient names or records." },
    ],
    cta: { primary: "Get My Free Healthcare AI Assessment", secondary: "See Recommended AI Agents", closing: "See which administrative workloads in your facility can be automated safely." },
    related: [{ label: "Hospital management system", href: "/products/hospital" }, { label: "Business automation services", href: "/services/business-automation" }, { label: "Healthcare industry solutions", href: "/industries/healthcare" }],
    assessmentIntro: "Tell us about your facility's administrative workflows. Do not include any patient information.",
  },
  questions: [
    sel("hc_type", "What type of healthcare facility do you operate?", ["Hospital", "General clinic", "Dental practice", "Diagnostic centre / laboratory", "Specialist practice", "Pharmacy", "Other"], { required: true }),
    sel("hc_volume", "How many patients do you serve monthly?", ["Fewer than 200", "200–1,000", "1,001–5,000", "5,001–20,000", "More than 20,000"], { required: true }),
    sel("hc_appointments", "How are appointments managed?", ["Phone and paper diary", "WhatsApp messages", "Spreadsheet", "Management software", "Walk-in only", "Mixed"], { required: true }),
    multi("hc_contact", "How do patients contact your facility?", ["Phone calls", "WhatsApp", "Walk-in", "Website form", "Email", "Social media"], { required: true }),
    sel("hc_reminders", "How are reminders and follow-ups handled?", ["Staff call patients", "Staff send messages manually", "Software sends reminders", "Not done consistently"]),
    multi("hc_admin_time", "Which administrative processes consume the most time?", ["Booking and rescheduling", "Answering general enquiries", "Billing and claims paperwork", "Referrals and forms", "Reporting", "Stock and supplies", "Other"], { required: true }),
    text("hc_software", "What management or hospital software do you use?", { placeholder: "Name of system, or 'none'" }),
  ],
};

export const HOSPITALITY: IndustryConfig = {
  slug: "hospitality", name: "Hospitality", hasPage: true, sortOrder: 40, active: true,
  seo: {
    title: "Hotel AI Automation | AI Reservation & Guest Agents",
    description: "Hospitality AI automation for hotels and guesthouses: AI reservation agent, guest support, booking follow-up and reporting. Free AI assessment.",
    keywords: ["hotel AI automation", "AI hotel reservation agent", "hospitality customer service automation", "guesthouse booking automation"],
  },
  content: {
    shortName: "Hospitality", icon: "Building2",
    audience: ["Hotels", "Resorts", "Guesthouses", "Serviced apartments", "Hospitality groups"],
    hero: {
      eyebrow: "AI automation for hotels and hospitality",
      headline: "Deliver Better Guest Experiences While Automating Your Hotel Operations.",
      subcopy: "Guests expect quick answers and smooth stays, while your team juggles bookings across platforms, calls and WhatsApp. Describe your operation and our AI consultant will recommend where automation can free staff for guests.",
      bullets: ["Answer booking enquiries any hour", "Route guest requests to the right department", "Daily operations summary for managers"],
      image: { ...IMG, alt: "Hospitality operations team reviewing a booking and guest-request workflow" },
    },
    problems: [
      { title: "Missed enquiries out of hours", body: "Travellers compare options quickly. An enquiry that waits until morning may already be booked elsewhere." },
      { title: "Bookings spread across channels", body: "Reservations arrive from online platforms, calls, WhatsApp and walk-ins, increasing the chance of errors." },
      { title: "Front desk overload", body: "The same questions about rates, directions, breakfast and check-in times consume the desk's attention." },
      { title: "Cancellations and no-shows", body: "Late cancellations and unconfirmed arrivals leave rooms empty that could have been resold." },
      { title: "Inconsistent guest requests", body: "Requests for towels, late checkout or maintenance pass through verbal hand-offs and get lost." },
      { title: "Slow check-in", body: "Collecting details at the desk creates queues at peak arrival times." },
      { title: "Manual reporting", body: "Managers compile occupancy and request summaries by hand." },
    ],
    useCases: [
      { title: "Reservation enquiries", scenario: "A guest asks on WhatsApp about a family room next weekend.", steps: ["The agent checks availability in your system", "Quotes the rate your team has approved", "Captures guest details", "Creates the booking or hands over for confirmation"] },
      { title: "In-stay requests", scenario: "A guest messages for extra towels at 9pm.", steps: ["The agent logs the request", "Routes it to housekeeping on duty", "Confirms to the guest", "Escalates if not actioned within your target time"] },
      { title: "Cancellation and reconfirmation", scenario: "Arrivals tomorrow include unconfirmed bookings.", steps: ["The agent asks guests to reconfirm", "Flags non-responses to the front desk", "Applies your cancellation policy wording", "Updates the booking record"] },
    ],
    integrations: ["Hotel property management system", "Online booking platforms / channel manager", "WhatsApp Business Platform", "Payment gateway", "Email", "Website chat"],
    faqs: [
      { q: "Can the AI take payments?", a: "Only where a payment gateway is connected and your policy allows it. Many hotels begin with the agent collecting details and sending a payment link handled by existing processes." },
      { q: "What if the AI does not know the answer?", a: "It hands the conversation to your team and records what the guest asked, so nothing is lost." },
      { q: "Do you integrate with our booking platforms?", a: "We check which platforms and channel managers you use during the assessment and confirm what can be connected through an available API." },
      { q: "How is pricing decided for a hotel or guesthouse?", a: "From RaveSoft's approved price list for the agents and integrations you need. Anything we cannot price confidently is flagged for manual review." },
    ],
    cta: { primary: "Get My Free Hospitality AI Assessment", secondary: "See Recommended AI Agents", closing: "Find out which parts of your hotel operation to automate first." },
    related: [{ label: "Hotel management system", href: "/products/hotel" }, { label: "Business automation services", href: "/services/business-automation" }, { label: "Hospitality industry solutions", href: "/industries/hospitality" }],
    assessmentIntro: "Tell us how reservations and guest requests flow through your property.",
  },
  questions: [
    sel("ho_type", "What type of hospitality business do you operate?", ["Hotel", "Resort", "Guesthouse / B&B", "Serviced apartments", "Hospitality group", "Other"], { required: true }),
    sel("ho_rooms", "How many rooms or properties do you manage?", ["1–10 rooms", "11–30 rooms", "31–100 rooms", "More than 100 rooms", "Multiple properties"], { required: true }),
    multi("ho_reservations", "How are reservations received?", ["Phone calls", "WhatsApp", "Walk-ins", "Website", "Online booking platforms", "Email", "Corporate / agents"], { required: true }),
    text("ho_platforms", "Which booking platforms do you use?", { placeholder: "e.g. Booking.com, Airbnb, Expedia, none" }),
    sel("ho_enquiries", "How do you handle guest enquiries?", ["Front desk by phone", "WhatsApp managed by staff", "Shared inbox", "Chatbot already in place", "No consistent process"], { required: true }),
    sel("ho_cancellations", "How do you manage cancellations?", ["Manually by staff", "Through the booking platform", "Policy applied inconsistently", "Rarely an issue"]),
    multi("ho_attention", "Which activities require the most staff attention?", ["Answering booking enquiries", "Check-in and check-out", "Guest requests", "Housekeeping coordination", "Reporting", "Marketing and follow-up"], { required: true }),
    text("ho_software", "Which hotel management software do you use?", { placeholder: "Name of system, or 'none'" }),
  ],
};

export const RETAIL: IndustryConfig = {
  slug: "retail", name: "Retail & E-commerce", hasPage: true, sortOrder: 10, active: true,
  seo: {
    title: "Retail AI Automation | AI Sales & WhatsApp Agents",
    description: "AI automation for retailers and e-commerce: WhatsApp orders, customer support, retention and stock alerts. Free AI assessment from RaveSoft.",
    keywords: ["retail AI automation", "AI retail customer support", "retail business process automation", "WhatsApp commerce automation"],
  },
  content: {
    shortName: "Retail", icon: "ShoppingCart",
    audience: ["Supermarkets", "Retail stores", "Wholesalers", "E-commerce businesses", "Multi-branch retailers"],
    hero: {
      eyebrow: "AI automation for retail and e-commerce",
      headline: "Sell More. Serve Customers Faster. Automate Your Retail Operations.",
      subcopy: "Customers ask about prices and stock on WhatsApp, social media and in store, while your team also runs the till and the stockroom. Tell us how your retail operation runs and our AI consultant will recommend what to automate first.",
      bullets: ["Answer product and price questions instantly", "Turn WhatsApp chats into orders", "Get low-stock alerts and daily summaries"],
      image: { ...IMG, alt: "Retail operations team reviewing sales and customer-messaging workflows" },
    },
    problems: [
      { title: "Unanswered customer messages", body: "Product, price and availability questions arrive all day. Slow replies send shoppers to competitors." },
      { title: "Orders managed in chat threads", body: "WhatsApp orders are written down by hand, leading to mistakes and missed orders." },
      { title: "Repeat customers not followed up", body: "Past customers are never reminded or re-engaged because nobody has time." },
      { title: "Stock surprises", body: "Fast sellers run out while slow movers pile up, because stock is checked manually." },
      { title: "Branch performance unclear", body: "Owners wait for end-of-day or end-of-week reports to see what happened." },
      { title: "Repetitive support questions", body: "Staff answer the same questions about delivery, returns and opening times many times a day." },
    ],
    useCases: [
      { title: "WhatsApp order taking", scenario: "A customer messages to ask whether a product is in stock and orders two.", steps: ["The agent checks the catalogue or stock data you provide", "Confirms an order summary with the customer", "Passes the order to your team or POS", "Sends an approved payment link where a gateway is connected"] },
      { title: "Customer win-back", scenario: "Customers who bought regularly have not returned for two months.", steps: ["The retention agent identifies them from your sales records", "Sends an approved reminder or offer, respecting opt-outs", "Alerts staff to replies that need a human", "Reports how many responded"] },
      { title: "Low-stock alerts", scenario: "A fast-moving item is about to run out at one branch.", steps: ["The alert agent watches stock levels in your system", "Notifies the responsible manager", "Suggests a reorder quantity for approval"] },
    ],
    integrations: ["CliqPOS (where you already use it, or are considering it)", "Other POS / ERP systems with an API or export", "WhatsApp Business Platform", "Payment gateway", "Website chat", "Email"],
    faqs: [
      { q: "Do I need CliqPOS to use these agents?", a: "No. We assess the systems you use now. Where CliqPOS is a good fit we will say so, but we do not assume it, and the agents can work with other systems that offer an API or export." },
      { q: "Can the agent see my live stock?", a: "Only if your system exposes stock data through an API or export. We confirm this during scoping rather than promise it up front." },
      { q: "Will it send promotions to everyone?", a: "No. Messages are approved by you, go only to customers who can be contacted, and opt-outs are respected." },
      { q: "How do I get a price for retail automation?", a: "Complete the free assessment. Your proposal is built from RaveSoft's approved prices and reviewed by our team before it is sent." },
    ],
    cta: { primary: "Get My Free Retail AI Assessment", secondary: "See Recommended AI Agents", closing: "Find out where automation can save your team time and win back sales." },
    related: [{ label: "CliqPOS — cloud POS", href: "/products/cliqpos" }, { label: "ERP systems", href: "/products/erp" }, { label: "Retail industry solutions", href: "/industries/retail" }, { label: "Business automation services", href: "/services/business-automation" }],
    assessmentIntro: "Tell us how you sell, support customers and manage stock today.",
  },
  questions: [
    sel("rt_type", "What type of retail business do you run?", ["Supermarket / grocery", "Fashion / general store", "Wholesale / distribution", "Online store", "Pharmacy / specialty retail", "Other"], { required: true }),
    sel("rt_branches", "How many branches or sales points do you have?", ["1", "2–5", "6–20", "More than 20", "Online only"], { required: true }),
    multi("rt_channels", "Where do customers contact you or order?", ["In store", "WhatsApp", "Phone calls", "Instagram / Facebook", "Website / online store", "Marketplaces"], { required: true }),
    sel("rt_messages", "How many customer messages or enquiries do you receive per day?", ["Fewer than 20", "20–100", "101–500", "More than 500"], { required: true }),
    text("rt_pos", "Which POS, ERP or stock system do you use?", { placeholder: "e.g. CliqPOS, other, spreadsheets, none" }),
    sel("rt_stock", "How do you track stock today?", ["Integrated POS / ERP", "Spreadsheets", "Manual counts", "Not tracked consistently"]),
    sel("rt_retention", "Do you follow up with past customers?", ["Yes, systematically", "Occasionally", "No"]),
    multi("rt_pain", "Which tasks take the most staff time?", ["Answering customer questions", "Taking orders on WhatsApp", "Stock checks", "Reporting", "Marketing messages", "Supplier follow-up"], { required: true }),
  ],
};
