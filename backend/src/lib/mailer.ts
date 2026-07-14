// ---------------------------------------------------------------------------
// MAILER — uses dual email services:
// - Brevo (Sendinblue) for user Sign Up and Forgot Password OTP emails
// - Resend for Admin Panel login OTP emails
// Configured via BREVO_API_KEY and RESEND_API_KEY in .env.
// ---------------------------------------------------------------------------

import { Resend } from "resend";

const BREVO_API_KEY = (process.env.BREVO_API_KEY || "").trim();
const RESEND_API_KEY = (process.env.RESEND_API_KEY || "").trim();
const FROM_EMAIL = "cinemaxmov01@gmail.com";

let resend: Resend | null = null;
let brevoConfigured = false;
let resendConfigured = false;

if (BREVO_API_KEY) {
  brevoConfigured = true;
  console.log("[mailer] Brevo API configured");
} else {
  console.log("[mailer] Brevo API not configured - BREVO_API_KEY missing");
}

if (RESEND_API_KEY) {
  resend = new Resend(RESEND_API_KEY);
  resendConfigured = true;
  console.log("[mailer] Resend SDK configured");
} else {
  console.log("[mailer] Resend SDK not configured - RESEND_API_KEY missing");
}

export function isMailerConfigured(): boolean {
  return brevoConfigured || resendConfigured;
}

export function getMailerStatus() {
  return {
    configured: isMailerConfigured(),
    user: FROM_EMAIL,
    brevoConfigured,
    resendConfigured,
  };
}

/** Sends a one-time passcode to the admin's email address using Resend. */
export async function sendOtpEmail(toEmail: string, otp: string): Promise<void> {
  if (!resendConfigured || !resend) {
    throw new Error("Resend email service is not configured for admin login.");
  }
  await sendViaResend(
    toEmail,
    `Your Cinemax admin login code: ${otp}`,
    `Your one-time login code is ${otp}. It expires in 10 minutes.`,
    buildCodeEmailHtml("Your admin login code", "Enter this code to finish signing in to the Cinemax admin panel.", otp)
  );
}

/** Sends a sign-up verification code using Brevo. */
export async function sendSignupVerificationEmail(toEmail: string, otp: string): Promise<void> {
  if (!brevoConfigured) {
    throw new Error("Brevo email service is not configured for sign-up verification.");
  }
  await sendViaBrevo(
    toEmail,
    `Verify your Cinemax account: ${otp}`,
    `Your verification code is ${otp}. It expires in 10 minutes.`,
    buildCodeEmailHtml("Verify your email", "Enter this code to complete your Cinemax sign-up.", otp)
  );
}

/** Sends a password-reset OTP code using Brevo. */
export async function sendPasswordResetEmail(toEmail: string, otp: string): Promise<void> {
  if (!brevoConfigured) {
    throw new Error("Brevo email service is not configured for password reset.");
  }
  await sendViaBrevo(
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

async function sendViaBrevo(toEmail: string, subject: string, text: string, html: string): Promise<void> {
  try {
    console.log("[mailer] Sending via Brevo to:", toEmail);
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': BREVO_API_KEY,
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        sender: { name: 'Cinemax', email: FROM_EMAIL },
        to: [{ email: toEmail }],
        subject,
        htmlContent: html,
        textContent: text
      })
    });

    const data = await response.json();
    console.log('[mailer] Brevo response:', data);

    if (!response.ok) {
      throw new Error(`Brevo API error: ${response.status} - ${JSON.stringify(data)}`);
    }

    console.log("[mailer] Email sent successfully via Brevo to:", toEmail);
  } catch (error: any) {
    console.error("[mailer] Brevo error:", error);
    throw new Error("Failed to send email via Brevo: " + (error?.message || "Unknown error"));
  }
}

async function sendViaResend(toEmail: string, subject: string, text: string, html: string): Promise<void> {
  if (!resend) {
    throw new Error("Resend SDK not initialized");
  }
  try {
    console.log("[mailer] Sending via Resend to:", toEmail);
    const { data, error } = await resend.emails.send({
      from: `Cinemax <${FROM_EMAIL}>`,
      to: [toEmail],
      subject,
      text,
      html,
    });

    if (error) {
      console.error("[mailer] Resend API error:", error);
      throw new Error(`Resend API error: ${error.message}`);
    }

    console.log("[mailer] Email sent successfully via Resend to:", toEmail, "ID:", data?.id);
  } catch (error: any) {
    console.error("[mailer] Resend error:", error);
    throw new Error("Failed to send email via Resend: " + (error?.message || "Unknown error"));
  }
}
