// ---------------------------------------------------------
// Email & Communication Center — campaign resolution + bulk sending.
//
// Audience resolution always reads live from the existing `users` table
// (via store.js) — there is no separate email/user store, so BookInn can
// grow to thousands of users without this needing to change.
//
// Sending happens here, on the server, in small concurrent batches against
// the existing Resend client (server/email.js) — never in the browser.
// ---------------------------------------------------------
import { store } from "./store.js";
import { sendEmail, personalizeContent, buildBrandedEmailHtml } from "./email.js";
import crypto from "crypto";

export const AUDIENCE_TYPES = ["all", "Student", "Parent", "Owner", "selected"];
export const CAMPAIGN_STATUSES = [
  "draft", "queued", "sending", "completed", "partially_failed", "failed", "scheduled", "cancelled",
];

// Resolves an audience type + optional explicit user id list into the actual
// list of {id, name, email, role} recipients, straight from the users table.
// Campaigns from the Email Center are all optional/announcement in nature,
// so every audience (including "Selected Users") is filtered down to users
// who haven't opted out of marketing_emails — the count shown to the admin
// before sending is exactly who will receive it.
export async function resolveAudience(audienceType, selectedUserIds = []) {
  if (audienceType === "selected") {
    const ids = (selectedUserIds || []).map(Number).filter(Boolean);
    const users = await store.getUsersByIds(ids);
    return users.filter((u) => u.marketingEmails !== false);
  }
  if (audienceType === "all") {
    return store.getAllNonAdminUsers({ marketingOnly: true });
  }
  if (["Student", "Parent", "Owner"].includes(audienceType)) {
    return store.getUsersByRole(audienceType, { marketingOnly: true });
  }
  return [];
}

// Same shape, used for the "how many recipients would this be" counts shown
// live in the composer — cheap aggregate counts, not full row fetches.
export async function audienceCounts() {
  return store.getMarketingEligibleCountsByRole();
}

function unsubscribeToken(userId) {
  // HMAC over the user id using the app's existing JWT_SECRET — no new
  // secret to configure, and it can't be forged or reused for anything else.
  const secret = process.env.JWT_SECRET || "bookinn-dev-secret-change-me";
  return crypto.createHmac("sha256", secret).update(String(userId)).digest("hex").slice(0, 32);
}

export function verifyUnsubscribeToken(userId, token) {
  return unsubscribeToken(userId) === token;
}

export function unsubscribeUrl(userId) {
  const base = process.env.FRONTEND_URL || "https://bookinngh.com";
  return `${base.replace(/\/$/, "")}/api/emails/unsubscribe?uid=${userId}&token=${unsubscribeToken(userId)}`;
}

// Sends one recipient's email and records the result — never throws, always
// resolves so Promise.allSettled-style batching can't be short-circuited by
// one bad address.
async function sendToRecipient(campaign, recipient) {
  try {
    const personalizedSubject = personalizeContent(campaign.subject, recipient);
    const personalizedBody = personalizeContent(campaign.content, recipient);
    const html = buildBrandedEmailHtml({
      subject: personalizedSubject,
      bodyHtml: personalizedBody,
      unsubscribeUrl: unsubscribeUrl(recipient.id),
    });
    const data = await sendEmail({ to: recipient.email, subject: personalizedSubject, html });
    await store.updateEmailRecipient(recipient.recipientRowId, {
      status: "sent",
      providerMessageId: data?.id || null,
      sentAt: new Date(),
    });
    return { ok: true };
  } catch (err) {
    await store.updateEmailRecipient(recipient.recipientRowId, {
      status: "failed",
      error: String(err?.message || err).slice(0, 500),
    });
    return { ok: false };
  }
}

const BATCH_SIZE = 10; // small concurrent batches — friendly to Resend's rate limits
const BATCH_DELAY_MS = 350;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// The actual bulk-send. Runs after the HTTP response for campaign creation
// has already gone back to the admin (see index.js) — the browser only ever
// creates/tracks the campaign; this is what does the real work.
export async function processCampaign(campaignId) {
  const campaign = await store.getEmailCampaignById(campaignId);
  if (!campaign) return;
  if (!["queued", "scheduled"].includes(campaign.status)) return; // idempotency guard

  await store.updateEmailCampaign(campaignId, { status: "sending" });

  const { recipients } = await store.getEmailRecipientsByCampaign(campaignId, { limit: 1000000, offset: 0 });
  for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
    const batch = recipients.slice(i, i + BATCH_SIZE);
    await Promise.allSettled(
      batch.map((r) =>
        sendToRecipient(campaign, {
          recipientRowId: r.id,
          id: r.userId,
          name: r.name,
          email: r.email,
          role: undefined,
        })
      )
    );
    if (i + BATCH_SIZE < recipients.length) await sleep(BATCH_DELAY_MS);
  }

  const updated = await store.recalculateCampaignCounts(campaignId);
  const allFailed = updated.recipientCount > 0 && updated.failedCount === updated.recipientCount;
  const someFailed = updated.failedCount > 0 && !allFailed;
  const finalStatus = allFailed ? "failed" : someFailed ? "partially_failed" : "completed";
  await store.updateEmailCampaign(campaignId, { status: finalStatus, sentAt: new Date() });
}

// Creates the campaign row + its recipient rows, then (for "send now")
// kicks off async processing without blocking the response. Recipients are
// resolved and validated server-side from the real audience — the frontend
// never supplies the recipient list itself, only the audience selection.
export async function createAndDispatchCampaign({ subject, content, audienceType, selectedUserIds, templateId, action, scheduledAt, createdBy, createdByName, idempotencyKey }) {
  if (idempotencyKey) {
    const existing = await store.getEmailCampaignByIdempotencyKey(idempotencyKey);
    if (existing) return { campaign: existing, duplicate: true };
  }

  const recipients = await resolveAudience(audienceType, selectedUserIds);

  let status = "draft";
  if (action === "schedule") status = "scheduled";
  else if (action === "send") status = recipients.length ? "queued" : "failed";

  const campaign = await store.createEmailCampaign({
    subject, content, audienceType,
    selectedUserIds: audienceType === "selected" ? (selectedUserIds || []).map(Number) : [],
    templateId: templateId || null,
    status,
    recipientCount: recipients.length,
    createdBy, createdByName,
    scheduledAt: action === "schedule" ? scheduledAt : null,
    idempotencyKey: idempotencyKey || null,
  });

  if (action !== "draft" && recipients.length) {
    await store.addEmailRecipients(
      campaign.id,
      recipients.map((r) => ({ userId: r.id, name: r.name, email: r.email }))
    );
  }

  if (action === "send" && recipients.length) {
    // Fire-and-forget — the request returns immediately with status "queued";
    // the admin watches progress via Campaign History / dashboard refresh.
    processCampaign(campaign.id).catch((err) => console.error(`Campaign ${campaign.id} failed to process:`, err));
  }

  return { campaign, duplicate: false };
}

// Polls for due scheduled campaigns. This app runs as a single Node process
// (no Redis/queue in the stack), so an in-process poll is the real —
// not fake — scheduling mechanism available here: a campaign saved with
// status "scheduled" and a future scheduled_at genuinely gets picked up and
// sent once that time arrives, with no admin action required.
const SCHEDULE_POLL_MS = 60 * 1000;
export function startScheduler() {
  setInterval(async () => {
    try {
      const due = await store.getDueScheduledCampaigns();
      for (const c of due) {
        await store.updateEmailCampaign(c.id, { status: "queued" });
        processCampaign(c.id).catch((err) => console.error(`Scheduled campaign ${c.id} failed to process:`, err));
      }
    } catch (err) {
      console.error("Scheduler poll failed:", err);
    }
  }, SCHEDULE_POLL_MS);
}
