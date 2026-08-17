import "server-only";
import { env, emailProvider, isProd } from "@/lib/env";
import { SITE } from "@/lib/constants";

const BREVO_ENDPOINT = "https://api.brevo.com/v3/smtp/email";
const SEND_TIMEOUT_MS = 10_000;

/** Extra values echoed to the console when a send fails, so the flow stays testable. */
type DebugLine = { label: string; value: string };

type SendArgs = {
  to: string;
  name?: string;
  subject: string;
  html: string;
  text: string;
  debug?: DebugLine[];
};

export type SendResult = { ok: boolean; provider: typeof emailProvider };

/**
 * Print the whole message — recipient, subject, verification URL, OTP code and
 * plain-text body — to the server console. This is the dev path when no
 * provider is configured, and the safety net when a real send fails (the Brevo
 * key is IP-restricted today, so failures are expected off the allowed hosts).
 */
function logToConsole(args: SendArgs, reason: string): void {
  // The dump carries live secrets — the verification URL and the OTP — and the
  // subject line carries the code too. That is fine on a developer's terminal
  // and unacceptable in a production log stream, which is retained, shipped to
  // third-party aggregators and readable by anyone with dashboard access. In
  // production, record only that delivery failed.
  if (isProd) {
    console.error(`[email] message to ${args.to} was not delivered (${reason})`);
    return;
  }

  const rule = "=".repeat(64);
  const fields: DebugLine[] = [
    { label: "To", value: args.name ? `${args.name} <${args.to}>` : args.to },
    { label: "Subject", value: args.subject },
    ...(args.debug ?? []),
  ];
  const width = Math.max(...fields.map((f) => f.label.length)) + 2;
  const lines = [
    "",
    rule,
    `EMAIL — ${reason}`,
    rule,
    ...fields.map((f) => `${`${f.label}:`.padEnd(width)}${f.value}`),
    "-".repeat(64),
    args.text,
    rule,
    "",
  ];
  console.log(lines.join("\n"));
}

/** Returns null on success, or a short failure description. */
async function sendViaBrevo(args: SendArgs): Promise<string | null> {
  const apiKey = env.BREVO_API_KEY;
  if (!apiKey) return "BREVO_API_KEY is missing";

  const res = await fetch(BREVO_ENDPOINT, {
    method: "POST",
    headers: {
      "api-key": apiKey,
      "content-type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify({
      sender: { name: env.EMAIL_FROM_NAME, email: env.EMAIL_FROM },
      to: [{ email: args.to, ...(args.name ? { name: args.name } : {}) }],
      subject: args.subject,
      htmlContent: args.html,
      textContent: args.text,
    }),
    // A hung provider must never hold a registration request open.
    signal: AbortSignal.timeout(SEND_TIMEOUT_MS),
  });

  if (res.ok) return null;
  const body = await res.text().catch(() => "");
  return `HTTP ${res.status} ${body.slice(0, 300)}`;
}

async function sendViaResend(args: SendArgs): Promise<string | null> {
  const { Resend } = await import("resend");
  const resend = new Resend(env.RESEND_API_KEY);
  const { error } = await resend.emails.send({
    from: `${env.EMAIL_FROM_NAME} <${env.EMAIL_FROM}>`,
    to: args.to,
    subject: args.subject,
    html: args.html,
    text: args.text,
  });
  return error ? `${error.name}: ${error.message}` : null;
}

/**
 * Send through the configured provider. Never throws: a delivery problem must
 * not fail the caller's business operation, so failures are reported through
 * the return value and the full message is dumped to the console.
 */
async function send(args: SendArgs): Promise<SendResult> {
  if (emailProvider === "console") {
    logToConsole(args, "no provider configured — console fallback");
    return { ok: true, provider: "console" };
  }

  let failure: string | null;
  try {
    failure = emailProvider === "brevo" ? await sendViaBrevo(args) : await sendViaResend(args);
  } catch (err) {
    failure = err instanceof Error ? err.message : String(err);
  }

  if (failure) {
    console.error(`[email] ${emailProvider} send failed for ${args.to}: ${failure}`);
    logToConsole(args, `${emailProvider} SEND FAILED — use the values below`);
    return { ok: false, provider: emailProvider };
  }

  return { ok: true, provider: emailProvider };
}

/* ---- Template ---- */

const C = {
  gradientFrom: "#f59e0b",
  gradientMid: "#f95c1b",
  gradientTo: "#f43f5e",
  coral: "#f95c1b",
  coralDeep: "#c22f10",
  cream: "#fffaf5",
  surface: "#ffffff",
  tint: "#fff5ed",
  tintBorder: "#fecdaa",
  ink: "#1a1614",
  inkMuted: "#5c534d",
  inkFaint: "#a99c91",
  border: "#eae1d8",
  onDark: "#ffe8d5",
} as const;

const FONT = "'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
const FONT_HI = `'Nirmala UI','Noto Sans Devanagari',Mangal,${FONT}`;

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** English paragraph with its Hindi line directly beneath — the house pattern. */
function para(en: string, hi: string): string {
  return `
    <p style="margin:0 0 6px;font-family:${FONT};font-size:15px;line-height:1.6;color:${C.inkMuted}">${en}</p>
    <p style="margin:0 0 18px;font-family:${FONT_HI};font-size:14px;line-height:1.7;color:${C.inkFaint}">${hi}</p>`;
}

function ctaButton(label: string, labelHi: string, url: string): string {
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:8px auto 4px">
      <tr>
        <td align="center" bgcolor="${C.coral}" style="border-radius:999px">
          <a href="${url}" style="display:inline-block;padding:15px 34px;font-family:${FONT};font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:999px">${label}</a>
        </td>
      </tr>
    </table>
    <p style="margin:10px 0 0;text-align:center;font-family:${FONT_HI};font-size:13px;color:${C.inkFaint}">${labelHi}</p>`;
}

function codeBlock(code: string): string {
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:4px 0 22px">
      <tr>
        <td align="center" bgcolor="${C.tint}" style="border:1px solid ${C.tintBorder};border-radius:16px;padding:22px 16px">
          <div style="font-family:${FONT};font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:${C.coralDeep}">Your verification code</div>
          <div style="font-family:${FONT_HI};font-size:13px;color:${C.inkMuted};padding-top:3px">आपका सत्यापन कोड</div>
          <div style="font-family:'Courier New',Courier,monospace;font-size:34px;font-weight:700;letter-spacing:10px;color:${C.ink};padding:16px 0 6px 10px">${code}</div>
          <div style="font-family:${FONT};font-size:12px;color:${C.inkMuted}">Expires in 10 minutes</div>
          <div style="font-family:${FONT_HI};font-size:12px;color:${C.inkFaint};padding-top:2px">यह कोड 10 मिनट में समाप्त हो जाएगा</div>
        </td>
      </tr>
    </table>`;
}

/**
 * The same tinted panel as `codeBlock`, carrying a points figure instead of a
 * code — a member who has seen one of our emails recognises the other. Caller
 * escapes `friendName`; it is interpolated as HTML.
 */
function rewardBlock(points: number, friendName: string): string {
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:4px 0 22px">
      <tr>
        <td align="center" bgcolor="${C.tint}" style="border:1px solid ${C.tintBorder};border-radius:16px;padding:22px 16px">
          <div style="font-family:${FONT};font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:${C.coralDeep}">Added to your wallet</div>
          <div style="font-family:${FONT_HI};font-size:13px;color:${C.inkMuted};padding-top:3px">आपके वॉलेट में जुड़े</div>
          <div style="font-family:${FONT};font-size:38px;font-weight:700;letter-spacing:-1px;color:${C.ink};padding:14px 0 6px">+${points}</div>
          <div style="font-family:${FONT};font-size:12px;color:${C.inkMuted}">points for inviting ${friendName}</div>
          <div style="font-family:${FONT_HI};font-size:12px;color:${C.inkFaint};padding-top:2px">${friendName} को जोड़ने के लिए पॉइंट्स</div>
        </td>
      </tr>
    </table>`;
}

/**
 * Table-based, fully inline-styled shell. No flex/grid/external CSS — Outlook
 * and Gmail strip all three. The header gradient degrades to a solid coral
 * anywhere `background-image` is ignored.
 */
function shell(opts: {
  preheader: string;
  title: string;
  titleHi: string;
  bodyHtml: string;
}): string {
  return `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;margin:0;padding:0;background-color:${C.cream}">
  <tr>
    <td align="center" style="padding:28px 12px">
      <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:${C.cream};font-size:1px;line-height:1px">${opts.preheader}</div>
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:560px;background-color:${C.surface};border:1px solid ${C.border};border-radius:20px">
        <tr>
          <td align="center" bgcolor="${C.coral}" style="background-color:${C.coral};background-image:linear-gradient(135deg,${C.gradientFrom} 0%,${C.gradientMid} 55%,${C.gradientTo} 100%);border-radius:20px 20px 0 0;padding:34px 24px">
            <div style="font-family:${FONT};font-size:21px;font-weight:700;color:#ffffff;letter-spacing:-0.2px">${SITE.shortName}</div>
            <div style="font-family:${FONT};font-size:11px;font-weight:600;letter-spacing:2px;text-transform:uppercase;color:${C.onDark};padding-top:7px">${SITE.tagline}</div>
          </td>
        </tr>
        <tr>
          <td style="padding:34px 30px 30px">
            <h1 style="margin:0 0 4px;font-family:${FONT};font-size:22px;line-height:1.3;font-weight:700;color:${C.ink}">${opts.title}</h1>
            <p style="margin:0 0 20px;font-family:${FONT_HI};font-size:16px;line-height:1.6;color:${C.coralDeep}">${opts.titleHi}</p>
            ${opts.bodyHtml}
          </td>
        </tr>
      </table>
      <p style="margin:18px 0 0;font-family:${FONT};font-size:12px;line-height:1.6;color:${C.inkFaint};max-width:560px">
        © 2026 ${SITE.name}<br />
        <span style="font-family:${FONT_HI}">${SITE.nameHi}</span>
      </p>
    </td>
  </tr>
</table>`;
}

export async function sendVerificationEmail(
  to: string,
  name: string,
  url: string,
  code: string,
): Promise<SendResult> {
  const safeName = escapeHtml(name);
  return send({
    to,
    name,
    subject: `${code} is your ${SITE.shortName} verification code`,
    debug: [
      { label: "Verify URL", value: url },
      { label: "OTP code", value: code },
    ],
    html: shell({
      preheader: `Your verification code is ${code}. It expires in 10 minutes.`,
      title: `Welcome, ${safeName}!`,
      titleHi: `स्वागत है, ${safeName}!`,
      bodyHtml: `
        ${para(
          `You are one step away from your ${SITE.name} account. Enter the 6-digit code below, or tap the button — either one works.`,
          `आपका खाता बस एक कदम दूर है। नीचे दिया गया 6 अंकों का कोड डालें, या बटन दबाएँ — दोनों में से कुछ भी चलेगा।`,
        )}
        ${codeBlock(code)}
        ${ctaButton("Verify my email", "ईमेल सत्यापित करें", url)}
        <p style="margin:26px 0 0;font-family:${FONT};font-size:12px;line-height:1.6;color:${C.inkFaint};word-break:break-all">
          Button not working? Paste this link into your browser:<br /><a href="${url}" style="color:${C.coralDeep}">${url}</a>
        </p>
        <p style="margin:14px 0 0;font-family:${FONT};font-size:12px;line-height:1.6;color:${C.inkFaint}">
          The link stays valid for 24 hours. If you did not create this account, you can ignore this email.
        </p>
        <p style="margin:4px 0 0;font-family:${FONT_HI};font-size:12px;line-height:1.7;color:${C.inkFaint}">
          लिंक 24 घंटे तक चलेगा। अगर आपने यह खाता नहीं बनाया है, तो इस ईमेल को अनदेखा कर दें।
        </p>`,
    }),
    text: [
      `Welcome to ${SITE.name}, ${name}!`,
      ``,
      `Your verification code is: ${code}`,
      `It expires in 10 minutes.`,
      ``,
      `Or verify with this link (valid 24 hours):`,
      url,
      ``,
      `If you did not create this account, you can ignore this email.`,
    ].join("\n"),
  });
}

export async function sendPasswordResetEmail(
  to: string,
  name: string,
  url: string,
): Promise<SendResult> {
  const safeName = escapeHtml(name);
  return send({
    to,
    name,
    subject: `Reset your password — ${SITE.shortName}`,
    debug: [{ label: "Reset URL", value: url }],
    html: shell({
      preheader: "Choose a new password. This link expires in 1 hour.",
      title: "Reset your password",
      titleHi: "अपना पासवर्ड रीसेट करें",
      bodyHtml: `
        ${para(
          `Hi ${safeName}, we received a request to reset your password. Tap the button below to choose a new one.`,
          `नमस्ते ${safeName}, हमें आपका पासवर्ड रीसेट करने का अनुरोध मिला है। नया पासवर्ड चुनने के लिए नीचे बटन दबाएँ।`,
        )}
        ${ctaButton("Reset password", "पासवर्ड रीसेट करें", url)}
        <p style="margin:26px 0 0;font-family:${FONT};font-size:12px;line-height:1.6;color:${C.inkFaint};word-break:break-all">
          Button not working? Paste this link into your browser:<br /><a href="${url}" style="color:${C.coralDeep}">${url}</a>
        </p>
        <p style="margin:14px 0 0;font-family:${FONT};font-size:12px;line-height:1.6;color:${C.inkFaint}">
          This link expires in 1 hour. If you did not ask for it, ignore this email — your password stays the same.
        </p>
        <p style="margin:4px 0 0;font-family:${FONT_HI};font-size:12px;line-height:1.7;color:${C.inkFaint}">
          यह लिंक 1 घंटे तक चलेगा। अगर आपने यह अनुरोध नहीं किया, तो इस ईमेल को अनदेखा कर दें — आपका पासवर्ड वैसा ही रहेगा।
        </p>`,
    }),
    text: [
      `Hi ${name},`,
      ``,
      `Reset your ${SITE.shortName} password with this link (valid 1 hour):`,
      url,
      ``,
      `If you did not request this, ignore this email — your password stays the same.`,
    ].join("\n"),
  });
}

/**
 * Tell a member that someone they invited has joined and qualified.
 *
 * `friendName` is a display name — "Rahul S." — and it is the ONLY thing about
 * the referred person that travels. Their email address is deliberately absent:
 * the two sides of a referral are strangers to each other beyond the code that
 * connected them, and a notification is not a reason to introduce them.
 *
 * `points` may legitimately be 0 when the referrer reward is switched off in
 * settings, so the copy has to work as plain good news without a figure.
 */
export async function sendReferralJoinedEmail(
  to: string,
  name: string,
  friendName: string,
  points: number,
  referralsUrl: string,
): Promise<SendResult> {
  const safeName = escapeHtml(name);
  const safeFriend = escapeHtml(friendName);
  const earned = points > 0;

  return send({
    to,
    name,
    subject: earned
      ? `${friendName} joined with your code — +${points} points`
      : `${friendName} joined with your referral code`,
    debug: [{ label: "Referrals URL", value: referralsUrl }],
    html: shell({
      preheader: earned
        ? `${friendName} joined through your referral. ${points} points are already in your wallet.`
        : `${friendName} joined through your referral code.`,
      title: `${safeFriend} joined through you`,
      titleHi: `${safeFriend} आपके ज़रिए जुड़े`,
      bodyHtml: `
        ${para(
          earned
            ? `Hi ${safeName}, ${safeFriend} signed up with your referral code and has now met the conditions — so ${points} points are already sitting in your wallet.`
            : `Hi ${safeName}, ${safeFriend} signed up with your referral code and has now met the conditions.`,
          earned
            ? `नमस्ते ${safeName}, ${safeFriend} ने आपके रेफ़रल कोड से खाता बनाया और सारी शर्तें पूरी कर दीं — इसलिए ${points} पॉइंट्स आपके वॉलेट में जुड़ चुके हैं।`
            : `नमस्ते ${safeName}, ${safeFriend} ने आपके रेफ़रल कोड से खाता बनाया और सारी शर्तें पूरी कर दीं।`,
        )}
        ${earned ? rewardBlock(points, safeFriend) : ""}
        ${ctaButton("See my referrals", "मेरे रेफ़रल देखें", referralsUrl)}
        <p style="margin:26px 0 0;font-family:${FONT};font-size:12px;line-height:1.6;color:${C.inkFaint}">
          Keep sharing your code — every friend who joins and plays their first quiz brings you more points.
        </p>
        <p style="margin:4px 0 0;font-family:${FONT_HI};font-size:12px;line-height:1.7;color:${C.inkFaint}">
          अपना कोड बाँटते रहिए — जो भी दोस्त जुड़कर पहली क्विज़ खेलता है, वह आपको और पॉइंट्स दिलाता है।
        </p>`,
    }),
    text: [
      `Hi ${name},`,
      ``,
      `${friendName} signed up with your referral code and has now met the conditions.`,
      ...(earned ? [`${points} points have been added to your wallet.`] : []),
      ``,
      `See your referrals:`,
      referralsUrl,
      ``,
      `Keep sharing your code — every friend who joins and plays their first quiz brings you more points.`,
    ].join("\n"),
  });
}
