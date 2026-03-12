import nodemailer from 'nodemailer';
import { config } from '../config/env.js';

function createTransport() {
  if (!config.smtpHost || !config.smtpUser || !config.smtpPass) {
    return null;
  }
  return nodemailer.createTransport({
    host: config.smtpHost,
    port: config.smtpPort,
    secure: config.smtpPort === 465,
    auth: { user: config.smtpUser, pass: config.smtpPass },
  });
}

export async function sendWelcomeEmail(toEmail: string, firstName: string) {
  const transport = createTransport();
  if (!transport) {
    console.log(`[email] SMTP not configured — skipping welcome email to ${toEmail}`);
    return;
  }
  await transport.sendMail({
    from: `"ResearchHub" <${config.fromEmail}>`,
    to: toEmail,
    subject: 'Welcome to ResearchHub!',
    text: `Hi ${firstName},\n\nThank you for signing up for ResearchHub! We're excited to have you.\n\nYou can now browse and apply to research positions at UF.\n\nBest,\nThe ResearchHub Team`,
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="color: #001A3E;">Welcome to ResearchHub, ${firstName}!</h2>
        <p>Thank you for signing up. We're excited to have you on board.</p>
        <p>You can now browse and apply to research positions at the University of Florida.</p>
        <br/>
        <p style="color: #555;">The ResearchHub Team</p>
      </div>
    `,
  });
}
