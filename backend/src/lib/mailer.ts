// ---------------------------------------------------------------------------
// MAILER — uses Brevo (Sendinblue) HTTP API to deliver one-time passcodes
// for sign-up, forgot password, and admin login. Configured via BREVO_API_KEY
// in .env. Get a free API key at https://app.brevo.com/settings/keys/api
// ---------------------------------------------------------------------------

const BREVO_API_KEY = (process.env.BREVO_API_KEY || "").trim();
const FROM_EMAIL = "cinemaxmov01@gmail.com";

let configured = false;

if (BREVO_API_KEY) {
  configured = true;
  console.log("[mailer] Brevo API configured");
} else {
  console.log("[mailer] Brevo API not configured - BREVO_API_KEY missing");
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
  if (!configured) {
    console.error("[mailer] Brevo API not configured");
    throw new Error("Email delivery is not configured on the server.");
  }
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
