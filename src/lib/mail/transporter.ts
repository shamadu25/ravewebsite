import nodemailer, { Transporter } from "nodemailer";

let cached: Transporter | null = null;

/** Reuses the same SMTP configuration as the contact form (spec §28 sales notifications). */
export function getMailTransporter(): Transporter {
  if (cached) return cached;

  cached = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  return cached;
}

export function notificationRecipient(): string {
  return process.env.LEAD_NOTIFICATION_EMAIL ?? process.env.CONTACT_EMAIL ?? "";
}

export function isMailConfigured(): boolean {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS && notificationRecipient());
}
