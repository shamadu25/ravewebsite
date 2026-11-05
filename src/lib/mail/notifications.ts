import { getMailTransporter, isMailConfigured, notificationRecipient } from "./transporter";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://ravesoftsolutions.com";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Strips CR/LF so lead-supplied text can never inject extra headers into
 * the outgoing notification email via the subject line. */
function sanitizeHeaderValue(value: string): string {
  return value.replace(/[\r\n]+/g, " ").trim();
}

function wrapper(title: string, subtitle: string, bodyHtml: string): string {
  return `
    <div style="font-family:system-ui,sans-serif;max-width:600px;margin:0 auto;padding:24px;background:#f8fafc;border-radius:12px;">
      <div style="background:#050816;padding:24px;border-radius:8px;margin-bottom:24px;">
        <h1 style="color:#fff;margin:0;font-size:20px;">${title}</h1>
        <p style="color:#94a3b8;margin:6px 0 0;font-size:14px;">${subtitle}</p>
      </div>
      ${bodyHtml}
      <p style="margin-top:24px;color:#94a3b8;font-size:12px;text-align:center;">RaveSoft AI Agent · ${APP_URL}/admin</p>
    </div>
  `;
}

function row(label: string, value: string): string {
  return `<tr><td style="padding:10px 0;border-bottom:1px solid #e2e8f0;color:#64748b;font-size:14px;width:140px;">${escapeHtml(label)}</td><td style="padding:10px 0;border-bottom:1px solid #e2e8f0;font-size:14px;color:#0f172a;font-weight:600;">${escapeHtml(value)}</td></tr>`;
}

async function send(subject: string, html: string): Promise<void> {
  if (!isMailConfigured()) {
    console.warn("[notifications] SMTP or recipient not configured, skipping notification:", subject);
    return;
  }

  try {
    await getMailTransporter().sendMail({
      from: `"RaveSoft AI Agent" <${process.env.SMTP_USER}>`,
      to: notificationRecipient(),
      subject: sanitizeHeaderValue(subject),
      html,
    });
  } catch (error) {
    // Notifications are best-effort — never let a failed email break the lead/handoff flow.
    console.error("[notifications] Failed to send email:", subject, error);
  }
}

export interface HotLeadNotificationInput {
  leadId: number;
  contactName: string;
  contactEmail: string | null;
  contactPhone: string | null;
  contactWhatsapp: string | null;
  companyName: string | null;
  serviceInterest: string | null;
  totalScore: number;
}

export async function sendHotLeadNotification(input: HotLeadNotificationInput): Promise<void> {
  const html = wrapper(
    "🔥 Hot RaveSoft Lead",
    "A visitor just reached a hot lead score on the website AI agent",
    `<table style="width:100%;border-collapse:collapse;">
      ${row("Lead score", `${input.totalScore}/100 (hot)`)}
      ${row("Contact", input.contactName)}
      ${input.companyName ? row("Company", input.companyName) : ""}
      ${input.contactEmail ? row("Email", input.contactEmail) : ""}
      ${input.contactPhone ? row("Phone", input.contactPhone) : ""}
      ${input.contactWhatsapp ? row("WhatsApp", input.contactWhatsapp) : ""}
      ${input.serviceInterest ? row("Interest", input.serviceInterest) : ""}
    </table>
    <p style="margin-top:16px;"><a href="${APP_URL}/admin/leads/${input.leadId}" style="color:#3b82f6;font-weight:600;">View lead in admin dashboard →</a></p>`
  );

  await send(`🔥 Hot lead: ${input.contactName}`, html);
}

export interface HumanHandoffNotificationInput {
  conversationExternalId: string;
  contactName: string | null;
  reason: string | null;
}

export async function sendHumanHandoffNotification(input: HumanHandoffNotificationInput): Promise<void> {
  const html = wrapper(
    "🙋 Human Handoff Requested",
    "The AI agent needs a human to take over a conversation",
    `<table style="width:100%;border-collapse:collapse;">
      ${row("Visitor", input.contactName ?? "Anonymous")}
      ${input.reason ? row("Reason", input.reason) : ""}
    </table>
    <p style="margin-top:16px;"><a href="${APP_URL}/admin/conversations/${input.conversationExternalId}" style="color:#3b82f6;font-weight:600;">View conversation →</a></p>`
  );

  await send("🙋 Human handoff requested on RaveSoft website", html);
}

export interface AssessmentCompletedNotificationInput {
  leadId: number;
  contactName: string;
  businessName: string;
  contactEmail: string;
  contactWhatsapp: string;
  recommendedAgent: string;
  complexity: string;
}

export async function sendAssessmentCompletedNotification(input: AssessmentCompletedNotificationInput): Promise<void> {
  const html = wrapper(
    "📋 New AI Employee Assessment",
    "A visitor completed the AI Employee assessment on the website",
    `<table style="width:100%;border-collapse:collapse;">
      ${row("Contact", input.contactName)}
      ${row("Business", input.businessName)}
      ${row("Email", input.contactEmail)}
      ${row("WhatsApp", input.contactWhatsapp)}
      ${row("Recommended", input.recommendedAgent)}
      ${row("Complexity", input.complexity)}
    </table>
    <p style="margin-top:16px;"><a href="${APP_URL}/admin/leads/${input.leadId}" style="color:#3b82f6;font-weight:600;">View lead in admin dashboard →</a></p>`
  );

  await send(`📋 AI Employee assessment: ${input.contactName} (${input.businessName})`, html);
}

export interface ConsultationBookedNotificationInput {
  leadId: number | null;
  contactName: string;
  contactEmail: string;
  eventName: string | null;
  startTime: string | null;
  isReschedule: boolean;
}

export async function sendConsultationBookedNotification(input: ConsultationBookedNotificationInput): Promise<void> {
  const html = wrapper(
    input.isReschedule ? "📅 Consultation Rescheduled" : "📅 New Consultation Booked",
    "A visitor booked a free consultation via Calendly",
    `<table style="width:100%;border-collapse:collapse;">
      ${row("Contact", input.contactName)}
      ${row("Email", input.contactEmail)}
      ${input.eventName ? row("Event", input.eventName) : ""}
      ${input.startTime ? row("When", input.startTime) : ""}
    </table>
    ${
      input.leadId
        ? `<p style="margin-top:16px;"><a href="${APP_URL}/admin/leads/${input.leadId}" style="color:#3b82f6;font-weight:600;">View lead in admin dashboard →</a></p>`
        : ""
    }`
  );

  await send(`📅 Consultation booked: ${input.contactName}`, html);
}

export interface ConsultationCanceledNotificationInput {
  leadId: number | null;
  contactName: string;
  contactEmail: string;
  eventName: string | null;
}

export async function sendConsultationCanceledNotification(input: ConsultationCanceledNotificationInput): Promise<void> {
  const html = wrapper(
    "❌ Consultation Canceled",
    "A visitor canceled their booked consultation",
    `<table style="width:100%;border-collapse:collapse;">
      ${row("Contact", input.contactName)}
      ${row("Email", input.contactEmail)}
      ${input.eventName ? row("Event", input.eventName) : ""}
    </table>
    ${
      input.leadId
        ? `<p style="margin-top:16px;"><a href="${APP_URL}/admin/leads/${input.leadId}" style="color:#3b82f6;font-weight:600;">View lead in admin dashboard →</a></p>`
        : ""
    }`
  );

  await send(`❌ Consultation canceled: ${input.contactName}`, html);
}

export interface ChatActivityNotificationInput {
  kind: "new_chat" | "visitor_waiting";
  conversationExternalId: string;
  visitorName: string | null;
  page: string | null;
  preview: string;
}

/** Instant heads-up that a visitor started a chat, or is waiting for a team member who already joined. */
export async function sendChatActivityNotification(input: ChatActivityNotificationInput): Promise<void> {
  const isNew = input.kind === "new_chat";
  const title = isNew ? "💬 New website chat" : "⏳ Visitor is waiting for a reply";
  const html = wrapper(
    title,
    isNew ? "A visitor just started a live chat" : "A visitor wrote while a team member is handling the chat",
    `<table style="width:100%;border-collapse:collapse;">
      ${row("Visitor", input.visitorName ?? "Anonymous")}
      ${input.page ? row("Page", input.page) : ""}
      ${row("Message", input.preview)}
    </table>
    <p style="margin-top:16px;"><a href="${APP_URL}/admin/conversations/${encodeURIComponent(input.conversationExternalId)}" style="color:#3b82f6;font-weight:600;">Open chat and reply →</a></p>`
  );
  await send(`${title}${input.visitorName ? ` — ${input.visitorName}` : ""}`, html);
}

/** Emails the visitor a copy of their own chat. Returns false when SMTP is not configured or sending fails. */
export async function sendTranscriptToVisitor(to: string, transcript: string): Promise<boolean> {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn("[notifications] SMTP not configured, cannot email chat transcript");
    return false;
  }
  try {
    await getMailTransporter().sendMail({
      from: `"RaveSoft" <${process.env.SMTP_USER}>`,
      to,
      subject: "Your chat with RaveSoft",
      text:
        `Thanks for chatting with RaveSoft. Here is a copy of your conversation.\n\n${transcript}\n` +
        `Need anything else? Reply to this email or message us on WhatsApp.\n${APP_URL}\n`,
    });
    return true;
  } catch (error) {
    console.error("[notifications] Failed to email chat transcript", error);
    return false;
  }
}

export interface WebsiteLeadNotificationInput {
  leadId: number | null;
  fullName: string;
  businessName: string;
  phone: string;
  email: string;
  businessTypeLabel: string;
  solutionLabel: string;
  message: string;
  submittedAt: string;
  attribution: { label: string; value: string | null | undefined }[];
}

export type NotifyOutcome = "sent" | "not_configured" | "failed";

/**
 * "New RaveSoft Website Lead" email for the /get-started landing page. Uses the existing mail transporter,
 * sender and recipient configuration (no new addresses). Unlike the older helpers it REPORTS the outcome so the
 * caller can flag a lead whose email did not go out — the lead itself is already saved and is never lost.
 */
export async function sendWebsiteLeadNotification(input: WebsiteLeadNotificationInput): Promise<NotifyOutcome> {
  if (!isMailConfigured()) return "not_configured";
  const attrRows = input.attribution.filter((a) => a.value).map((a) => row(a.label, String(a.value)));
  const html = wrapper(
    "🎯 New Website Lead",
    "Submitted via the RaveSoft /get-started landing page",
    `<table style="width:100%;border-collapse:collapse;">
      ${row("Name", input.fullName)}
      ${row("Business", input.businessName)}
      ${row("Phone / WhatsApp", input.phone)}
      ${row("Email", input.email)}
      ${row("Business type", input.businessTypeLabel)}
      ${row("Solution required", input.solutionLabel)}
      ${row("Submitted", input.submittedAt)}
      ${input.leadId ? row("Lead ID", `#${input.leadId}`) : ""}
    </table>
    ${input.message ? `<p style="color:#64748b;font-size:13px;margin:20px 0 8px;font-weight:600;text-transform:uppercase;letter-spacing:.05em;">Additional requirements</p><div style="background:#fff;border:1px solid #e2e8f0;border-radius:8px;padding:16px;font-size:14px;color:#0f172a;line-height:1.6;white-space:pre-wrap;">${escapeHtml(input.message)}</div>` : ""}
    ${attrRows.length ? `<p style="color:#64748b;font-size:13px;margin:20px 0 8px;font-weight:600;text-transform:uppercase;letter-spacing:.05em;">Campaign attribution</p><table style="width:100%;border-collapse:collapse;">${attrRows.join("")}</table>` : ""}
    ${input.leadId ? `<p style="margin-top:16px;"><a href="${APP_URL}/admin/leads/${input.leadId}" style="color:#3b82f6;font-weight:600;">Open lead in admin →</a></p>` : ""}`
  );
  try {
    await getMailTransporter().sendMail({
      from: `"RaveSoft AI Agent" <${process.env.SMTP_USER}>`,
      to: notificationRecipient(),
      replyTo: input.email,
      subject: sanitizeHeaderValue(`New RaveSoft Website Lead — ${input.solutionLabel}`),
      html,
    });
    return "sent";
  } catch (error) {
    // Never log the lead's details — only the failure class.
    console.error("[notifications] website lead email failed:", error instanceof Error ? error.message : "unknown error");
    return "failed";
  }
}
