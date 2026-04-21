import nodemailer from 'nodemailer';
import { config } from '../config/env.js';

/** Nodemailer transport configuration (null when SMTP is not configured). */
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

export type NotificationMessageThread = {
  conversationId: string;
  fromName: string;
  unreadCount: number;
  latestPreview: string;
};

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export async function sendNotificationDigestEmail(args: {
  toEmail: string;
  firstName: string;
  positions: NotificationPosition[];
  messages: NotificationMessageThread[];
  userId: string;
}) {
  const { toEmail, firstName, positions, messages, userId } = args;
  const transport = createTransport();
  const clientUrl = config.clientUrl.replace(/\/$/, '');
  const unsubscribeUrl = `${clientUrl}/api/notifications/unsubscribe?userId=${userId}`;

  if (positions.length === 0 && messages.length === 0) return;

  if (!transport) {
    console.log(
      `[email] SMTP not configured — skipping digest to ${toEmail} (${positions.length} position(s), ${messages.length} message thread(s))`
    );
    return;
  }

  const totalItems = positions.length + messages.length;
  const subject =
    positions.length > 0 && messages.length > 0
      ? `ResearchHub digest: ${positions.length} new position(s), ${messages.length} unread message thread(s)`
      : positions.length > 0
      ? positions.length === 1
        ? `New research opportunity: ${positions[0].title}`
        : `${positions.length} new research opportunities matching your interests`
      : messages.length === 1
      ? `New message from ${messages[0].fromName}`
      : `${messages.length} new unread message threads`;

  const positionHtml = positions
    .map((p) => {
      const applyUrl = `${clientUrl}/positions/${p.id}`;
      const desc = p.description
        ? `<p style="margin:8px 0 0;color:#444;">${escapeHtml(p.description.slice(0, 200))}${p.description.length > 200 ? '…' : ''}</p>`
        : '';
      return `
        <div style="border:1px solid #e2e8f0;border-radius:8px;padding:16px;margin-bottom:12px;">
          <h3 style="margin:0 0 4px;color:#001A3E;">${escapeHtml(p.title)}</h3>
          <p style="margin:0;color:#555;font-size:14px;">${escapeHtml(p.piName)} · ${escapeHtml(p.department)}</p>
          ${desc}
          <a href="${applyUrl}" style="display:inline-block;margin-top:12px;padding:8px 16px;background:#0d9488;color:#fff;border-radius:6px;text-decoration:none;font-size:14px;">View &amp; Apply</a>
        </div>`;
    })
    .join('');

  const messageHtml = messages
    .map((m) => {
      const threadUrl = `${clientUrl}/messages`;
      const countLabel = m.unreadCount === 1 ? '1 new message' : `${m.unreadCount} new messages`;
      const preview = m.latestPreview
        ? `<p style="margin:8px 0 0;color:#444;font-style:italic;">“${escapeHtml(m.latestPreview.slice(0, 180))}${m.latestPreview.length > 180 ? '…' : ''}”</p>`
        : '';
      return `
        <div style="border:1px solid #e2e8f0;border-radius:8px;padding:16px;margin-bottom:12px;">
          <h3 style="margin:0 0 4px;color:#001A3E;">${escapeHtml(m.fromName)}</h3>
          <p style="margin:0;color:#555;font-size:14px;">${countLabel}</p>
          ${preview}
          <a href="${threadUrl}" style="display:inline-block;margin-top:12px;padding:8px 16px;background:#0052CC;color:#fff;border-radius:6px;text-decoration:none;font-size:14px;">Open conversation</a>
        </div>`;
    })
    .join('');

  const positionText = positions
    .map((p) => `${p.title}\n${p.piName} · ${p.department}\n${clientUrl}/positions/${p.id}`)
    .join('\n\n');
  const messageText = messages
    .map((m) => `${m.fromName} — ${m.unreadCount} new message${m.unreadCount === 1 ? '' : 's'}\n${clientUrl}/messages`)
    .join('\n\n');

  const textParts = [`Hi ${firstName},`, `You have ${totalItems} new item(s) on ResearchHub:`];
  if (positions.length > 0) textParts.push(`--- New positions ---\n${positionText}`);
  if (messages.length > 0) textParts.push(`--- Unread messages ---\n${messageText}`);
  textParts.push(`To unsubscribe from digest emails: ${unsubscribeUrl}`);
  textParts.push(`Best,\nThe ResearchHub Team`);

  await transport.sendMail({
    from: `"ResearchHub" <${config.fromEmail}>`,
    to: toEmail,
    subject,
    text: textParts.join('\n\n'),
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;">
        <h2 style="color:#001A3E;">Your ResearchHub digest</h2>
        <p>Hi ${escapeHtml(firstName)}, here's what's new since your last email:</p>
        ${positions.length > 0 ? `<h3 style="margin:24px 0 8px;color:#0d9488;">New positions</h3>${positionHtml}` : ''}
        ${messages.length > 0 ? `<h3 style="margin:24px 0 8px;color:#0052CC;">Unread messages</h3>${messageHtml}` : ''}
        <p style="margin-top:24px;font-size:13px;color:#888;">
          You're receiving this because you opted into ResearchHub digest emails.<br/>
          <a href="${unsubscribeUrl}" style="color:#888;">Unsubscribe from all digest emails</a>
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
