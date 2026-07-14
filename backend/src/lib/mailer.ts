import nodemailer from "nodemailer";

// ---------------------------------------------------------------------------
// MAILER — used to deliver OTP codes (admin login, sign-up verification,
// password reset).
//
// Render blocks ALL outbound SMTP ports (25, 465, 587) on free-tier web
// services (see https://render.com/changelog/free-web-services-will-no-
// longer-allow-outbound-traffic-to-smtp-ports), so plain Nodemailer/Gmail
// SMTP hangs and times out in production no matter which port is used.
//
// To work around this we send over HTTPS instead, via Resend's REST API
// (https://resend.com), which needs only port 443 — always open. Configure
// RESEND_API_KEY (+ optionally RESEND_FROM) in .env / the Render dashboard.
//
// If RESEND_API_KEY isn't set, we fall back to the original Gmail SMTP
// transporter. That path still works fine for local development (or any
// host that doesn't block SMTP) — it just won't work on a Render free
// instance.
// ---------------------------------------------------------------------------

const RESEND_API_KEY = (process.env.RESEND_API_KEY || "").trim();
// Must be either "onboarding@resend.dev" (works with no domain setup, but
// only delivers to the email you signed up to Resend with) or an address on
// a domain you've verified in the Resend dashboard.
const RESEND_FROM = (process.env.RESEND_FROM || "Cinemax <onboarding@resend.dev>").trim();

const EMAIL_USER = (process.env.EMAIL_USER || process.env.GMAIL_USER || process.env.ADMIN_EMAIL || "").trim();
// Gmail App Passwords are often copied as four space-separated groups. Gmail
// expects the raw 16-character token, so normalize whitespace here instead of
// requiring the Render dashboard value to be typed perfectly.
const EMAIL_APP_PASSWORD = (process.env.EMAIL_APP_PASSWORD || process.env.GMAIL_APP_PASSWORD || "").replace(/\s+/g, "").trim();

let transporter: ReturnType<typeof nodemailer.createTransport> | null = null;

if (!RESEND_API_KEY && EMAIL_USER && EMAIL_APP_PASSWORD) {
  transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: EMAIL_USER,
      pass: EMAIL_APP_PASSWORD,
    },
    // Fail fast instead of hanging the request indefinitely if the SMTP
    // connection can't be established (e.g. an egress firewall silently
    // drops the packets rather than rejecting the connection outright).
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 10_000,
  });
}

type MailerMode = "resend" | "smtp" | "none";

function getMode(): MailerMode {
  if (RESEND_API_KEY) return "resend";
  if (transporter) return "smtp";
  return "none";
}

export function isMailerConfigured(): boolean {
  return getMode() !== "none";
}

export function getMailerStatus() {
  const mode = getMode();
  return {
    configured: mode !== "none",
    mode,
    user: mode === "resend" ? RESEND_FROM : EMAIL_USER || null,
  };
}

/** Sends a one-time passcode to the admin's email address. */
export async function sendOtpEmail(toEmail: string, otp: string): Promise<void> {
  await sendEmail(
    toEmail,
    `Your Cinemax admin login code: ${otp}`,
    `Your one-time login code is ${otp}. It expires in 10 minutes.`,
    buildCodeEmailHtml("Your admin login code", "Enter this code to finish signing in to the Cinemax admin panel.", otp)
  );
}

/** Sends a sign-up verification code. */
export async function sendSignupVerificationEmail(toEmail: string, otp: string): Promise<void> {
  await sendEmail(
    toEmail,
    `Verify your Cinemax account: ${otp}`,
    `Your verification code is ${otp}. It expires in 10 minutes.`,
    buildCodeEmailHtml("Verify your email", "Enter this code to complete your Cinemax sign-up.", otp)
  );
}

/** Sends a password-reset OTP code — the user types this into the app, it is
 *  never embedded in a clickable link, so possessing the email is the only
 *  way to complete a reset. */
export async function sendPasswordResetEmail(toEmail: string, otp: string): Promise<void> {
  await sendEmail(
    toEmail,
    `Your Cinemax password reset code: ${otp}`,
    `Your password reset code is ${otp}. It expires in 10 minutes. If you didn't request this, you can ignore this email.`,
    buildCodeEmailHtml("Reset your password", "Enter this code in Cinemax to choose a new password.", otp)
  );
}

function buildCodeEmailHtml(title: string, subtitle: string, otp: string): string {
  return `
    <div style="font-family: -apple-system, Segoe UI, Roboto, sans-serif; max-width: 420px; margin: 0 auto; padding: 32px 24px; background:#0a0a0a; border-radius: 16px; color:#fff;">
      <div style="width:40px;height:40px;border-radius:12px;background:#22c55e;display:flex;align-items:center;justify-content:center;font-weight:900;color:#000;font-size:20px;">C</div>
      <h2 style="margin: 20px 0 8px; font-size: 18px;">${title}</h2>
      <p style="color:#a3a3a3; font-size: 13px; margin-bottom: 24px;">${subtitle} It expires in 10 minutes.</p>
      <div style="font-size: 32px; font-weight: 800; letter-spacing: 8px; background:#141414; border:1px solid #262626; border-radius:12px; padding: 16px; text-align:center;">${otp}</div>
      <p style="color:#525252; font-size: 11px; margin-top: 24px;">If you didn't request this, you can safely ignore this email.</p>
    </div>
  `;
}

async function sendEmail(toEmail: string, subject: string, text: string, html: string): Promise<void> {
  const mode = getMode();

  if (mode === "none") {
    console.error("[mailer] Not configured - RESEND_API_KEY:", !!RESEND_API_KEY, "EMAIL_USER:", !!EMAIL_USER, "EMAIL_APP_PASSWORD:", !!EMAIL_APP_PASSWORD);
    throw new Error("Email delivery is not configured on the server.");
  }

  console.log(`[mailer] Attempting to send email to: ${toEmail} (mode: ${mode})`);
  try {
    if (mode === "resend") {
      await sendViaResend(toEmail, subject, text, html);
    } else {
      await sendViaSmtp(toEmail, subject, text, html);
    }
    console.log("[mailer] Email sent successfully to:", toEmail);
  } catch (error: any) {
    console.error("[mailer] Failed to send email to:", toEmail);
    console.error("[mailer] Error details:", error?.message || error);
    if (error?.response) {
      console.error("[mailer] SMTP response:", error.response);
    }
    if (error?.code) {
      console.error("[mailer] Error code:", error.code);
    }
    throw new Error("Failed to send email: " + (error?.message || "Unknown error"));
  }
}

/** Sends over HTTPS via Resend's REST API — no SMTP ports involved, so this
 *  works even on hosts (like Render's free tier) that block outbound SMTP. */
async function sendViaResend(toEmail: string, subject: string, text: string, html: string): Promise<void> {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: RESEND_FROM,
      to: [toEmail],
      subject,
      text,
      html,
    }),
  });

  if (!res.ok) {
    let detail = "";
    try {
      const body = await res.json();
      detail = body?.message || JSON.stringify(body);
    } catch {
      detail = await res.text().catch(() => "");
    }
    throw new Error(`Resend API error (${res.status}): ${detail || "unknown error"}`);
  }
}

async function sendViaSmtp(toEmail: string, subject: string, text: string, html: string): Promise<void> {
  if (!transporter) {
    throw new Error("SMTP transporter is not configured.");
  }
  await transporter.sendMail({
    from: `"Cinemax" <${EMAIL_USER}>`,
    to: toEmail,
    subject,
    text,
    html,
  });
}
