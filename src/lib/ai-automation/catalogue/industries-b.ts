import type { IndustryConfig } from "../types";
import { area, multi, sel, text } from "./helpers";

const IMG = { src: "/img/business-automation.png", alt: "RaveSoft team reviewing an automation workflow on screen in a modern office" };

export const LOGISTICS: IndustryConfig = {
  slug: "logistics", name: "Logistics", hasPage: true, sortOrder: 50, active: true,
  seo: {
    title: "Logistics AI Automation | AI Dispatch Agents",
    description: "Logistics AI automation for fleets and couriers: dispatch support, shipment updates, booking capture and fleet reporting. Free AI assessment.",
    keywords: ["logistics AI automation", "AI dispatch automation", "fleet operations automation", "shipment update automation"],
  },
  content: {
    shortName: "Logistics", icon: "Truck",
    audience: ["Courier and delivery companies", "Freight and haulage operators", "Fleet owners", "Warehousing and distribution businesses", "Transport booking businesses"],
    hero: {
      eyebrow: "AI automation for logistics",
      headline: "Automate Your Logistics Operations. Improve Visibility. Serve Customers Better.",
      subcopy: "Dispatchers juggle calls, drivers and 'where is my delivery?' messages all day. Describe how your operation runs and our AI consultant will identify where automation can add visibility and remove repetitive coordination.",
      bullets: ["Suggested driver and vehicle assignments", "Proactive shipment updates to customers", "Structured booking capture from chat"],
      image: { ...IMG, alt: "Logistics operations team reviewing dispatch and shipment workflows" },
    },
    problems: [
      { title: "Manual dispatch", body: "Jobs are assigned by phone and messages, which is slow and hard to audit." },
      { title: "Status enquiries", body: "Customers call or message repeatedly to ask where their goods are." },
      { title: "Incomplete bookings", body: "Booking details taken informally are missing addresses, contacts or package information." },
      { title: "Poor fleet visibility", body: "Managers cannot quickly see vehicle availability, maintenance dates or utilisation." },
      { title: "Paperwork delays", body: "Delivery notes, waybills and invoices are re-typed or filed by hand." },
      { title: "Inconsistent customer notifications", body: "Updates go out only when someone remembers to send them." },
    ],
    useCases: [
      { title: "Shipment updates", scenario: "A parcel moves from collected to out for delivery.", steps: ["Your system records the status change", "The update agent sends your approved message to the customer", "Exceptions and delays are flagged to staff", "Delivery confirmation is captured"] },
      { title: "Booking capture", scenario: "A business customer requests a pickup by chat.", steps: ["The booking assistant collects pickup, drop-off, contact and package details", "Missing details are requested", "The booking is created in your system or passed to a dispatcher"] },
      { title: "Dispatch support", scenario: "Several jobs arrive within the same hour.", steps: ["The dispatch assistant proposes assignments from availability and rules you define", "The dispatcher approves or changes them", "Drivers are notified and every decision is logged"] },
    ],
    integrations: ["Fleet management / telematics (where an API exists)", "WhatsApp Business Platform", "SMS gateway", "Email", "CRM", "Document storage"],
    faqs: [
      { q: "Can the agent track vehicles live?", a: "Only if your fleet system exposes location or status data through an API. We confirm what data is available during scoping." },
      { q: "Does the AI decide routes on its own?", a: "No. It proposes assignments under rules you set. Dispatchers approve and stay in control." },
      { q: "Can customers get updates on WhatsApp?", a: "Yes, using the WhatsApp Business Platform with message templates approved by WhatsApp where required." },
      { q: "How is logistics automation priced?", a: "From RaveSoft's approved price list for the agents and integrations involved. Items without an approved price are flagged for manual review." },
    ],
    cta: { primary: "Get My Free Logistics AI Assessment", secondary: "See Recommended AI Agents", closing: "Find out which parts of your dispatch and customer communication can be automated." },
    related: [{ label: "Logistics industry solutions", href: "/industries/logistics" }, { label: "Business automation services", href: "/services/business-automation" }, { label: "Custom software development", href: "/services/custom-software" }],
    assessmentIntro: "Tell us about your fleet and how jobs flow from booking to delivery.",
  },
  questions: [
    sel("lg_fleet", "What is your fleet size?", ["Fewer than 5 vehicles", "5–20", "21–100", "More than 100", "We use subcontractors"], { required: true }),
    sel("lg_bookings", "How many bookings or deliveries do you handle daily?", ["Fewer than 20", "20–100", "101–500", "More than 500"], { required: true }),
    sel("lg_routes", "How do you manage routes?", ["Driver decides", "Dispatcher plans manually", "Route planning software", "Mixed"]),
    sel("lg_dispatch", "How does dispatch work today?", ["Phone calls", "WhatsApp groups", "Spreadsheet / paper", "Dispatch software"], { required: true }),
    sel("lg_notifications", "How are customers notified about their shipments?", ["They call us", "Staff send messages manually", "Automatic notifications", "No notifications"], { required: true }),
    text("lg_software", "Which fleet management software do you use?", { placeholder: "Name of system, or 'none'" }),
    multi("lg_bottlenecks", "What are your biggest operational bottlenecks?", ["Dispatch coordination", "Customer status calls", "Booking details", "Paperwork", "Fleet maintenance", "Reporting", "Driver communication"], { required: true }),
  ],
};

export const FINANCIAL_SERVICES: IndustryConfig = {
  slug: "financial-services", name: "Financial Services", hasPage: true, sortOrder: 60, active: true,
  seo: {
    title: "Financial Services AI Automation | Client Onboarding",
    description: "Financial services AI automation: client onboarding, document processing and reporting, with staff approving every regulated decision.",
    keywords: ["financial services AI automation", "client onboarding automation", "financial workflow automation", "AI document processing finance"],
  },
  content: {
    shortName: "Financial Services", icon: "TrendingUp",
    audience: ["Microfinance and lending institutions", "Insurance agencies and brokers", "Savings and cooperative societies", "Fintech companies", "Financial advisory firms"],
    hero: {
      eyebrow: "AI automation for financial services",
      headline: "Automate Client Workflows. Improve Service Delivery. Make Better Decisions.",
      subcopy: "Onboarding, document checks and routine client questions consume skilled staff time. Describe your processes and our AI consultant will recommend where AI can prepare, organise and report — while your people make every regulated decision.",
      bullets: ["Faster, more complete client onboarding files", "Extract data from documents for staff review", "Management reporting without manual compilation"],
      image: { ...IMG, alt: "Financial services team reviewing a client onboarding workflow" },
    },
    problems: [
      { title: "Slow client onboarding", body: "Collecting documents and details back and forth delays activation and frustrates new clients." },
      { title: "Document handling", body: "ID copies, statements and forms are re-keyed into systems, taking time and introducing errors." },
      { title: "Repetitive client questions", body: "Staff answer the same questions about products, requirements and status." },
      { title: "Manual workflow hand-offs", body: "Files wait between teams with no clear owner or status." },
      { title: "Reporting effort", body: "Management reports are assembled by hand from several systems." },
      { title: "Compliance administration", body: "Checklists, reminders and evidence gathering take time away from judgement work." },
    ],
    useCases: [
      { title: "Client onboarding", scenario: "A new client applies for an account or policy.", steps: ["The agent guides them through your checklist", "Requests and chases missing documents", "Checks the file is complete", "Passes it to a staff member who makes the decision"] },
      { title: "Document data extraction", scenario: "Supporting documents arrive as photos and PDFs.", steps: ["The document agent extracts defined fields", "Flags unclear or inconsistent items", "Staff verify before anything is entered", "The audit trail records who approved"] },
      { title: "Management reporting", scenario: "Managers need a weekly view of applications in progress.", steps: ["The reporting agent compiles data on a schedule", "Highlights files stuck at a stage", "Delivers the summary to named recipients"] },
    ],
    integrations: ["Loan or core financial system (where an API exists)", "CRM", "Document storage", "Email", "WhatsApp Business Platform"],
    safeguards: {
      title: "Human decisions on every regulated action",
      body: "AI does not independently approve regulated financial transactions, make lending decisions or provide unauthorised financial advice. Agents prepare, organise, remind and report; your authorised staff decide. Workflows are designed with your compliance procedures and agreed before build.",
    },
    faqs: [
      { q: "Will the AI approve loans or transactions?", a: "No. It never approves regulated transactions, makes lending decisions or gives unauthorised financial advice. Staff make those decisions." },
      { q: "How do you handle sensitive documents?", a: "Data flows, storage and access are agreed with you before build, with attention to the regulations that apply to your business. Sensitive documents are not sent to external AI providers without appropriate safeguards." },
      { q: "Can it connect to our core system?", a: "Where your system offers an API or export. We confirm what is possible during scoping and state any limits in the proposal." },
      { q: "How do I get a price for my financial services firm?", a: "Complete the free assessment. Pricing comes from RaveSoft's approved price list and the proposal is reviewed by our team before it is sent." },
    ],
    cta: { primary: "Get My Free Financial Services AI Assessment", secondary: "See Recommended AI Agents", closing: "See which client workflows in your organisation can be streamlined." },
    related: [{ label: "Custom software development", href: "/services/custom-software" }, { label: "Business automation services", href: "/services/business-automation" }, { label: "ERP systems", href: "/products/erp" }],
    assessmentIntro: "Tell us about your client-facing processes. Do not include client personal or account details.",
  },
  questions: [
    sel("fs_type", "What type of financial services business are you?", ["Microfinance / lending", "Insurance agency or broker", "Savings / cooperative", "Fintech", "Advisory / wealth", "Accounting-led financial services", "Other"], { required: true }),
    sel("fs_clients", "How many active clients do you serve?", ["Fewer than 100", "100–1,000", "1,001–10,000", "More than 10,000"], { required: true }),
    sel("fs_onboarding", "How are new clients onboarded today?", ["In person with paper forms", "Mix of paper and digital", "Online forms", "Fully digital with review steps"], { required: true }),
    sel("fs_docs", "How many documents do you process each month?", ["Fewer than 100", "100–1,000", "1,001–10,000", "More than 10,000"]),
    multi("fs_time", "Which processes take the most staff time?", ["Client onboarding", "Document checks", "Answering client questions", "Reporting", "Compliance administration", "Follow-up on payments or renewals"], { required: true }),
    text("fs_systems", "Which core or loan management system do you use?", { placeholder: "Name of system, or 'none'" }),
    sel("fs_regulated", "Is your business licensed or regulated?", ["Yes", "No", "In process", "Not sure"]),
    area("fs_regulator_note", "Which regulatory requirements should we design around?", { showIf: { key: "fs_regulated", in: ["yes", "in_process"] }, maxLength: 600 }),
  ],
};

export const PROFESSIONAL_SERVICES: IndustryConfig = {
  slug: "professional-services", name: "Professional Services", hasPage: true, sortOrder: 70, active: true,
  seo: {
    title: "Professional Services AI Automation | Client Intake",
    description: "AI automation for law, accounting and consulting firms: client intake, scheduling, document workflows and updates. Free AI assessment from RaveSoft.",
    keywords: ["professional services AI automation", "AI client acquisition", "professional services workflow automation", "law firm automation"],
  },
  content: {
    shortName: "Professional Services", icon: "Briefcase",
    audience: ["Law firms", "Consulting companies", "Accounting firms", "Marketing agencies", "Business advisory firms", "Other professional service providers"],
    hero: {
      eyebrow: "AI automation for professional services",
      headline: "Spend Less Time on Administration. Win More Clients. Deliver Better Services.",
      subcopy: "Billable hours disappear into scheduling, chasing documents and answering the same enquiry questions. Describe your practice and our AI consultant will recommend where automation can give your professionals their time back.",
      bullets: ["Respond to prospects quickly and book intro calls", "Route routine documents through approval steps", "Keep clients informed without staff chasing"],
      image: { ...IMG, alt: "Professional services team reviewing a client intake workflow" },
    },
    problems: [
      { title: "Slow response to new enquiries", body: "Prospects contact several firms; the first helpful reply often wins the introductory meeting." },
      { title: "Unqualified enquiries", body: "Partners take calls that are outside their services, budget or capacity." },
      { title: "Scheduling overhead", body: "Finding meeting times takes long email chains." },
      { title: "Document turnaround", body: "Engagement letters, forms and checklists wait on manual preparation and routing." },
      { title: "Clients chasing updates", body: "Staff are interrupted by status questions that could be answered automatically." },
      { title: "Administrative load", body: "Time entry reminders, filing and reporting reduce the time available for client work." },
    ],
    useCases: [
      { title: "New client enquiry", scenario: "A prospective client submits an enquiry through your website.", steps: ["The agent replies right away and explains your process", "Collects a short description of the need", "Checks fit against your criteria", "Books an introductory call with the right professional"] },
      { title: "Document workflow", scenario: "A new engagement needs an engagement letter and checklist.", steps: ["The workflow agent prepares documents from approved templates", "A professional reviews and approves", "The client is sent the documents and reminded to return them", "Status is tracked"] },
      { title: "Client updates", scenario: "A client asks where their matter stands.", steps: ["The communication agent answers from your project or case data where available", "Anything substantive goes to the responsible professional"] },
    ],
    integrations: ["Calendar (Google / Microsoft)", "CRM or practice management system", "Email", "Document storage / e-signature (where available)", "Website chat", "WhatsApp Business Platform"],
    faqs: [
      { q: "Is client confidentiality protected?", a: "Data handling is agreed with you before build. Client matter details are not sent to external AI providers without appropriate safeguards and your authorisation." },
      { q: "Will the AI give legal, tax or professional advice?", a: "No. Agents handle intake, scheduling, documents and communication logistics. Professional judgement stays with your professionals." },
      { q: "Can it use our practice management system?", a: "We check what you use during the assessment and confirm what can be integrated through an available API or export." },
      { q: "How is the price worked out for a professional practice?", a: "From RaveSoft's approved prices for the agents and integrations selected, reviewed by our team before your proposal is sent." },
    ],
    cta: { primary: "Get My Free Professional Services AI Assessment", secondary: "See Recommended AI Agents", closing: "Find out how much of your administration can be automated." },
    related: [{ label: "Business automation services", href: "/services/business-automation" }, { label: "Custom software development", href: "/services/custom-software" }, { label: "Professional services industry solutions", href: "/industries/professional-services" }],
    assessmentIntro: "Tell us about your practice and how clients reach and work with you.",
  },
  questions: [
    sel("ps_type", "What type of professional service do you provide?", ["Law firm", "Accounting / audit", "Consulting / advisory", "Marketing / creative agency", "Engineering / architecture", "Other"], { required: true }),
    sel("ps_team", "How many fee-earning professionals are in your team?", ["1–2", "3–10", "11–30", "More than 30"], { required: true }),
    sel("ps_enquiries", "How many new client enquiries do you receive monthly?", ["Fewer than 10", "10–50", "51–200", "More than 200"], { required: true }),
    multi("ps_channels", "How do prospects reach you?", ["Website form", "Email", "Phone", "WhatsApp", "Referrals", "LinkedIn / social"], { required: true }),
    sel("ps_response", "How quickly do you respond to a new enquiry?", ["Within an hour", "Same day", "Within 2 days", "Varies"]),
    sel("ps_scheduling", "How do you schedule client meetings?", ["Email back-and-forth", "Shared calendar link", "Assistant arranges", "Booking tool"]),
    multi("ps_admin", "Which administrative tasks take the most time?", ["Scheduling", "Preparing documents", "Chasing clients for information", "Status updates", "Time entry and billing", "Reporting"], { required: true }),
    text("ps_systems", "Which practice management or CRM tools do you use?", { placeholder: "Names, or 'none'" }),
  ],
};

export const EDUCATION: IndustryConfig = {
  slug: "education", name: "Education", hasPage: true, sortOrder: 80, active: true,
  seo: {
    title: "Education AI Automation | AI Admissions Assistant",
    description: "Education AI automation for schools: admissions assistant, parent communication, fee reminders and administration with safeguarding built in.",
    keywords: ["education AI automation", "school administration automation", "AI admissions assistant", "school fee reminder automation"],
  },
  content: {
    shortName: "Education", icon: "GraduationCap",
    audience: ["Primary and secondary schools", "Colleges and universities", "Training institutes", "Nurseries and early-years centres", "Education groups"],
    hero: {
      eyebrow: "AI automation for schools and education providers",
      headline: "Automate Admissions. Improve Student Support. Simplify School Administration.",
      subcopy: "School offices answer the same admissions, timetable and fee questions every day. Describe how your institution runs and our AI consultant will recommend where AI can lighten the administrative load, with safeguarding and privacy built in.",
      bullets: ["Answer admissions enquiries around the clock", "Send approved notices and fee reminders", "Weekly administrative summaries for leadership"],
      image: { ...IMG, alt: "School administration team reviewing admissions and communication workflows" },
    },
    problems: [
      { title: "Admissions enquiries", body: "Parents ask about places, fees and requirements outside office hours, and slow replies cost applications." },
      { title: "Repeated office questions", body: "Timetables, term dates and procedures are asked about over and over." },
      { title: "Parent communication", body: "Notices go out by many channels with no way to see who received what." },
      { title: "Fee collection", body: "Bursars spend time chasing late fees by phone and message." },
      { title: "Administrative load", body: "Registers, forms and records consume staff time." },
      { title: "Limited management reporting", body: "Leadership lacks a simple view of enquiries, applications and collections." },
    ],
    useCases: [
      { title: "Admissions enquiry", scenario: "A parent asks about places for next term at 8pm.", steps: ["The agent answers from your approved admissions information", "Collects the child's age group and preferred start (no more than required)", "Books a tour or sends the application checklist", "Staff make every admissions decision"] },
      { title: "Fee reminders", scenario: "Term fees are due next week.", steps: ["The reminder agent sends your approved wording to parents", "Records promises to pay", "Escalates disputes to the bursar", "It does not change fee records or waive fees"] },
      { title: "Parent notices", scenario: "The school needs to announce a change of date.", steps: ["Staff approve the message", "The agent sends it through parents' preferred channels", "Delivery status is visible to the office"] },
    ],
    integrations: ["School management system (where an API or export exists)", "WhatsApp Business Platform", "SMS gateway", "Payment gateway", "Calendar", "Email"],
    safeguards: {
      title: "Safeguarding, privacy and access control",
      body: "Education agents are designed around safeguarding and privacy. Student and parent data is limited to what each role may see, welfare or safeguarding concerns are escalated immediately to your designated lead, and children's information is not sent to external AI providers without appropriate safeguards and authorisation. Controls are agreed with you before build.",
    },
    faqs: [
      { q: "How is children's data protected?", a: "Access is role-based, data collection is minimised and children's personal data is not shared with external AI providers without appropriate safeguards and authorisation. We agree the controls with your leadership before build." },
      { q: "What happens if a student raises a welfare concern?", a: "The agent does not handle it. It escalates immediately to your designated safeguarding lead according to your procedure." },
      { q: "Can it connect to our school management system?", a: "Where the system provides an API or export. We confirm this in scoping and say so in the proposal if it cannot." },
      { q: "How is pricing decided for a school or college?", a: "From RaveSoft's approved price list. If something is outside it, we flag it for manual review rather than guess." },
    ],
    cta: { primary: "Get My Free Education AI Assessment", secondary: "See Recommended AI Agents", closing: "Find out how much of your school's administration can be automated safely." },
    related: [{ label: "School management system", href: "/products/school" }, { label: "Business automation services", href: "/services/business-automation" }, { label: "Education industry solutions", href: "/industries/education" }],
    assessmentIntro: "Tell us about your institution's administration. Do not include student or parent personal details.",
  },
  questions: [
    sel("ed_type", "What type of institution do you run?", ["Nursery / early years", "Primary school", "Secondary school", "College / university", "Training institute", "Education group"], { required: true }),
    sel("ed_students", "How many students are enrolled?", ["Fewer than 100", "100–500", "501–2,000", "More than 2,000"], { required: true }),
    sel("ed_enquiries", "How many admissions enquiries do you receive per term?", ["Fewer than 25", "25–100", "101–500", "More than 500"], { required: true }),
    multi("ed_channels", "How do parents and students contact the school?", ["Phone", "WhatsApp", "Walk-in", "Email", "Website", "Social media"], { required: true }),
    sel("ed_fees", "How are fee reminders handled?", ["Bursar calls parents", "Messages sent manually", "System sends reminders", "Not done consistently"]),
    sel("ed_comms", "How do you communicate notices to parents?", ["WhatsApp groups", "SMS", "Printed letters", "School app / portal", "Mixed"]),
    multi("ed_admin", "Which administrative tasks take the most time?", ["Admissions", "Fee follow-up", "Parent communication", "Records and registers", "Reporting", "Timetabling"], { required: true }),
    text("ed_systems", "Which school management system do you use?", { placeholder: "Name of system, or 'none'" }),
  ],
};

const MANUFACTURING_IMG = IMG;
export const MANUFACTURING: IndustryConfig = {
  slug: "manufacturing", name: "Manufacturing", hasPage: false, sortOrder: 90, active: true,
  seo: { title: "Manufacturing AI Automation", description: "AI automation for manufacturers.", keywords: ["manufacturing AI automation"] },
  content: {
    shortName: "Manufacturing", icon: "Cog", audience: ["Manufacturers", "Processors", "Fabricators"],
    hero: { eyebrow: "Manufacturing", headline: "AI automation for manufacturers", subcopy: "Tell us how your production, ordering and customer processes run.", bullets: [], image: MANUFACTURING_IMG },
    problems: [], useCases: [], integrations: [], faqs: [],
    cta: { primary: "Get My Free AI Business Assessment", secondary: "Explore AI Automation Solutions", closing: "" }, related: [],
    assessmentIntro: "Tell us how your production, ordering and customer processes run.",
  },
  questions: [
    sel("mf_type", "What do you manufacture or process?", ["Food and beverage", "Building materials", "Textiles / apparel", "Packaging / plastics", "Agro-processing", "Other"], { required: true }),
    multi("mf_pain", "Which areas take the most manual effort?", ["Order intake", "Production scheduling", "Stock and raw materials", "Customer communication", "Quality records", "Reporting"], { required: true }),
  ],
};

export const OTHER: IndustryConfig = {
  slug: "other", name: "Other Industries", hasPage: false, sortOrder: 100, active: true,
  seo: { title: "AI Automation for Other Industries", description: "AI automation for businesses in any industry.", keywords: ["AI automation services"] },
  content: {
    shortName: "Other", icon: "Layers", audience: [],
    hero: { eyebrow: "Other industries", headline: "AI automation for your business", subcopy: "Tell us how your business runs and we will assess what can be automated.", bullets: [], image: MANUFACTURING_IMG },
    problems: [], useCases: [], integrations: [], faqs: [],
    cta: { primary: "Get My Free AI Business Assessment", secondary: "Explore AI Automation Solutions", closing: "" }, related: [],
    assessmentIntro: "Tell us how your business runs and we will assess what can be automated.",
  },
  questions: [
    text("ot_industry", "Which industry or sector are you in?", { required: true }),
  ],
};
