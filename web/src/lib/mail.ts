import "server-only";
import nodemailer, { type Transporter } from "nodemailer";
import { env } from "./env";

/** Escape text before placing it in an email's HTML. */
export function esc(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function wrap(bodyHtml: string): string {
  return `
  <div style="font-family:Roboto,'Segoe UI',Arial,sans-serif;max-width:600px;margin:0 auto;background:#f4f5f7;padding:32px">
    <div style="background:#0e2a5c;border-radius:12px;padding:24px;text-align:center;margin-bottom:24px">
      <div style="color:#fff;font-size:20px;font-weight:700">Jain OOA Portal</div>
      <div style="color:#c7d0e6;font-size:12px;margin-top:4px">Office of Academic Affairs · JAIN (Deemed-to-be University)</div>
    </div>
    <div style="background:#fff;border-radius:12px;padding:28px;border:1px solid #dfe4ee;color:#33405f;font-size:14px;line-height:1.7">
      ${bodyHtml}
    </div>
  </div>`;
}

// One pooled SMTP connection for the whole process: reminder runs send many
// emails, and opening a new connection for each is slow and trips provider limits.
let pooled: { key: string; transport: Transporter } | null = null;
function transport(config: NonNullable<typeof env.mail>) {
  const key = `${config.host}:${config.port}:${config.user}`;
  if (!pooled || pooled.key !== key) {
    pooled?.transport.close();
    pooled = {
      key,
      transport: nodemailer.createTransport({
        pool: true,
        maxConnections: 2,
        maxMessages: 100,
        rateDelta: 1000,
        rateLimit: 5, // at most 5 emails a second
        host: config.host,
        port: config.port,
        secure: config.secure,
        auth: { user: config.user, pass: config.pass },
        connectionTimeout: 10000,
        socketTimeout: 15000,
      }),
    };
  }
  return pooled.transport;
}

/**
 * Send one email. Returns false (and logs why) when SMTP is not configured
 * or the send fails; callers decide whether that matters.
 */
export async function sendEmail(to: string, subject: string, bodyHtml: string): Promise<boolean> {
  const config = env.mail;
  if (!config) {
    console.warn(`[mail] SMTP not configured; skipped "${subject}"`);
    return false;
  }
  try {
    await transport(config).sendMail({
      from: `"Jain OOA Portal — Office of Academic Affairs" <${config.user}>`,
      to,
      subject,
      html: wrap(bodyHtml),
    });
    return true;
  } catch (error) {
    console.error(`[mail] Failed to send "${subject}":`, error);
    return false;
  }
}
