import { NextResponse } from "next/server";
import { guardForm, POLICIES } from "@/lib/antispam/guard";
import { LandingEnquirySchema, persistLandingEnquiry, recordNotifyFailure } from "@/lib/enquiry";
import { sendWebsiteLeadNotification } from "@/lib/mail/notifications";
import { BUSINESS_TYPES, solutionByValue } from "@/lib/getStarted";
import { clientIp } from "@/app/api/ai/_shared";

/** Friendly, field-level messages for the independent server-side validation. */
const FIELD_MESSAGES: Record<string, string> = {
  fullName: "Please enter your full name.",
  businessName: "Please enter your business name.",
  phone: "Enter a valid phone or WhatsApp number.",
  email: "Enter a valid email address.",
  businessType: "Please choose your business type.",
  solution: "Please choose the solution you need.",
  message: "Please keep this under 2000 characters.",
};

/**
 * POST /api/contact with formType "get_started".
 * Order: validate+sanitise (schema) → anti-spam guard → duplicate check → PERSIST → email → respond.
 * The lead is saved before the email is attempted. A failed save is an error (never a false success);
 * a failed email never loses the saved lead.
 */
export async function handleLandingLead(req: Request, body: unknown): Promise<NextResponse> {
  const parsed = LandingEnquirySchema.safeParse(body);
  if (!parsed.success) {
    const fields: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "");
      if (key in FIELD_MESSAGES && !fields[key]) fields[key] = FIELD_MESSAGES[key];
    }
    return NextResponse.json({ error: "Please check the highlighted fields.", code: "invalid", fields }, { status: 422 });
  }
  const e = parsed.data;

  const guard = await guardForm(POLICIES.getStarted, {
    ip: clientIp(req as never),
    email: e.email,
    name: e.fullName,
    company: e.businessName,
    message: e.message,
    honeypot: e.website,
    formToken: e.formToken,
    turnstileToken: e.turnstileToken,
  });
  if (!guard.ok) {
    // Bots that fill the honeypot get a fake success; nothing is stored or emailed.
    if (guard.silent) return NextResponse.json({ success: true, eventId: e.submissionId });
    return NextResponse.json({ error: guard.error, code: guard.reason }, { status: guard.status });
  }

  let saved;
  try {
    saved = await persistLandingEnquiry(e);
  } catch (err) {
    // Log the failure class only — never the visitor's details.
    console.error("[get-started] failed to save lead:", err instanceof Error ? err.name : "unknown");
    return NextResponse.json(
      { error: "We couldn't save your enquiry just now. Please try again in a moment, or message us on WhatsApp.", code: "persist_failed" },
      { status: 500 }
    );
  }

  // Duplicate: already saved (and already emailed) — report success without a second email.
  if (saved.duplicate) {
    return NextResponse.json({ success: true, eventId: e.submissionId, duplicate: saved.duplicateKind ?? "similar" });
  }

  const latest = e.attribution?.latest;
  const first = e.attribution?.first;
  const outcome = await sendWebsiteLeadNotification({
    leadId: saved.leadId,
    fullName: e.fullName,
    businessName: e.businessName,
    phone: e.phone,
    email: e.email,
    businessTypeLabel: BUSINESS_TYPES.find((b) => b.value === e.businessType)?.label ?? e.businessType,
    solutionLabel: solutionByValue(e.solution)?.label ?? e.solution,
    message: e.message,
    submittedAt: new Date().toISOString(),
    attribution: [
      { label: "Source", value: latest?.utm_source ?? first?.utm_source },
      { label: "Medium", value: latest?.utm_medium ?? first?.utm_medium },
      { label: "Campaign", value: latest?.utm_campaign ?? first?.utm_campaign },
      { label: "Content", value: latest?.utm_content ?? first?.utm_content },
      { label: "Term", value: latest?.utm_term ?? first?.utm_term },
      { label: "Facebook click ID", value: latest?.fbclid ?? first?.fbclid },
      { label: "First landing", value: first?.landingUrl },
      { label: "Latest landing", value: latest?.landingUrl ?? e.page },
      { label: "Referrer", value: latest?.referrer || e.referrer },
    ],
  });
  if (outcome !== "sent") {
    // The lead is safe in the database; flag that no email went out so the team knows to check /admin/leads.
    await recordNotifyFailure(saved.leadId, saved.contactId, new Error(outcome)).catch(() => undefined);
  }

  return NextResponse.json({ success: true, eventId: e.submissionId });
}
