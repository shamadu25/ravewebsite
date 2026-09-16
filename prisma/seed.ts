import { PrismaClient } from "@prisma/client";
import { COMPANY, SERVICES, PRODUCTS, FAQ_ITEMS } from "../src/lib/data";
import { AGENT_KEY, DEFAULT_PROMPT } from "../src/lib/ai/agent/raveConcierge";

const prisma = new PrismaClient();

const INTENTS: Record<string, string> = {
  ai_agent: "AI Agent",
  ai_employee: "AI Employee",
  whatsapp_automation: "WhatsApp Automation",
  sales_automation: "Sales Automation",
  customer_service_automation: "Customer Service Automation",
  business_process_automation: "Business Process Automation",
  custom_ai_solution: "Custom AI Solution",
  website_development: "Website Development",
  custom_software: "Custom Software",
  saas_development: "SaaS Development",
  cliqpos: "CliqPOS",
  retail_pos: "Retail POS",
  pharmacy_pos: "Pharmacy POS",
  restaurant_pos: "Restaurant POS",
  hotel_management: "Hotel Management",
  erp: "ERP",
  inventory_management: "Inventory Management",
  pricing: "Pricing",
  demo_request: "Demo Request",
  consultation_request: "Consultation Request",
  existing_customer_support: "Existing Customer Support",
  technical_support: "Technical Support",
  billing: "Billing",
  partnership: "Partnership",
  reseller: "Reseller",
  careers: "Careers",
  general_enquiry: "General Enquiry",
  spam: "Spam",
  unknown: "Unknown",
};

async function seedIntents() {
  for (const [key, label] of Object.entries(INTENTS)) {
    await prisma.intent.upsert({ where: { key }, update: {}, create: { key, label } });
  }
}

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

async function upsertDoc(category: string, title: string, content: string, approvedBy = "system") {
  await prisma.knowledgeDocument.upsert({
    where: { slug: slugify(title) },
    update: { title, category, content, status: "published", approvedBy },
    create: {
      title,
      slug: slugify(title),
      category,
      content,
      status: "published",
      source: "src/lib/data.ts",
      approvedBy,
    },
  });
}

async function seedKnowledge() {
  await upsertDoc(
    "company",
    "About RaveSoft Digital Solutions Ltd",
    `${COMPANY.description} Based in ${COMPANY.location}. Contact: ${COMPANY.email}, phone ${COMPANY.phone}, WhatsApp ${COMPANY.whatsapp}.`
  );

  for (const service of SERVICES) {
    await upsertDoc(
      "services",
      service.title,
      `${service.description} Benefits: ${service.benefits.join(", ")}. What we build: ${service.whatWeBuild.join(", ")}. Example use cases: ${service.useCases.join(" | ")}`
    );
  }

  for (const product of PRODUCTS) {
    await upsertDoc(
      product.slug,
      `${product.name} — ${product.tagline}`,
      `${product.description} Features: ${product.features.join(", ")}. Industries: ${product.industries.join(", ")}.`
    );
  }

  for (const faq of FAQ_ITEMS) {
    await upsertDoc("faq", `FAQ: ${faq.question}`, faq.answer);
  }
}

async function seedPrompt() {
  const existing = await prisma.aiPrompt.findUnique({
    where: { agentKey: AGENT_KEY },
    include: { versions: { where: { status: "production" } } },
  });

  if (existing && existing.versions.length > 0) {
    return;
  }

  const prompt = await prisma.aiPrompt.upsert({
    where: { agentKey: AGENT_KEY },
    update: {},
    create: { agentKey: AGENT_KEY, name: "Rave Concierge" },
  });

  await prisma.aiPromptVersion.create({
    data: {
      aiPromptId: prompt.id,
      version: 1,
      content: DEFAULT_PROMPT,
      status: "production",
      createdBy: "system",
      approvedBy: "system",
      publishedAt: new Date(),
    },
  });
}

async function main() {
  await seedIntents();
  await seedKnowledge();
  await seedPrompt();
  console.log("Seed complete.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
