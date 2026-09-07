// src/lib/mailer.ts
// Gmail SMTP transport via Nodemailer. All secrets come from env vars.
import nodemailer from "nodemailer";

export type Attachment = { filename: string; content: Buffer | string; contentType?: string };

function getTransport() {
  const host = process.env.EMAIL_HOST || "smtp.gmail.com";
  const port = Number(process.env.EMAIL_PORT || 465);
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASSWORD;
  if (!user || !pass) throw new Error("EMAIL_USER / EMAIL_PASSWORD not configured");
  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465, // true for 465, false for 587
    auth: { user, pass },
  });
}

export function getRecipients(): string[] {
  const raw = process.env.REPORT_RECIPIENTS || "";
  return raw.split(",").map((s) => s.trim()).filter(Boolean);
}

export async function sendReportEmail(opts: {
  subject: string;
  html: string;
  attachments?: Attachment[];
}) {
  const to = getRecipients();
  if (to.length === 0) throw new Error("REPORT_RECIPIENTS not configured");
  const from = process.env.EMAIL_USER!;
  const transport = getTransport();
  await transport.sendMail({
    from: `Freezer PDI <${from}>`,
    to,
    subject: opts.subject,
    html: opts.html,
    attachments: opts.attachments,
  });
}
