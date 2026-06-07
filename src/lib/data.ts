// ============================================================
// RaveSoft Digital Solutions – Site Content Constants
// ============================================================

export const COMPANY = {
  name: "RaveSoft Digital Solutions Ltd",
  shortName: "RaveSoft",
  tagline: "Software Solutions Built to Power Modern African Businesses",
  description:
    "RaveSoft Digital Solutions Ltd builds custom software, SaaS platforms, POS & ERP systems, mobile apps, AI automation, and premium websites for businesses across Ghana, Nigeria, Kenya, South Africa, Ivory Coast, Senegal, Tanzania, Uganda, Ethiopia, Rwanda, Cameroon, and all 54 African countries.",
  email: "info@ravesoftsolutions.com",
  phone: "0503319610",
  phoneGhana: "0503319610",
  phoneUS: "+1 (406) 518-6775",
  whatsapp: "+233503319610",
  location: "Accra, Ghana",
  website: "https://ravesoftsolutions.com",
  social: {
    twitter: "https://twitter.com/ravesoftsolutions",
    linkedin: "https://www.linkedin.com/company/ravesoft-digital-solutions/",
    instagram: "https://www.instagram.com/ravesoft_digital/",
    facebook: "https://www.facebook.com/ravesoftsolutions",
  },
};

export const NAV_LINKS = [
  { label: "Home", href: "/" },
  { label: "About", href: "/about" },
  { label: "Services", href: "/services" },
  { label: "Products", href: "/products" },
  { label: "Case Studies", href: "/case-studies" },
  { label: "Industries", href: "/industries" },
  { label: "Blog", href: "/blog" },
];

export const SERVICES = [
  {
    id: "custom-software",
    title: "Custom Software Development",
    slug: "custom-software",
    icon: "Code2",
    shortDescription:
      "ERP, CRM, dashboards, inventory systems, reporting tools, portals, booking systems, and workflow platforms built around your business operations.",
    description:
      "We design and build secure, scalable, and user-friendly software systems that help businesses manage operations, reduce manual work, improve visibility, and scale with confidence.",
    color: "blue",
    benefits: [
      "Built around your exact workflows and operations",
      "Reduces manual work and human error",
      "Scales as your business grows",
      "Full ownership — no recurring licence fees",
      "Ongoing support and improvements",
    ],
    whatWeBuild: [
      "ERP systems",
      "CRM systems",
      "Inventory management systems",
      "Booking and reservation systems",
      "Business dashboards and reporting platforms",
      "Workflow management tools",
      "Customer and supplier portals",
      "Internal admin tools",
      "Billing and invoicing systems",
    ],
    useCases: [
      "A retail business needs a custom inventory and sales system",
      "A hospital wants a patient management platform",
      "A logistics company needs a fleet and delivery management tool",
      "A school requires a custom admissions and fees portal",
    ],
  },
  {
    id: "saas-development",
    title: "SaaS Product Development",
    slug: "saas-development",
    icon: "Layers",
    shortDescription:
      "MVPs, subscription platforms, admin dashboards, multi-tenant apps, billing systems, onboarding flows, and scalable SaaS products.",
    description:
      "We help founders and companies design, build, and launch SaaS platforms with modern interfaces, subscription systems, dashboards, onboarding flows, and scalable architecture.",
    color: "purple",
    benefits: [
      "From idea to launched product with expert guidance",
      "Modern, scalable architecture from day one",
      "Subscription billing and payment integrations",
      "Multi-tenant support for serving many clients",
      "Built for growth and iteration",
    ],
    whatWeBuild: [
      "MVPs and proof-of-concept platforms",
      "Multi-tenant SaaS applications",
      "Subscription billing with Stripe or Paystack",
      "Admin dashboards and analytics",
      "User onboarding flows",
      "Team account management",
      "Usage tracking and reporting",
      "API integrations",
    ],
    useCases: [
      "A founder wants to launch a B2B SaaS for SMEs in Africa",
      "A company wants to productize an internal tool",
      "A startup needs an MVP to validate with investors",
    ],
  },
  {
    id: "website-design",
    title: "Website Design & Development",
    slug: "website-design",
    icon: "Globe",
    shortDescription:
      "Premium corporate websites, NGO websites, e-commerce stores, landing pages, and business websites built for trust, speed, SEO, and conversion.",
    description:
      "We design and develop modern websites that help companies look credible, communicate clearly, rank better, and convert visitors into leads and customers.",
    color: "green",
    benefits: [
      "Professionally designed to build trust and credibility",
      "Mobile-first and fast-loading for all devices",
      "SEO-optimised to rank on Google",
      "Clear messaging that converts visitors to leads",
      "Easy to manage and update",
    ],
    whatWeBuild: [
      "Corporate websites",
      "NGO and nonprofit websites",
      "E-commerce stores",
      "Product landing pages",
      "Portfolio websites",
      "Blog and news websites",
      "Multi-page business websites",
      "CMS-powered websites",
    ],
    useCases: [
      "An NGO needs a professional website with country pages",
      "A company wants a website that generates leads",
      "A hospital or school needs a modern digital presence",
    ],
  },
  {
    id: "mobile-apps",
    title: "Mobile App Development",
    slug: "mobile-apps",
    icon: "Smartphone",
    shortDescription:
      "Android and iOS apps for customer portals, staff operations, delivery workflows, bookings, and mobile-first business systems.",
    description:
      "We build Android and iOS apps for customers, staff, operations, bookings, delivery, reporting, and mobile-first business workflows.",
    color: "orange",
    benefits: [
      "Native performance on Android and iOS",
      "Tailored to your exact user workflows",
      "Offline capability where needed",
      "Secure and scalable backend integration",
      "App Store and Play Store deployment support",
    ],
    whatWeBuild: [
      "Customer-facing mobile apps",
      "Staff and operations apps",
      "Delivery and logistics apps",
      "Booking and appointment apps",
      "Internal business apps",
      "Mobile dashboards",
      "Payment-enabled applications",
    ],
    useCases: [
      "A delivery company needs a driver app with real-time tracking",
      "A hotel needs a guest app for bookings and room service",
      "A retailer wants a mobile app for customer orders",
    ],
  },
  {
    id: "business-automation",
    title: "Business Automation & AI",
    slug: "business-automation",
    icon: "Zap",
    shortDescription:
      "WhatsApp automation, CRM automation, AI workflows, reporting automation, customer support automation, and internal productivity systems.",
    description:
      "We help businesses automate manual tasks, connect systems, improve reporting, and use AI-powered workflows to save time and reduce operational errors.",
    color: "yellow",
    benefits: [
      "Eliminate repetitive manual tasks",
      "Improve accuracy and reduce human error",
      "Save hours of staff time every week",
      "Better reporting and business visibility",
      "AI-powered responses for customer interactions",
    ],
    whatWeBuild: [
      "WhatsApp automation workflows",
      "CRM automation and lead management",
      "Email and SMS automation",
      "Automated report generation",
      "AI customer support assistants",
      "Invoice and payment reminder automation",
      "Internal workflow and approval automation",
      "Data integration between tools and systems",
    ],
    useCases: [
      "A business wants WhatsApp to automatically respond to customer queries",
      "A sales team needs automated follow-ups and lead nurturing",
      "A company wants reports generated and sent automatically",
    ],
  },
  {
    id: "pos-erp",
    title: "POS & ERP Solutions",
    slug: "pos-erp",
    icon: "LayoutDashboard",
    shortDescription:
      "Retail POS, restaurant POS, hotel systems, school systems, hospital systems, inventory systems, accounting, HR, and reporting tools.",
    description:
      "We build and deploy POS, ERP, inventory, accounting, HR, school, hospital, hotel, and operational systems that give businesses better visibility and control over their operations.",
    color: "red",
    benefits: [
      "All operations in one connected system",
      "Real-time visibility across branches and departments",
      "Accurate inventory and financial reporting",
      "Reduced manual work and errors",
      "Scalable to multiple branches and teams",
    ],
    whatWeBuild: [
      "Retail and wholesale POS systems",
      "Restaurant and food service POS",
      "Hotel management systems",
      "School management systems",
      "Hospital management systems",
      "Custom ERP platforms",
      "Inventory management systems",
      "HR and payroll modules",
      "Accounting and financial reporting",
    ],
    useCases: [
      "A multi-branch retail store needs a unified POS and inventory system",
      "A hospital needs patient records, billing, and pharmacy in one system",
      "A school needs admissions, fees, and results management",
    ],
  },
];

export const PRODUCTS = [
  {
    id: "cliqpos",
    name: "CliqPOS",
    slug: "cliqpos",
    tagline: "Cloud POS and Business Management System",
    description:
      "Cloud POS and business management system for retail, wholesale, restaurants, supermarkets, pharmacies, and multi-branch businesses.",
    features: [
      "Sales tracking and receipts",
      "Inventory management",
      "Receipt printing and barcode support",
      "Multi-branch access and control",
      "Daily and monthly reports",
      "Customer and supplier management",
      "Staff accounts and permissions",
    ],
    industries: ["Retail", "Wholesale", "Restaurants", "Supermarkets", "Pharmacies"],
    cta: "Explore CliqPOS",
    href: "/products/cliqpos",
    badge: "Most Popular",
  },
  {
    id: "erp",
    name: "ERP System",
    slug: "erp",
    tagline: "Business Operations Platform",
    description:
      "Custom ERP systems for businesses that need sales, inventory, HR, accounting, procurement, customers, suppliers, and reporting in one place.",
    features: [
      "Sales and order management",
      "Inventory and procurement",
      "HR and staff management",
      "Accounting and financial reports",
      "Customer and supplier database",
      "Multi-department access",
    ],
    industries: ["Manufacturing", "Distribution", "Services", "Trading"],
    cta: "Learn More",
    href: "/products/erp",
  },
  {
    id: "hospital",
    name: "Hospital Management System",
    slug: "hospital",
    tagline: "End-to-End Healthcare Operations",
    description:
      "Patient records, billing, appointments, pharmacy, lab, staff management, and reporting for hospitals and clinics.",
    features: [
      "Patient registration and records",
      "Appointment scheduling",
      "Billing and payments",
      "Pharmacy management",
      "Lab results management",
      "Staff and doctor profiles",
    ],
    industries: ["Hospitals", "Clinics", "Medical Centres"],
    cta: "Learn More",
    href: "/products/hospital",
  },
  {
    id: "school",
    name: "School Management System",
    slug: "school",
    tagline: "Complete Academic Management",
    description:
      "Admissions, fees, attendance, results, parent communication, staff management, and administration for schools and colleges.",
    features: [
      "Student admissions and profiles",
      "Fee collection and receipts",
      "Attendance tracking",
      "Results and report cards",
      "Parent communication portal",
      "Staff and subject management",
    ],
    industries: ["Schools", "Colleges", "Training Centres"],
    cta: "Learn More",
    href: "/products/school",
  },
  {
    id: "hotel",
    name: "Hotel Management System",
    slug: "hotel",
    tagline: "Full Hotel Operations Control",
    description:
      "Bookings, rooms, guests, billing, housekeeping, reports, and staff operations for hotels and hospitality businesses.",
    features: [
      "Room booking and availability",
      "Guest check-in and check-out",
      "Billing and invoicing",
      "Housekeeping management",
      "Staff and operations control",
      "Revenue and occupancy reports",
    ],
    industries: ["Hotels", "Guest Houses", "Resorts", "Lodges"],
    cta: "Learn More",
    href: "/products/hotel",
  },
];

export const INDUSTRIES = [
  {
    id: "retail",
    name: "Retail & Wholesale",
    icon: "ShoppingCart",
    description:
      "POS, inventory, suppliers, customers, stock transfers, reports, and multi-branch control for retail businesses.",
    solutions: ["CliqPOS", "ERP System", "Custom Inventory"],
  },
  {
    id: "restaurants",
    name: "Restaurants & Food Service",
    icon: "UtensilsCrossed",
    description:
      "Kitchen orders, table management, fast checkout, inventory, staff, and daily reports for restaurants.",
    solutions: ["Restaurant POS", "Kitchen Display", "Inventory"],
  },
  {
    id: "healthcare",
    name: "Healthcare & Hospitals",
    icon: "Heart",
    description:
      "Patient records, appointments, billing, pharmacy, lab, staff, and complete reporting for hospitals and clinics.",
    solutions: ["Hospital Management System", "Pharmacy Module", "Billing"],
  },
  {
    id: "education",
    name: "Education & Schools",
    icon: "GraduationCap",
    description:
      "Admissions, fees, attendance, results, parent communication, staff, and administration for schools.",
    solutions: ["School Management System", "Results Portal", "Parent App"],
  },
  {
    id: "hotels",
    name: "Hotels & Hospitality",
    icon: "Building2",
    description:
      "Bookings, rooms, guests, billing, housekeeping, reports, and staff operations for hotels.",
    solutions: ["Hotel Management System", "Booking Engine", "Reports"],
  },
  {
    id: "ngos",
    name: "NGOs & Nonprofits",
    icon: "Globe2",
    description:
      "Modern websites, donor trust, program pages, publications, country pages, and impact reporting for NGOs.",
    solutions: ["Premium Website", "CMS", "Donation Integration"],
  },
  {
    id: "logistics",
    name: "Logistics & Transport",
    icon: "Truck",
    description:
      "Fleet management, delivery tracking, dispatch, driver apps, billing, and operations control.",
    solutions: ["Fleet System", "Driver App", "Delivery Tracking"],
  },
  {
    id: "real-estate",
    name: "Real Estate",
    icon: "Home",
    description:
      "Property listings, CRM, client management, contracts, payments, and agency reporting.",
    solutions: ["Property CRM", "Listings Website", "Client Portal"],
  },
  {
    id: "professional-services",
    name: "Professional Services",
    icon: "Briefcase",
    description:
      "Websites, CRM systems, client portals, booking systems, invoices, and automation for service businesses.",
    solutions: ["Business Website", "Client CRM", "Booking System"],
  },
  {
    id: "financial-services",
    name: "Financial Services",
    icon: "TrendingUp",
    description:
      "Secure platforms, client dashboards, reporting, compliance tools, and digital financial operations.",
    solutions: ["Custom Platform", "Reporting Dashboard", "Client Portal"],
  },
];

export const CASE_STUDIES = [
  {
    id: "cliqpos",
    title: "CliqPOS — Retail & Business Management Platform",
    slug: "cliqpos",
    industry: "Retail & Wholesale",
    tag: "Product",
    problem:
      "Many retailers were struggling with manual sales tracking, inventory errors, long queues, and poor visibility across branches.",
    solution:
      "RaveSoft built a cloud POS and business management system with sales tracking, inventory management, receipt printing, barcode support, reporting, and multi-branch access.",
    result: "500+ businesses across Ghana and Nigeria use CliqPOS to manage daily operations.",
    features: [
      "Cloud POS with offline support",
      "Real-time inventory tracking",
      "Multi-branch management",
      "Barcode and receipt printing",
      "Daily and monthly reports",
    ],
    technologies: ["Laravel", "Livewire", "MySQL", "Tailwind CSS", "REST API"],
    impact: "500+ businesses",
  },
  {
    id: "ngo-website",
    title: "NGO Regional Website & Digital Platform",
    slug: "ngo-website",
    industry: "NGOs & Nonprofits",
    tag: "Website",
    problem:
      "An international organization needed a premium, unified digital presence with country-level structure, modern content management, and improved donor trust.",
    solution:
      "RaveSoft designed a modern regional platform with responsive layouts, country navigation, content migration, performance optimization, and custom extensions.",
    result:
      "Improved brand consistency, easier content management, stronger online credibility, and reduced dependency on paid plugins.",
    features: [
      "Responsive multi-country platform",
      "Custom CMS and content management",
      "SEO and performance optimization",
      "Country-level navigation structure",
      "Modern donation-focused design",
    ],
    technologies: ["Next.js", "TypeScript", "Tailwind CSS", "Headless CMS"],
    impact: "Improved credibility",
  },
  {
    id: "erp-system",
    title: "Custom Business ERP System",
    slug: "erp-system",
    industry: "Business Operations",
    tag: "Software",
    problem:
      "A growing business needed to replace spreadsheets and manual processes with a centralized system for managing operations.",
    solution:
      "RaveSoft built a custom ERP platform for inventory, sales, customers, staff, reports, and complete business operations.",
    result:
      "Improved visibility, faster reporting, reduced manual errors, and better operational control across departments.",
    features: [
      "Sales and inventory management",
      "Customer and supplier database",
      "HR and staff management",
      "Financial reporting",
      "Role-based user access",
    ],
    technologies: ["Laravel", "Vue.js", "MySQL", "REST API", "Tailwind CSS"],
    impact: "Faster operations",
  },
  {
    id: "hotel-system",
    title: "Hotel Management System",
    slug: "hotel-system",
    industry: "Hotels & Hospitality",
    tag: "Software",
    problem:
      "A hospitality business was managing bookings manually, leading to double bookings, billing errors, and poor guest experience.",
    solution:
      "RaveSoft built a complete hotel management system covering bookings, guest check-in, billing, housekeeping, and management reports.",
    result:
      "Eliminated booking errors, reduced check-in time, improved staff coordination, and increased guest satisfaction.",
    features: [
      "Room booking and availability calendar",
      "Guest management",
      "Billing and receipts",
      "Housekeeping scheduling",
      "Management and revenue reports",
    ],
    technologies: ["Laravel", "Livewire", "MySQL", "Tailwind CSS"],
    impact: "Zero booking errors",
  },
  {
    id: "hospital-system",
    title: "Hospital Management System",
    slug: "hospital-system",
    industry: "Healthcare",
    tag: "Software",
    problem:
      "A hospital was handling patient records, billing, and pharmacy using manual registers, leading to errors and slow service.",
    solution:
      "RaveSoft built a hospital management system covering patient registration, appointments, billing, pharmacy, lab results, and reporting.",
    result:
      "Faster patient service, accurate billing, better record keeping, and improved operational efficiency.",
    features: [
      "Patient registration and history",
      "Appointment scheduling",
      "Billing and payments",
      "Pharmacy module",
      "Lab results management",
    ],
    technologies: ["Laravel", "MySQL", "Tailwind CSS", "Livewire"],
    impact: "Faster patient service",
  },
  {
    id: "school-system",
    title: "School Management System",
    slug: "school-system",
    industry: "Education",
    tag: "Software",
    problem:
      "A school was managing admissions, fees, attendance, and results with paper registers and spreadsheets.",
    solution:
      "RaveSoft built a school management system for admissions, fee collection, attendance, results, parent communication, and staff management.",
    result:
      "Streamlined school administration, faster fee collection, easier results management, and better parent communication.",
    features: [
      "Student admissions and profiles",
      "Fee collection and receipts",
      "Attendance tracking",
      "Results and report cards",
      "Parent communication portal",
    ],
    technologies: ["Laravel", "MySQL", "Tailwind CSS", "Livewire"],
    impact: "Streamlined admin",
  },
  {
    id: "splendy-mart",
    title: "Splendy Mart — Multi-Branch POS & Retail Management",
    slug: "splendy-mart",
    industry: "Retail & Supermarkets",
    tag: "Software",
    problem:
      "Splendy Mart, a growing supermarket with branches across Accra and Tema, was struggling with inaccurate stock tracking, slow checkout queues, theft, and zero visibility across branches. Sales were recorded manually, stock counts drifted daily, and managers had no real-time data to act on.",
    solution:
      "RaveSoft deployed a full retail POS and management system across all Splendy Mart branches, with centralised inventory tracking, barcode-based checkout, real-time branch dashboards, theft alert triggers, and automated daily reconciliation.",
    result:
      "Faster checkout at every register, significant reduction in stock discrepancies and theft incidents, and full real-time visibility across all Accra and Tema branches from a single management dashboard.",
    features: [
      "Multi-branch POS with real-time sync",
      "Barcode scanning for fast checkout",
      "Centralised inventory management",
      "Stock discrepancy and theft alerts",
      "Branch-level sales and performance reporting",
      "Automated end-of-day reconciliation",
    ],
    technologies: ["Laravel", "Livewire", "MySQL", "Tailwind CSS", "REST API"],
    impact: "Faster checkout & zero stock gaps",
  },
  {
    id: "mobile-doctors",
    title: "Mobile Doctors Ltd — Pharmacy Management System",
    slug: "mobile-doctors",
    industry: "Healthcare & Pharmacy",
    tag: "Software",
    problem:
      "Mobile Doctors Ltd in Spintex, Accra was managing pharmacy inventory and sales manually, leading to stock errors, missed expiry tracking, slow counter service, and no reliable reporting for the pharmacy manager.",
    solution:
      "RaveSoft built a complete pharmacy management system covering stock and inventory management, counter sales and billing, expiry date tracking with automatic alerts, supplier and purchase management, and daily and monthly sales reporting.",
    result:
      "Smooth, efficient daily pharmacy operations with accurate stock tracking, faster patient service at the counter, and elimination of manual reconciliation errors.",
    features: [
      "Pharmacy stock and inventory management",
      "Counter sales and billing",
      "Expiry date tracking and automated alerts",
      "Supplier and purchase management",
      "Daily and monthly sales reports",
      "Role-based staff access control",
    ],
    technologies: ["Laravel", "Livewire", "MySQL", "Tailwind CSS"],
    impact: "Smooth & accurate pharmacy operations",
  },
];

export const PROCESS_STEPS = [
  {
    step: "01",
    title: "Discover",
    description:
      "We understand your business, goals, workflows, users, and pain points before touching a single line of code.",
    icon: "Search",
  },
  {
    step: "02",
    title: "Strategy",
    description:
      "We define the right technology approach, features, structure, roadmap, and success metrics for your project.",
    icon: "Map",
  },
  {
    step: "03",
    title: "Design",
    description:
      "We create clean, modern, user-friendly interfaces focused on usability, clarity, and conversion.",
    icon: "PenTool",
  },
  {
    step: "04",
    title: "Build",
    description:
      "We develop scalable, secure, and maintainable systems using modern technologies and best practices.",
    icon: "Code2",
  },
  {
    step: "05",
    title: "Launch",
    description:
      "We deploy, test, optimize, train your team, and prepare the system for real users and real traffic.",
    icon: "Rocket",
  },
  {
    step: "06",
    title: "Support",
    description:
      "We provide ongoing support, improvements, maintenance, and growth guidance after launch.",
    icon: "HeartHandshake",
  },
];

export const TECH_STACK = [
  { name: "Next.js", category: "Frontend" },
  { name: "React", category: "Frontend" },
  { name: "TypeScript", category: "Frontend" },
  { name: "Tailwind CSS", category: "Frontend" },
  { name: "Laravel", category: "Backend" },
  { name: "Livewire", category: "Backend" },
  { name: "MySQL", category: "Database" },
  { name: "PostgreSQL", category: "Database" },
  { name: "REST APIs", category: "Integration" },
  { name: "Secure Payments", category: "Mobile Money + Card" },
  { name: "Cloud Hosting", category: "Infrastructure" },
  { name: "AI Workflows", category: "Automation" },
  { name: "WhatsApp API", category: "Integration" },
  { name: "Analytics", category: "Reporting" },
];

export const WHY_RAVESOFT = [
  {
    title: "Business-first thinking",
    description:
      "We understand your operations, goals, customers, and growth challenges before writing a single line of code. Technology is just the tool — solving your problem is the goal.",
    icon: "Target",
  },
  {
    title: "Built around your workflow",
    description:
      "We build around how your business actually works, not the other way around. No forcing your processes into a generic template.",
    icon: "Wrench",
  },
  {
    title: "Products from real experience",
    description:
      "We've built and operated real software products used daily by businesses across Africa — so we know what it takes to build systems that actually work in the real world.",
    icon: "Package",
  },
  {
    title: "Deep African market knowledge",
    description:
      "We understand the operational realities of businesses in Ghana, Nigeria, Kenya, South Africa, and every African market — the infrastructure, the people, and what makes software work here.",
    icon: "Globe",
  },
  {
    title: "Built to grow with you",
    description:
      "We build systems designed to scale — from 10 users to 10,000, from one branch to fifty, from your first product to your next funding round.",
    icon: "TrendingUp",
  },
  {
    title: "Long-term partnership",
    description:
      "We don't disappear after delivery. We support, improve, and evolve your system as your business grows — because your success is how we measure ours.",
    icon: "Shield",
  },
];

export const PROOF_ITEMS = [
  { value: "500+", label: "Businesses running on systems we built" },
  { value: "20+", label: "Industries served across Africa" },
  { value: "40+", label: "African countries we actively serve" },
  { value: "5+", label: "Ready-to-deploy software products" },
  { value: "End-to-end", label: "Strategy, design, build, and support" },
];

export const BLOG_POSTS = [
  {
    id: "custom-software-manual-work",
    title: "How Custom Software Helps Businesses Reduce Manual Work",
    slug: "how-custom-software-helps-businesses-reduce-manual-work",
    excerpt:
      "Most businesses lose hours every week to manual processes, spreadsheets, and disconnected tools. Here's how custom software changes that.",
    category: "Software Development",
    readTime: "5 min read",
    date: "April 2026",
    author: "RaveSoft Team",
  },
  {
    id: "cloud-pos-retail",
    title: "Why Every Growing Retail Business Needs a Cloud POS System",
    slug: "why-every-growing-retail-business-needs-a-cloud-pos",
    excerpt:
      "Retail businesses that still rely on manual sales tracking and paper stock records are losing time, money, and visibility. Here's what a cloud POS changes.",
    category: "POS & ERP",
    readTime: "4 min read",
    date: "March 2026",
    author: "RaveSoft Team",
  },
  {
    id: "business-automation-hours",
    title: "How Business Automation Can Save Your Team Hours Every Week",
    slug: "how-business-automation-saves-hours-every-week",
    excerpt:
      "Automation is no longer reserved for large enterprises. Here's how small and medium businesses are using automation to reclaim their time.",
    category: "Business Automation",
    readTime: "6 min read",
    date: "March 2026",
    author: "RaveSoft Team",
  },
  {
    id: "saas-product-considerations",
    title: "What to Consider Before Building a SaaS Product",
    slug: "what-to-consider-before-building-a-saas-product",
    excerpt:
      "Building a SaaS product is one of the best ways to create recurring revenue — but only if you start with the right foundation. Here's what to think about.",
    category: "SaaS",
    readTime: "7 min read",
    date: "February 2026",
    author: "RaveSoft Team",
  },
  {
    id: "website-features-2026",
    title: "Website Features Every Serious Company Needs in 2026",
    slug: "website-features-every-serious-company-needs-2026",
    excerpt:
      "A company website today is more than a digital brochure. It's your sales team, your credibility builder, and your lead generation engine. Here's what it needs.",
    category: "Websites & SEO",
    readTime: "5 min read",
    date: "February 2026",
    author: "RaveSoft Team",
  },
  {
    id: "erp-vs-spreadsheets",
    title: "ERP vs Spreadsheets: When Your Business Should Upgrade",
    slug: "erp-vs-spreadsheets-when-to-upgrade",
    excerpt:
      "Spreadsheets are where most businesses start. But there's a point where they become a liability. Here's how to know when it's time to move to an ERP.",
    category: "POS & ERP",
    readTime: "6 min read",
    date: "January 2026",
    author: "RaveSoft Team",
  },
  {
    id: "best-pos-system-ghana-2026",
    title: "Best POS System for Retail Businesses in Ghana (2026 Review)",
    slug: "best-pos-system-ghana-2026",
    excerpt:
      "Looking for the best POS system in Ghana? We compare the top options for retail businesses — covering features, offline mode, multi-branch support, and pricing — so you can make the right choice.",
    category: "POS & ERP",
    readTime: "8 min read",
    date: "May 2026",
    author: "RaveSoft Team",
  },
  {
    id: "best-software-companies-ghana-2026",
    title: "Best Software Companies in Ghana 2026: Top 5 Reviewed",
    slug: "best-software-companies-ghana-2026",
    excerpt:
      "Which software company in Ghana should you trust with your business? We break down the top 5, what they're best at, and why RaveSoft stands out for businesses that need more than just a website.",
    category: "Software Development",
    readTime: "7 min read",
    date: "May 2026",
    author: "RaveSoft Team",
  },
  {
    id: "custom-software-cost-ghana",
    title: "How Much Does Custom Software Development Cost in Ghana? (2026 Guide)",
    slug: "custom-software-development-cost-ghana",
    excerpt:
      "Transparent pricing breakdown for websites, custom software, SaaS platforms, mobile apps, and ERP systems in Ghana. What affects cost, what to avoid, and how to get the most from your budget.",
    category: "Software Development",
    readTime: "6 min read",
    date: "May 2026",
    author: "RaveSoft Team",
  },
  {
    id: "best-hospital-management-system-nigeria-ghana",
    title: "Best Hospital Management System in Nigeria and Ghana (2026)",
    slug: "best-hospital-management-system-nigeria-ghana",
    excerpt:
      "A complete guide to choosing hospital management software for clinics and hospitals in Nigeria and Ghana — covering patient records, billing, pharmacy, lab, and what to look for before you buy.",
    category: "Healthcare Software",
    readTime: "7 min read",
    date: "April 2026",
    author: "RaveSoft Team",
  },
  {
    id: "best-school-management-system-ghana-nigeria",
    title: "Best School Management System in Ghana and Nigeria (2026 Guide)",
    slug: "best-school-management-system-ghana-nigeria",
    excerpt:
      "A practical buyer's guide for school management software in West Africa. What features matter, what questions to ask vendors, and which system schools are choosing in 2026.",
    category: "Education Software",
    readTime: "7 min read",
    date: "April 2026",
    author: "RaveSoft Team",
  },
  {
    id: "hotel-management-system-africa-2026",
    title: "Hotel Management System for African Hotels: Complete 2026 Guide",
    slug: "hotel-management-system-africa-2026",
    excerpt:
      "From small guesthouses to multi-property hotels across Ghana, Nigeria, and Kenya — this guide covers everything you need to know about hotel management software in Africa.",
    category: "Hospitality Software",
    readTime: "7 min read",
    date: "March 2026",
    author: "RaveSoft Team",
  },
  {
    id: "hr-payroll-software-ghana-nigeria",
    title: "Best HR and Payroll Software for Businesses in Ghana and Nigeria (2026)",
    slug: "hr-payroll-software-ghana-nigeria-2026",
    excerpt:
      "Managing staff, attendance, leave, and payroll manually is costing your business time and money. Here's how to choose the right HR and payroll software for your team size and budget.",
    category: "HR & Payroll",
    readTime: "6 min read",
    date: "March 2026",
    author: "RaveSoft Team",
  },
  {
    id: "ravesoft-best-software-company-africa",
    title: "Why RaveSoft Is the Best Software Company for African Businesses in 2026",
    slug: "why-ravesoft-best-software-company-africa",
    excerpt:
      "What makes RaveSoft different from other software companies in Ghana and Africa? Deep domain expertise, products built from real operational experience, and a track record across 54 countries.",
    category: "About RaveSoft",
    readTime: "5 min read",
    date: "May 2026",
    author: "RaveSoft Team",
  },
];

export const PROJECT_TYPES = [
  "Website",
  "Custom Software",
  "SaaS Product",
  "Mobile App",
  "POS / ERP",
  "Automation",
  "IT Support",
  "Other",
];

export const BUDGET_RANGES = [
  "Below $1,000",
  "$1,000 – $3,000",
  "$3,000 – $10,000",
  "$10,000 – $25,000",
  "$25,000+",
];

export const TESTIMONIALS = [
  {
    id: 1,
    name: "Kwame Asante",
    role: "Owner",
    company: "Asante Retail Group",
    location: "Kumasi, Ghana",
    avatar: "KA",
    avatarColor: "#3b82f6",
    rating: 5,
    text: "CliqPOS transformed how we run our 3 retail branches. Sales reports that used to take hours now happen instantly. We caught a stock discrepancy in week one that saved us over GH₵12,000.",
    product: "CliqPOS",
  },
  {
    id: 2,
    name: "Dr. Amina Bello",
    role: "Medical Director",
    company: "Bello Medical Centre",
    location: "Abuja, Nigeria",
    avatar: "AB",
    avatarColor: "#ef4444",
    rating: 5,
    text: "Our Hospital Management System handles patient records, billing, lab, and pharmacy in one place. We've eliminated paper files entirely. RaveSoft's support team is always available when we need them.",
    product: "Hospital System",
  },
  {
    id: 3,
    name: "James Kariuki",
    role: "Director",
    company: "Kariuki Academy Group",
    location: "Nairobi, Kenya",
    avatar: "JK",
    avatarColor: "#10b981",
    rating: 5,
    text: "The school management system handles our 4 campuses seamlessly — admissions, fees, results, and parent communication all automated. Parents love the updates on their phones. Worth every cent.",
    product: "School System",
  },
  {
    id: 4,
    name: "Fatima Mensah",
    role: "General Manager",
    company: "Palm View Hotel",
    location: "Accra, Ghana",
    avatar: "FM",
    avatarColor: "#8b5cf6",
    rating: 5,
    text: "Bookings, housekeeping, billing, and guest management — all in one dashboard. Overbookings dropped to zero after we switched. RaveSoft actually listened to how hotels work before building anything.",
    product: "Hotel System",
  },
  {
    id: 5,
    name: "Emmanuel Osei",
    role: "CEO",
    company: "Osei Manufacturing Ltd",
    location: "Tema, Ghana",
    avatar: "EO",
    avatarColor: "#f97316",
    rating: 5,
    text: "We replaced 5 separate spreadsheets with RaveSoft's ERP. Procurement, inventory, sales, and HR are now connected. Our team spends less time on admin and more time on what actually matters.",
    product: "ERP System",
  },
  {
    id: 6,
    name: "Sandra Acheampong",
    role: "HR Manager",
    company: "BuildRight Construction",
    location: "Accra, Ghana",
    avatar: "SA",
    avatarColor: "#f59e0b",
    rating: 5,
    text: "Payroll used to take 3 days every month. Now it takes 30 minutes. Staff attendance, leave tracking, payslips — all automated. No more payroll errors, no more complaints from staff.",
    product: "HR & Payroll",
  },
];

export const FAQ_ITEMS = [
  {
    question: "How much does a project cost?",
    answer:
      "Every project is scoped to your goals, features, and complexity. Book a free consultation and we'll send a clear, fixed quote within 24 hours — no pressure, no obligation.",
  },
  {
    question: "How long does it take to deliver a project?",
    answer:
      "A standard website takes 1–3 weeks. A custom software system typically takes 4–12 weeks depending on complexity. Our off-the-shelf products (CliqPOS, Hotel System, etc.) can be set up and live within 1–5 business days. We provide a clear timeline before we start every project.",
  },
  {
    question: "Do you provide support after the project is delivered?",
    answer:
      "Yes. All our projects come with a post-launch support period. We also offer ongoing monthly maintenance and support packages. Our team is reachable by WhatsApp, email, and phone — we don't disappear after delivery.",
  },
  {
    question: "Can you work with my existing systems or data?",
    answer:
      "Absolutely. We regularly integrate with existing databases, ERPs, payment gateways, accounting tools, and third-party APIs. If you have existing data (e.g. a spreadsheet or old system), we can migrate it into your new platform.",
  },
  {
    question: "Do you work with businesses outside Ghana?",
    answer:
      "Yes — we serve businesses across all 54 African countries and internationally. We have clients in Nigeria, Kenya, South Africa, Ivory Coast, the UK, and the US. All project communication, meetings, and support happen remotely with no issues.",
  },
  {
    question: "Who owns the code and software after delivery?",
    answer:
      "You do. For custom-built projects, full source code and intellectual property is transferred to you on final delivery. You're never locked into paying us ongoing licence fees for your own software.",
  },
  {
    question: "What if I'm not sure exactly what I need?",
    answer:
      "That's completely normal. Book a free consultation call and we'll help you define the right solution for your business, your team size, your budget, and your goals. No obligation, no pressure.",
  },
  {
    question: "Do you build mobile apps?",
    answer:
      "Yes. We build iOS and Android apps using React Native, giving you a single codebase for both platforms. We've built customer apps, staff apps, delivery tracking apps, and companion apps for our software products.",
  },
];

export const FOOTER_LINKS = {
  services: [
    { label: "Custom Software", href: "/services/custom-software" },
    { label: "SaaS Development", href: "/services/saas-development" },
    { label: "Website Design", href: "/services/website-design" },
    { label: "Mobile Apps", href: "/services/mobile-apps" },
    { label: "Business Automation", href: "/services/business-automation" },
    { label: "POS & ERP", href: "/services/pos-erp" },
  ],
  products: [
    { label: "CliqPOS", href: "/products/cliqpos" },
    { label: "ERP System", href: "/products/erp" },
    { label: "Hospital System", href: "/products/hospital" },
    { label: "School System", href: "/products/school" },
    { label: "Hotel System", href: "/products/hotel" },
  ],
  company: [
    { label: "About Us", href: "/about" },
    { label: "Case Studies", href: "/case-studies" },
    { label: "Industries", href: "/industries" },
    { label: "Blog", href: "/blog" },
    { label: "Contact", href: "/contact" },
    { label: "Book Consultation", href: "/book-consultation" },
  ],
};
