import { createHmac, timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  sendConsultationBookedNotification,
  sendConsultationCanceledNotification,
} from "@/lib/mail/notifications";

const SIGNATURE_TOLERANCE_SECONDS = 300;

interface CalendlyInviteePayload {
  email?: string;
  name?: string;
  first_name?: string | null;
  last_name?: string | null;
  event?: string;
  rescheduled?: boolean;
  tracking?: {
    utm_source?: string | null;
    utm_medium?: string | null;
    utm_campaign?: string | null;
    utm_content?: string | null;
    utm_term?: string | null;
  };
}

interface CalendlyWebhookBody {
  event?: string;
  payload?: CalendlyInviteePayload;
}

/** Verifies Calendly's HMAC-SHA256 webhook signature (v1 scheme):
 * header is "t=<unix_ts>,v1=<hex_signature>", computed over "<ts>.<raw_body>". */
function verifySignature(rawBody: string, signatureHeader: string | null, signingKey: string): boolean {
  if (!signatureHeader) return false;

  const parts = Object.fromEntries(
    signatureHeader.split(",").map((part) => {
      const [key, value] = part.split("=");
      return [key, value];
    })
  );

  const timestamp = parts.t;
  const signature = parts.v1;
  if (!timestamp || !signature) return false;

  const age = Math.abs(Date.now() / 1000 - Number(timestamp));
  if (!Number.isFinite(age) || age > SIGNATURE_TOLERANCE_SECONDS) return false;

  const expected = createHmac("sha256", signingKey).update(`${timestamp}.${rawBody}`).digest("hex");

  const expectedBuf = Buffer.from(expected, "hex");
  const signatureBuf = Buffer.from(signature, "hex");
  if (expectedBuf.length !== signatureBuf.length) return false;

  return timingSafeEqual(expectedBuf, signatureBuf);
}

function splitName(name: string): { firstName?: string; lastName?: string } {
  const trimmed = name.trim();
  if (!trimmed) return {};
  const [first, ...rest] = trimmed.split(/\s+/);
  return { firstName: first, lastName: rest.length ? rest.join(" ") : undefined };
}

export async function POST(request: NextRequest) {
  const signingKey = process.env.CALENDLY_WEBHOOK_SIGNING_KEY;
  const rawBody = await request.text();

  if (!signingKey) {
    console.error("[calendly webhook] CALENDLY_WEBHOOK_SIGNING_KEY not configured — rejecting.");
    return NextResponse.json({ error: "Webhook not configured." }, { status: 503 });
  }

  const signatureHeader = request.headers.get("calendly-webhook-signature");
  if (!verifySignature(rawBody, signatureHeader, signingKey)) {
    return NextResponse.json({ error: "Invalid signature." }, { status: 401 });
  }

  let body: CalendlyWebhookBody;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const eventType = body.event;
  const payload = body.payload;

  if (!payload?.email || (eventType !== "invitee.created" && eventType !== "invitee.canceled")) {
    // Acknowledge anything we don't act on so Calendly doesn't retry forever.
    return NextResponse.json({ ok: true, ignored: true });
  }

  const email = payload.email.trim().toLowerCase();
  const displayName = payload.name?.trim() || email;
  const { firstName, lastName } = splitName(payload.name ?? "");
  const tracking = payload.tracking ?? {};

  // Contact.email has no unique constraint, so match manually rather than upsert.
  const existingContact = await prisma.contact.findFirst({ where: { email } });
  const contact = existingContact
    ? await prisma.contact.update({
        where: { id: existingContact.id },
        data: {
          ...(firstName ? { firstName } : {}),
          ...(lastName ? { lastName } : {}),
          consentEmail: true,
        },
      })
    : await prisma.contact.create({
        data: {
          email,
          firstName: firstName ?? payload.first_name ?? undefined,
          lastName: lastName ?? payload.last_name ?? undefined,
          consentEmail: true,
        },
      });

  const existingLead = await prisma.lead.findFirst({
    where: { contactId: contact.id },
    orderBy: { updatedAt: "desc" },
  });

  const stage = eventType === "invitee.created" ? "consultation_booked" : "consultation_canceled";

  const lead =
    existingLead != null
      ? await prisma.lead.update({ where: { id: existingLead.id }, data: { stage } })
      : eventType === "invitee.created"
        ? await prisma.lead.create({
            data: { contactId: contact.id, source: "calendly_booking", stage },
          })
        : null;

  await prisma.conversionEvent.create({
    data: {
      contactId: contact.id,
      leadId: lead?.id,
      eventType: eventType === "invitee.created" ? "consultation_booked" : "consultation_canceled",
      metadata: {
        calendlyEvent: eventType,
        rescheduled: Boolean(payload.rescheduled),
        utmSource: tracking.utm_source ?? null,
        utmMedium: tracking.utm_medium ?? null,
        utmCampaign: tracking.utm_campaign ?? null,
        utmContent: tracking.utm_content ?? null,
        utmTerm: tracking.utm_term ?? null,
      },
      occurredAt: new Date(),
    },
  });

  if (eventType === "invitee.created") {
    await sendConsultationBookedNotification({
      leadId: lead?.id ?? null,
      contactName: displayName,
      contactEmail: email,
      eventName: null,
      startTime: null,
      isReschedule: Boolean(payload.rescheduled),
    });
  } else {
    await sendConsultationCanceledNotification({
      leadId: lead?.id ?? null,
      contactName: displayName,
      contactEmail: email,
      eventName: null,
    });
  }

  return NextResponse.json({ ok: true });
}
