import "dotenv/config";
import { Resend } from "resend";

// Same pattern as cloudinary.js — configured lazily from an env var, with a
// clear warning (not a crash) if it's missing, so the rest of the server
// still runs even before RESEND_API_KEY is set.
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

export const emailConfigured = Boolean(process.env.RESEND_API_KEY);

if (!emailConfigured) {
  console.warn(
    "⚠️  Resend is not configured. Set RESEND_API_KEY in your .env — " +
    "password reset and email verification links will not be sent until you do."
  );
}

// Must be an address on the domain you verified in Resend (e.g. bookinngh.com).
const FROM = process.env.EMAIL_FROM || "BookInn <noreply@bookinngh.com>";
// Used to build the links inside emails — e.g. https://bookinngh.com/reset-password?token=...
const FRONTEND_URL = process.env.FRONTEND_URL || "https://bookinngh.com";

export async function sendPasswordResetEmail(to, token) {
  if (!resend) return; // silently no-op if Resend isn't configured yet — the caller already logs a warning
  const link = `${FRONTEND_URL}/reset-password?token=${token}`;
  await resend.emails.send({
    from: FROM,
    to,
    subject: "Reset your BookInn password",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; color: #1a1a1a;">
        <h2 style="color: #003580;">Reset your password</h2>
        <p>We received a request to reset the password for your BookInn account.</p>
        <p>
          <a href="${link}" style="display: inline-block; background: #0071c2; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: bold;">
            Reset password
          </a>
        </p>
        <p style="font-size: 13px; color: #6b6b6b;">This link expires in 1 hour. If you didn't request this, you can safely ignore this email — your password won't change.</p>
        <p style="font-size: 13px; color: #98a2b3;">Or paste this link into your browser: ${link}</p>
      </div>
    `,
  });
}

export async function sendVerificationEmail(to, token) {
  if (!resend) return;
  const link = `${FRONTEND_URL}/verify-email?token=${token}`;
  await resend.emails.send({
    from: FROM,
    to,
    subject: "Confirm your BookInn email address",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; color: #1a1a1a;">
        <h2 style="color: #003580;">Welcome to BookInn</h2>
        <p>Please confirm this is your email address to finish setting up your account.</p>
        <p>
          <a href="${link}" style="display: inline-block; background: #0071c2; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: bold;">
            Confirm email
          </a>
        </p>
        <p style="font-size: 13px; color: #6b6b6b;">This link expires in 24 hours.</p>
        <p style="font-size: 13px; color: #98a2b3;">Or paste this link into your browser: ${link}</p>
      </div>
    `,
  });
}
