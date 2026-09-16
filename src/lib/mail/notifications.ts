import { getMailTransporter, isMailConfigured, notificationRecipient } from "./transporter";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://ravesoftsolutions.com";

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
  return `<tr><td style="padding:10px 0;border-bottom:1px solid #e2e8f0;color:#64748b;font-size:14px;width:140px;">${label}</td><td style="padding:10px 0;border-bottom:1px solid #e2e8f0;font-size:14px;color:#0f172a;font-weight:600;">${value}</td></tr>`;
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
      subject,
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
