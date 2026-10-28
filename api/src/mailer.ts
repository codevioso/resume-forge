import { createTransport } from 'nodemailer';

export interface Email {
  to: string;
  subject: string;
  text: string;
  html: string;
}

export interface Mailer {
  send(email: Email): Promise<void>;
}

/** Sends through any SMTP service (Resend, Postmark, Mailgun, Gmail, Mailpit…). */
export function smtpMailer(smtpUrl: string, from: string): Mailer {
  const transport = createTransport(smtpUrl);
  return {
    async send(email) {
      await transport.sendMail({ from, ...email });
    },
  };
}

/** For tests: keeps what would have been sent. */
export function memoryMailer(): Mailer & { sent: Email[] } {
  const sent: Email[] = [];
  return {
    sent,
    async send(email) {
      sent.push(email);
    },
  };
}

const escape = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

/**
 * A short transactional email: one sentence of context, one button, the same
 * link as text, and why they got it. Plain HTML with inline styles, which is
 * what every mail client renders the same.
 */
export function actionEmail(opts: {
  to: string;
  subject: string;
  intro: string;
  action: string;
  url: string;
  footer: string;
}): Email {
  const { to, subject, intro, action, url, footer } = opts;
  const text = `${intro}\n\n${action}: ${url}\n\n${footer}\n\n— Paperplane`;
  const html = `<!doctype html><html><body style="margin:0;background:#f8fafc;font-family:Inter,Segoe UI,Helvetica,Arial,sans-serif;color:#151c48">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border:1px solid #e2e8f0;border-radius:16px;padding:32px">
<tr><td style="font-size:20px;font-weight:800;letter-spacing:-0.02em;padding-bottom:20px">Paper<span style="color:#0e7f99">plane</span></td></tr>
<tr><td style="font-size:15px;line-height:1.6;color:#334155;padding-bottom:24px">${escape(intro)}</td></tr>
<tr><td style="padding-bottom:24px"><a href="${escape(url)}" style="display:inline-block;background:#151c48;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:12px 22px;border-radius:12px">${escape(action)}</a></td></tr>
<tr><td style="font-size:13px;line-height:1.6;color:#64748b;padding-bottom:16px">Or paste this link into your browser:<br><a href="${escape(url)}" style="color:#0e7f99;word-break:break-all">${escape(url)}</a></td></tr>
<tr><td style="font-size:13px;line-height:1.6;color:#64748b;border-top:1px solid #e2e8f0;padding-top:16px">${escape(footer)}</td></tr>
</table></td></tr></table></body></html>`;
  return { to, subject, text, html };
}
