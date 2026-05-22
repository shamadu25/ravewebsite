import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { fullName, companyName, email, phone, projectType, budget, message } = body;

    // Basic validation
    if (!fullName?.trim() || !email?.trim() || !message?.trim()) {
      return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Invalid email address." }, { status: 400 });
    }

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
          <tr><td style="padding:10px 0;border-bottom:1px solid #e2e8f0;color:#64748b;font-size:14px;width:140px;">Name</td><td style="padding:10px 0;border-bottom:1px solid #e2e8f0;font-size:14px;color:#0f172a;font-weight:600;">${fullName}</td></tr>
          ${companyName ? `<tr><td style="padding:10px 0;border-bottom:1px solid #e2e8f0;color:#64748b;font-size:14px;">Company</td><td style="padding:10px 0;border-bottom:1px solid #e2e8f0;font-size:14px;color:#0f172a;">${companyName}</td></tr>` : ""}
          <tr><td style="padding:10px 0;border-bottom:1px solid #e2e8f0;color:#64748b;font-size:14px;">Email</td><td style="padding:10px 0;border-bottom:1px solid #e2e8f0;font-size:14px;"><a href="mailto:${email}" style="color:#3b82f6;">${email}</a></td></tr>
          ${phone ? `<tr><td style="padding:10px 0;border-bottom:1px solid #e2e8f0;color:#64748b;font-size:14px;">Phone</td><td style="padding:10px 0;border-bottom:1px solid #e2e8f0;font-size:14px;color:#0f172a;">${phone}</td></tr>` : ""}
          ${projectType ? `<tr><td style="padding:10px 0;border-bottom:1px solid #e2e8f0;color:#64748b;font-size:14px;">Project Type</td><td style="padding:10px 0;border-bottom:1px solid #e2e8f0;font-size:14px;color:#0f172a;">${projectType}</td></tr>` : ""}
          ${budget ? `<tr><td style="padding:10px 0;border-bottom:1px solid #e2e8f0;color:#64748b;font-size:14px;">Budget</td><td style="padding:10px 0;border-bottom:1px solid #e2e8f0;font-size:14px;color:#0f172a;">${budget}</td></tr>` : ""}
        </table>

        <div style="margin-top:20px;">
          <p style="color:#64748b;font-size:13px;margin-bottom:8px;font-weight:600;text-transform:uppercase;letter-spacing:.05em;">Message</p>
          <div style="background:#fff;border:1px solid #e2e8f0;border-radius:8px;padding:16px;font-size:14px;color:#0f172a;line-height:1.6;white-space:pre-wrap;">${message}</div>
        </div>

        <p style="margin-top:24px;color:#94a3b8;font-size:12px;text-align:center;">RaveSoft Digital Solutions · info@ravesoftsolutions.com</p>
      </div>
    `;

    await transporter.sendMail({
      from: `"RaveSoft Website" <${process.env.SMTP_USER}>`,
      to: process.env.CONTACT_EMAIL ?? "info@ravesoftsolutions.com",
      replyTo: email,
      subject: `New enquiry from ${fullName}${companyName ? ` · ${companyName}` : ""}${projectType ? ` — ${projectType}` : ""}`,
      html,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[contact/route] SMTP error:", err);
    return NextResponse.json({ error: "Failed to send message. Please try again." }, { status: 500 });
  }
}
