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

// The Resend SDK (v4+) does NOT throw on a failed send — it resolves with
// { data, error }, where `error` holds the failure reason (bad from-address,
// unverified domain, invalid recipient, etc). Checking only `await ...send()`
// without inspecting this field meant failures were being silently
// swallowed — the call "succeeded" from the caller's point of view even when
// no email actually went out. This helper makes that failure visible by
// throwing, so index.js's existing try/catch logs it properly.
async function sendOrThrow(payload) {
  const { data, error } = await resend.emails.send(payload);
  if (error) {
    throw new Error(`Resend error: ${error.message || JSON.stringify(error)}`);
  }
  return data;
}

export async function sendPasswordResetEmail(to, token) {
  if (!resend) return; // silently no-op if Resend isn't configured yet — the caller already logs a warning
  const link = `${FRONTEND_URL}/reset-password?token=${token}`;
  await sendOrThrow({
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
  await sendOrThrow({
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
