// ---------------------------------------------------------------------------
// MAILER — uses Resend SDK to deliver one-time passcodes for sign-up,
// forgot password, and admin login. Configured via RESEND_API_KEY in .env.
// Get a free API key at https://resend.com/api-keys.
// ---------------------------------------------------------------------------

import { Resend } from "resend";

const RESEND_API_KEY = (process.env.RESEND_API_KEY || "").trim();
const FROM_EMAIL = process.env.EMAIL_USER || "onboarding@resend.dev";

let resend: Resend | null = null;
let configured = false;

if (RESEND_API_KEY) {
  resend = new Resend(RESEND_API_KEY);
  configured = true;
  console.log("[mailer] Resend SDK configured");
} else {
  console.log("[mailer] Resend SDK not configured - RESEND_API_KEY missing");
}

export function isMailerConfigured(): boolean {
  return configured;
}

export function getMailerStatus() {
  return {
    configured,
    user: FROM_EMAIL,
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
  if (!resend) {
    console.error("[mailer] Resend SDK not initialized");
    throw new Error("Email delivery is not configured on the server.");
  }
  try {
    console.log("[mailer] Attempting to send email to:", toEmail);
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

    console.log("[mailer] Email sent successfully to:", toEmail, "ID:", data?.id);
  } catch (error: any) {
    console.error("[mailer] Failed to send email to:", toEmail);
    console.error("[mailer] Error details:", error?.message || error);
    throw new Error("Failed to send email: " + (error?.message || "Unknown error"));
  }
}
