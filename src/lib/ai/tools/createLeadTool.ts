import { prisma } from "@/lib/prisma";
import { Tool } from "./types";

/**
 * Creates (or reuses) a contact/company for the conversation and opens a
 * lead. Requires at least an email, phone, or WhatsApp number to avoid junk
 * leads.
 */
export const CreateLeadTool: Tool = {
  name: "CreateLeadTool",

  async execute(input) {
    const conversationId = input.conversation_id;

    if (typeof conversationId !== "number") {
      throw new Error("conversation_id is required.");
    }

    const email = typeof input.email === "string" ? input.email : undefined;
    const phone = typeof input.phone === "string" ? input.phone : undefined;
    const whatsapp = typeof input.whatsapp === "string" ? input.whatsapp : undefined;

    if (!email && !phone && !whatsapp) {
      throw new Error("At least one contact channel (email, phone, whatsapp) is required.");
    }

    const conversation = await prisma.conversation.findUniqueOrThrow({ where: { id: conversationId } });

    let companyId: number | undefined;
    if (typeof input.company === "string" && input.company.trim() !== "") {
      const companyName = input.company.trim();
      const existingCompany = await prisma.company.findFirst({ where: { name: companyName } });
      const company = existingCompany ?? (await prisma.company.create({ data: { name: companyName } }));
      companyId = company.id;
    }

    const contactData = {
      ...(companyId ? { companyId } : {}),
      ...(typeof input.first_name === "string" ? { firstName: input.first_name } : {}),
      ...(typeof input.last_name === "string" ? { lastName: input.last_name } : {}),
      ...(email ? { email } : {}),
      ...(phone ? { phone } : {}),
      ...(whatsapp ? { whatsapp } : {}),
      ...(typeof input.country === "string" ? { country: input.country } : {}),
    };

    let contactId = conversation.contactId ?? undefined;

    if (contactId) {
      await prisma.contact.update({ where: { id: contactId }, data: contactData });
    } else {
      const contact = await prisma.contact.create({ data: contactData });
      contactId = contact.id;
      await prisma.conversation.update({ where: { id: conversation.id }, data: { contactId } });
    }

    const existingLead = await prisma.lead.findUnique({ where: { conversationId: conversation.id } });

    const lead =
      existingLead ??
      (await prisma.lead.create({
        data: {
          contactId,
          companyId,
          conversationId: conversation.id,
          source: "website_chat",
          serviceInterest: typeof input.service_interest === "string" ? input.service_interest : undefined,
          stage: "new",
        },
      }));

    await prisma.conversionEvent.create({
      data: {
        contactId,
        leadId: lead.id,
        conversationId: conversation.id,
        eventType: "lead_created",
        occurredAt: new Date(),
      },
    });

    return { lead_id: lead.id, contact_id: contactId };
  },
};
