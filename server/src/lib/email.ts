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

export type NotificationPosition = {
  id: string;
  title: string;
  piName: string;
  department: string;
  description: string | null;
};

export async function sendPositionNotificationEmail(
  toEmail: string,
  firstName: string,
  positions: NotificationPosition[],
  studentProfileId: string
) {
  const transport = createTransport();
  const clientUrl = config.clientUrl;
  const unsubscribeUrl = `${clientUrl.replace(/\/$/, '')}/api/notifications/unsubscribe?studentId=${studentProfileId}`;

  if (!transport) {
    console.log(`[email] SMTP not configured — skipping position notification to ${toEmail} (${positions.length} position(s))`);
    return;
  }

  const isSingle = positions.length === 1;
  const subject = isSingle
    ? `New research opportunity: ${positions[0].title}`
    : `${positions.length} new research opportunities matching your interests`;

  const positionHtmlBlocks = positions.map((p) => {
    const applyUrl = `${clientUrl.replace(/\/$/, '')}/positions/${p.id}`;
    const desc = p.description ? `<p style="margin:8px 0 0;color:#444;">${p.description.slice(0, 200)}${p.description.length > 200 ? '…' : ''}</p>` : '';
    return `
      <div style="border:1px solid #e2e8f0;border-radius:8px;padding:16px;margin-bottom:16px;">
        <h3 style="margin:0 0 4px;color:#001A3E;">${p.title}</h3>
        <p style="margin:0;color:#555;font-size:14px;">${p.piName} · ${p.department}</p>
        ${desc}
        <a href="${applyUrl}" style="display:inline-block;margin-top:12px;padding:8px 16px;background:#0d9488;color:#fff;border-radius:6px;text-decoration:none;font-size:14px;">View &amp; Apply</a>
      </div>`;
  }).join('');

  const positionTextBlocks = positions.map((p) => {
    const applyUrl = `${clientUrl.replace(/\/$/, '')}/positions/${p.id}`;
    return `${p.title}\n${p.piName} · ${p.department}\n${applyUrl}`;
  }).join('\n\n');

  await transport.sendMail({
    from: `"ResearchHub" <${config.fromEmail}>`,
    to: toEmail,
    subject,
    text: `Hi ${firstName},\n\nNew research opportunities matching your interests were just posted on ResearchHub:\n\n${positionTextBlocks}\n\nLog in to browse more: ${clientUrl}\n\nTo unsubscribe from these alerts: ${unsubscribeUrl}\n\nBest,\nThe ResearchHub Team`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;">
        <h2 style="color:#001A3E;">New Research ${isSingle ? 'Opportunity' : 'Opportunities'} for You</h2>
        <p>Hi ${firstName}, the following ${isSingle ? 'position was' : 'positions were'} just posted on ResearchHub and match your interests:</p>
        ${positionHtmlBlocks}
        <p style="margin-top:24px;font-size:13px;color:#888;">
          You're receiving this because you opted into new-position alerts.<br/>
          <a href="${unsubscribeUrl}" style="color:#888;">Unsubscribe</a>
        </p>
      </div>
    `,
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

export async function sendPositionClosedEmail(
  toEmail: string,
  firstName: string,
  positionTitle: string,
  labName: string | null
) {
  const transport = createTransport();
  if (!transport) {
    console.log(`[email] SMTP not configured — skipping position closed email to ${toEmail}`);
    return;
  }
  const labInfo = labName ? ` from ${labName}` : '';
  await transport.sendMail({
    from: `"ResearchHub" <${config.fromEmail}>`,
    to: toEmail,
    subject: `Position closed: ${positionTitle}`,
    text: `Hi ${firstName},\n\nThe position "${positionTitle}"${labInfo} has been closed and is no longer accepting applications.\n\nYour application status has been updated to withdrawn. You can continue browsing other open positions on ResearchHub.\n\nBest,\nThe ResearchHub Team`,
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="color: #001A3E;">Position Closed</h2>
        <p>Hi ${firstName},</p>
        <p>The position <strong>"${positionTitle}"</strong>${labInfo} has been closed and is no longer accepting applications.</p>
        <p>Your application status has been updated to <strong>withdrawn</strong>. You can continue browsing other open positions on ResearchHub.</p>
        <br/>
        <p style="color: #555;">The ResearchHub Team</p>
      </div>
    `,
  });
}
