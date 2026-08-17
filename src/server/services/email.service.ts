import "server-only";
import { env, emailConfigured } from "@/lib/env";
import { SITE } from "@/lib/constants";

type SendArgs = { to: string; subject: string; html: string; text?: string };

/**
 * Send an email via Resend when configured; otherwise log to the console (dev),
 * so verification/reset links are always retrievable during local development.
 */
async function send({ to, subject, html, text }: SendArgs): Promise<void> {
  if (!emailConfigured) {
    console.log(
      `\n[email:dev] To: ${to}\n[email:dev] Subject: ${subject}\n[email:dev] ${text ?? html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()}\n`,
    );
    return;
  }
  const { Resend } = await import("resend");
  const resend = new Resend(env.RESEND_API_KEY);
  const { error } = await resend.emails.send({
    from: env.EMAIL_FROM,
    to,
    subject,
    html,
    text,
  });
  if (error) {
    console.error("[email] Resend error:", error);
    throw new Error("Failed to send email.");
  }
}

function shell(title: string, bodyHtml: string, cta?: { label: string; url: string }) {
  return `
  <div style="font-family:Inter,Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#1d222c">
    <div style="text-align:center;margin-bottom:24px">
      <h1 style="color:#1d4e89;font-size:20px;margin:0">${SITE.shortName}</h1>
      <p style="color:#63a52f;font-size:12px;margin:4px 0 0">${SITE.tagline}</p>
    </div>
    <div style="background:#f7f8fa;border:1px solid #dde1e9;border-radius:16px;padding:28px">
      <h2 style="color:#112f52;font-size:18px;margin:0 0 12px">${title}</h2>
      ${bodyHtml}
      ${
        cta
          ? `<div style="text-align:center;margin:24px 0 8px">
              <a href="${cta.url}" style="background:#1d4e89;color:#fff;text-decoration:none;padding:12px 24px;border-radius:9999px;display:inline-block;font-weight:600">${cta.label}</a>
             </div>
             <p style="color:#707c92;font-size:12px;word-break:break-all">Or paste this link: ${cta.url}</p>`
          : ""
      }
    </div>
    <p style="color:#9aa4b6;font-size:12px;text-align:center;margin-top:20px">© 2026 ${SITE.name}</p>
  </div>`;
}

export async function sendVerificationEmail(to: string, name: string, url: string) {
  await send({
    to,
    subject: `Verify your email — ${SITE.shortName}`,
    html: shell(
      `Welcome, ${name}!`,
      `<p>Thanks for joining ${SITE.name}. Please verify your email address to activate your account and start earning points.</p>
       <p style="color:#707c92;font-size:13px">This link expires in 24 hours.</p>`,
      { label: "Verify my email", url },
    ),
    text: `Welcome to ${SITE.name}! Verify your email: ${url} (expires in 24 hours)`,
  });
}

export async function sendPasswordResetEmail(to: string, name: string, url: string) {
  await send({
    to,
    subject: `Reset your password — ${SITE.shortName}`,
    html: shell(
      `Password reset`,
      `<p>Hi ${name}, we received a request to reset your password. Click below to choose a new one.</p>
       <p style="color:#707c92;font-size:13px">This link expires in 1 hour. If you didn't request this, you can safely ignore this email.</p>`,
      { label: "Reset password", url },
    ),
    text: `Reset your password: ${url} (expires in 1 hour). If you didn't request this, ignore this email.`,
  });
}
