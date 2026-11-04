import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { guardForm, POLICIES } from "@/lib/antispam/guard";
import { clientIp } from "../ai/_shared";
import { EnquirySchema, persistEnquiry, recordNotifyFailure, type PersistResult } from "@/lib/enquiry";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Strips CR/LF so user input can never inject extra headers or recipients
 * into the outgoing email via the subject line. */
function sanitizeHeaderValue(value: string): string {
  return value.replace(/[\r\n]+/g, " ").trim();
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = EnquirySchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Please check the form and try again." }, { status: 422 });
  }

  const { fullName, companyName, email, phone, projectType, budget, message, website, page, formToken, turnstileToken } = parsed.data;

  // Anti-spam: rate limits (IP, email, global) → honeypot → signed time-trap token → Turnstile (if enabled) → content.
  const guard = await guardForm(POLICIES.contact, {
    ip: clientIp(req),
    email,
    name: fullName,
    company: companyName,
    message,
    honeypot: website,
    formToken,
    turnstileToken,
  });
  if (!guard.ok) {
    // Honeypot hits get a fake success so the bot moves on; everything else gets a real, explained error.
    if (guard.silent) return NextResponse.json({ success: true });
    return NextResponse.json({ error: guard.error }, { status: guard.status });
  }

  // 1) Save the lead FIRST so an SMTP outage can never lose an enquiry. Persistence failure is
  //    logged but does not block the email (the email is the established, working channel).
  let saved: PersistResult | null = null;
  try {
    saved = await persistEnquiry(parsed.data);
  } catch (err) {
    console.error("[contact/route] failed to save enquiry:", err);
  }
  // Identical re-submission (double click / retry): already saved and already emailed.
  if (saved?.duplicate) return NextResponse.json({ success: true });

  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT ?? 587),
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const html = `
      <div style="font-family:system-ui,sans-serif;max-width:600px;margin:0 auto;padding:24px;background:#f8fafc;border-radius:12px;">
        <div style="background:#050816;padding:24px;border-radius:8px;margin-bottom:24px;">
          <h1 style="color:#fff;margin:0;font-size:20px;">New Project Enquiry</h1>
          <p style="color:#94a3b8;margin:6px 0 0;font-size:14px;">Received via RaveSoft website contact form</p>
        </div>

        <table style="width:100%;border-collapse:collapse;">
          <tr><td style="padding:10px 0;border-bottom:1px solid #e2e8f0;color:#64748b;font-size:14px;width:140px;">Name</td><td style="padding:10px 0;border-bottom:1px solid #e2e8f0;font-size:14px;color:#0f172a;font-weight:600;">${escapeHtml(fullName)}</td></tr>
          ${companyName ? `<tr><td style="padding:10px 0;border-bottom:1px solid #e2e8f0;color:#64748b;font-size:14px;">Company</td><td style="padding:10px 0;border-bottom:1px solid #e2e8f0;font-size:14px;color:#0f172a;">${escapeHtml(companyName)}</td></tr>` : ""}
          <tr><td style="padding:10px 0;border-bottom:1px solid #e2e8f0;color:#64748b;font-size:14px;">Email</td><td style="padding:10px 0;border-bottom:1px solid #e2e8f0;font-size:14px;"><a href="mailto:${escapeHtml(email)}" style="color:#3b82f6;">${escapeHtml(email)}</a></td></tr>
          ${phone ? `<tr><td style="padding:10px 0;border-bottom:1px solid #e2e8f0;color:#64748b;font-size:14px;">Phone</td><td style="padding:10px 0;border-bottom:1px solid #e2e8f0;font-size:14px;color:#0f172a;">${escapeHtml(phone)}</td></tr>` : ""}
          ${projectType ? `<tr><td style="padding:10px 0;border-bottom:1px solid #e2e8f0;color:#64748b;font-size:14px;">Project Type</td><td style="padding:10px 0;border-bottom:1px solid #e2e8f0;font-size:14px;color:#0f172a;">${escapeHtml(projectType)}</td></tr>` : ""}
          ${page ? `<tr><td style="padding:10px 0;border-bottom:1px solid #e2e8f0;color:#64748b;font-size:14px;">Page</td><td style="padding:10px 0;border-bottom:1px solid #e2e8f0;font-size:14px;color:#0f172a;">${escapeHtml(page)}</td></tr>` : ""}
          ${budget ? `<tr><td style="padding:10px 0;border-bottom:1px solid #e2e8f0;color:#64748b;font-size:14px;">Budget</td><td style="padding:10px 0;border-bottom:1px solid #e2e8f0;font-size:14px;color:#0f172a;">${escapeHtml(budget)}</td></tr>` : ""}
        </table>

        <div style="margin-top:20px;">
          <p style="color:#64748b;font-size:13px;margin-bottom:8px;font-weight:600;text-transform:uppercase;letter-spacing:.05em;">Message</p>
          <div style="background:#fff;border:1px solid #e2e8f0;border-radius:8px;padding:16px;font-size:14px;color:#0f172a;line-height:1.6;white-space:pre-wrap;">${escapeHtml(message)}</div>
        </div>

        <p style="margin-top:24px;color:#94a3b8;font-size:12px;text-align:center;">RaveSoft Digital Solutions · info@ravesoftsolutions.com</p>
      </div>
    `;

    await transporter.sendMail({
      from: `"RaveSoft Website" <${process.env.SMTP_USER}>`,
      to: process.env.CONTACT_EMAIL ?? "info@ravesoftsolutions.com",
      replyTo: email,
      subject: `New enquiry from ${sanitizeHeaderValue(fullName)}${companyName ? ` · ${sanitizeHeaderValue(companyName)}` : ""}${projectType ? ` — ${sanitizeHeaderValue(projectType)}` : ""}`,
      html,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[contact/route] SMTP error:", err);
    if (saved) {
      // The enquiry is safely stored and visible in /admin/leads; flag it so the team knows no email went out.
      await recordNotifyFailure(saved.leadId, saved.contactId, err).catch(() => undefined);
      return NextResponse.json({ success: true });
    }
    return NextResponse.json({ error: "Failed to send message. Please try again." }, { status: 500 });
  }
}
