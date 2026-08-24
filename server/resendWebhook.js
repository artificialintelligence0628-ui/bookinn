// Verifies + handles Resend delivery-event webhooks (delivered, bounced,
// opened, clicked, etc) so Campaign History reflects real provider data
// instead of guessed/faked analytics.
//
// Resend signs webhooks in the Svix format (svix-id / svix-timestamp /
// svix-signature headers, HMAC-SHA256 over "id.timestamp.body" using a
// base64 "whsec_..." secret). That's a well-documented, small amount of
// crypto — implemented here with Node's built-in `crypto` module rather
// than pulling in the separate `svix` package for it.
import crypto from "crypto";
import { store } from "./store.js";

export function verifyResendWebhook(req) {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!secret) return true; // not configured — caller decides whether to accept anyway (see index.js)

  const id = req.headers["svix-id"];
  const timestamp = req.headers["svix-timestamp"];
  const signatureHeader = req.headers["svix-signature"];
  if (!id || !timestamp || !signatureHeader) return false;

  const secretBytes = Buffer.from(secret.replace(/^whsec_/, ""), "base64");
  const signedContent = `${id}.${timestamp}.${req.rawBody}`;
  const expected = crypto.createHmac("sha256", secretBytes).update(signedContent).digest("base64");

  return signatureHeader
    .split(" ")
    .some((part) => {
      const sig = part.includes(",") ? part.split(",")[1] : part;
      try {
        return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
      } catch {
        return false;
      }
    });
}

// Maps a Resend event to a recipient-row status update. Only ever updates
// existing rows matched by the provider message id we stored at send time —
// never invents delivery data.
export async function handleResendEvent(event) {
  const type = event?.type;
  const messageId = event?.data?.email_id;
  if (!messageId) return;

  const now = new Date();
  switch (type) {
    case "email.delivered":
      await store.updateEmailRecipientByMessageId(messageId, { status: "delivered", deliveredAt: now });
      break;
    case "email.bounced":
      await store.updateEmailRecipientByMessageId(messageId, { status: "bounced", error: event?.data?.bounce?.message || "Bounced" });
      break;
    case "email.delivery_delayed":
      // still in flight — no status change needed beyond what's already recorded
      break;
    case "email.complained":
      await store.updateEmailRecipientByMessageId(messageId, { status: "bounced", error: "Recipient marked as spam" });
      break;
    case "email.opened":
      await store.updateEmailRecipientByMessageId(messageId, { openedAt: now });
      break;
    case "email.clicked":
      await store.updateEmailRecipientByMessageId(messageId, { clickedAt: now });
      break;
    case "email.failed":
      await store.updateEmailRecipientByMessageId(messageId, { status: "failed", error: event?.data?.failure?.reason || "Send failed" });
      break;
    default:
      return;
  }

  // Keep the parent campaign's aggregate counts in sync with recipient rows.
  const recipient = await store.getEmailRecipientByMessageId(messageId);
  if (recipient?.campaignId) await store.recalculateCampaignCounts(recipient.campaignId);
}
