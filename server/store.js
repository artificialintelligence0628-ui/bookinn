import { pool } from "./db.js";

// ---------------------------------------------------------
// Row <-> app-object mapping. Everywhere else in the app (index.js, plans.js)
// keeps using the same camelCase shapes it always did — only this file knows
// about SQL / column names.
// ---------------------------------------------------------

function mapUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    passwordHash: row.password_hash,
    role: row.role,
    subscription: row.subscription,
    hasUsedFreeTrial: row.has_used_free_trial,
    createdAt: row.created_at,
    emailVerified: row.email_verified,
  };
}

function mapListing(row) {
  if (!row) return null;
  return {
    id: row.id,
    ownerId: row.owner_id,
    name: row.name,
    type: row.type,
    roomOptions: row.room_options,
    roomType: row.room_type,
    price: Number(row.price),
    bath: row.bath,
    kitchen: row.kitchen,
    university: row.university,
    distance: row.distance,
    pricingPeriod: row.pricing_period,
    rating: Number(row.rating),
    reviewCount: row.review_count,
    featured: row.featured,
    image: row.image,
    images: row.images,
    video: row.video,
    walkthrough: row.walkthrough,
    amenities: row.amenities,
    desc: row.desc,
    locationDescription: row.location_description,
    ownerEmail: row.owner_email,
    ownerWhatsapp: row.owner_whatsapp,
    availability: row.availability,
    reviews: row.reviews,
    views: row.views,
  };
}

function mapInquiry(row) {
  if (!row) return null;
  return {
    id: row.id,
    listingId: row.listing_id,
    name: row.name,
    phone: row.phone,
    email: row.email,
    moveIn: row.move_in,
    message: row.message,
    roomType: row.room_type,
    createdAt: row.created_at,
    confirmedResident: !!row.confirmed_resident,
  };
}

const LISTING_COLUMNS = {
  name: "name", type: "type", roomOptions: "room_options", roomType: "room_type",
  price: "price", bath: "bath", kitchen: "kitchen", university: "university",
  distance: "distance", pricingPeriod: "pricing_period", rating: "rating",
  reviewCount: "review_count", featured: "featured", image: "image",
  images: "images", video: "video", walkthrough: "walkthrough",
  amenities: "amenities", desc: '"desc"', locationDescription: "location_description",
  ownerEmail: "owner_email", ownerWhatsapp: "owner_whatsapp",
  availability: "availability", reviews: "reviews", views: "views",
};
const JSONB_LISTING_FIELDS = new Set(["roomOptions", "images", "walkthrough", "amenities", "reviews", "views"]);

function defaultSubscription() {
  return {
    tier: null, status: "none",
    trialStartedAt: null, trialEndsAt: null,
    subscriptionStartedAt: null, subscriptionEndsAt: null,
    cancelledAt: null, remindersSent: {},
  };
}

export const store = {
  // ---- listings ----
  async getListings() {
    const { rows } = await pool.query("SELECT * FROM listings ORDER BY id DESC");
    return rows.map(mapListing);
  },
  async getListingsByOwner(ownerId) {
    const { rows } = await pool.query("SELECT * FROM listings WHERE owner_id = $1 ORDER BY id DESC", [ownerId]);
    return rows.map(mapListing);
  },
  async addListing(listing) {
    const { rows } = await pool.query(
      `INSERT INTO listings
        (owner_id, name, type, room_options, room_type, price, bath, kitchen, university,
         distance, pricing_period, rating, review_count, featured, image, images, video,
        walkthrough, amenities, "desc", location_description, owner_email, owner_whatsapp,
         availability, reviews, views)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26)
       RETURNING *`,
      [
        listing.ownerId, listing.name, listing.type,
        JSON.stringify(listing.roomOptions || []), listing.roomType, listing.price,
        listing.bath, !!listing.kitchen, listing.university, listing.distance,
        listing.pricingPeriod, listing.rating ?? 0, listing.reviewCount ?? 0,
        !!listing.featured, listing.image, JSON.stringify(listing.images || []),
        listing.video || "", JSON.stringify(listing.walkthrough || []),
        JSON.stringify(listing.amenities || []), listing.desc || "",
        listing.locationDescription || "", listing.ownerEmail || "",
        listing.ownerWhatsapp || "", listing.availability, JSON.stringify(listing.reviews || []),
        JSON.stringify([]),
      ]
    );
    return mapListing(rows[0]);
  },
  async recordListingView(id) {
    const { rows } = await pool.query("SELECT views FROM listings WHERE id = $1", [id]);
    if (!rows[0]) return null;
    const views = [...(rows[0].views || []), new Date().toISOString()].slice(-5000);
    const { rows: updated } = await pool.query(
      "UPDATE listings SET views = $1 WHERE id = $2 RETURNING *",
      [JSON.stringify(views), id]
    );
    return mapListing(updated[0]);
  },
  async updateListing(id, patch) {
    const sets = [];
    const values = [];
    let i = 1;
    for (const [key, val] of Object.entries(patch)) {
      const col = LISTING_COLUMNS[key];
      if (!col) continue;
      sets.push(`${col} = $${i}`);
      values.push(JSONB_LISTING_FIELDS.has(key) ? JSON.stringify(val) : val);
      i += 1;
    }
    if (!sets.length) {
      const { rows } = await pool.query("SELECT * FROM listings WHERE id = $1", [id]);
      return mapListing(rows[0]);
    }
    values.push(id);
    const { rows } = await pool.query(
      `UPDATE listings SET ${sets.join(", ")} WHERE id = $${i} RETURNING *`,
      values
    );
    return mapListing(rows[0]);
  },
  async deleteListing(id) {
    const { rowCount } = await pool.query("DELETE FROM listings WHERE id = $1", [id]);
    return rowCount > 0;
  },
  async addReview(listingId, review) {
    const { rows } = await pool.query("SELECT * FROM listings WHERE id = $1", [listingId]);
    if (!rows[0]) return null;
    const listing = mapListing(rows[0]);
    const reviews = [...(listing.reviews || []), review];
    const priorTotal = (listing.rating || 0) * (listing.reviewCount || 0);
    const newTotal = priorTotal + review.rating;
    const newCount = (listing.reviewCount || 0) + 1;
    const newRating = Math.round((newTotal / newCount) * 10) / 10;
    const { rows: updated } = await pool.query(
      "UPDATE listings SET reviews = $1, review_count = $2, rating = $3 WHERE id = $4 RETURNING *",
      [JSON.stringify(reviews), newCount, newRating, listingId]
    );
    return mapListing(updated[0]);
  },

  // ---- users ----
  async getUserByEmail(email) {
    const { rows } = await pool.query("SELECT * FROM users WHERE lower(email) = lower($1)", [email]);
    return mapUser(rows[0]);
  },
  async getUserById(id) {
    const { rows } = await pool.query("SELECT * FROM users WHERE id = $1", [id]);
    return mapUser(rows[0]);
  },
  async addUser({ name, email, passwordHash, role }) {
    const { rows } = await pool.query(
      `INSERT INTO users (name, email, password_hash, role, subscription, has_used_free_trial)
       VALUES ($1,$2,$3,$4,$5,false) RETURNING *`,
      [name, email, passwordHash, role || "Student", JSON.stringify(defaultSubscription())]
    );
    return mapUser(rows[0]);
  },
  async setUserSubscription(id, tier) {
    const now = new Date();
    const nextBilling = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
    const user = await this.getUserById(id);
    if (!user) return null;
    const subscription = {
      ...user.subscription,
      tier,
      status: "active",
      subscriptionStartedAt: now.toISOString(),
      subscriptionEndsAt: nextBilling.toISOString(),
      cancelledAt: null,
      remindersSent: {},
    };
    const { rows } = await pool.query(
      "UPDATE users SET subscription = $1 WHERE id = $2 RETURNING *",
      [JSON.stringify(subscription), id]
    );
    return mapUser(rows[0]);
  },
  async cancelSubscription(id) {
    const user = await this.getUserById(id);
    if (!user) return null;
    const subscription = { ...user.subscription, status: "cancelled", cancelledAt: new Date().toISOString() };
    const { rows } = await pool.query(
      "UPDATE users SET subscription = $1 WHERE id = $2 RETURNING *",
      [JSON.stringify(subscription), id]
    );
    return mapUser(rows[0]);
  },
  async markReminderSent(id, key) {
    const user = await this.getUserById(id);
    if (!user) return null;
    const subscription = {
      ...user.subscription,
      remindersSent: { ...(user.subscription.remindersSent || {}), [key]: true },
    };
    const { rows } = await pool.query(
      "UPDATE users SET subscription = $1 WHERE id = $2 RETURNING *",
      [JSON.stringify(subscription), id]
    );
    return mapUser(rows[0]);
  },
  async getUsers() {
    const { rows } = await pool.query("SELECT * FROM users ORDER BY id ASC");
    return rows.map(mapUser);
  },

  // ---- password reset ----
  // The token itself is a random string generated in index.js (never the raw
  // password) — this just stores it with an expiry so /reset-password can
  // look the user up and confirm the link hasn't gone stale.
  async setResetToken(userId, token, expiresAt) {
    await pool.query(
      "UPDATE users SET reset_token = $1, reset_token_expires = $2 WHERE id = $3",
      [token, expiresAt, userId]
    );
  },
  async getUserByResetToken(token) {
    const { rows } = await pool.query(
      "SELECT * FROM users WHERE reset_token = $1 AND reset_token_expires > now()",
      [token]
    );
    return mapUser(rows[0]);
  },
  async resetPassword(userId, passwordHash) {
    // Clearing the token on use means a reset link only ever works once.
    const { rows } = await pool.query(
      "UPDATE users SET password_hash = $1, reset_token = NULL, reset_token_expires = NULL WHERE id = $2 RETURNING *",
      [passwordHash, userId]
    );
    return mapUser(rows[0]);
  },

  // ---- email verification ----
  async setVerifyToken(userId, token, expiresAt) {
    await pool.query(
      "UPDATE users SET verify_token = $1, verify_token_expires = $2 WHERE id = $3",
      [token, expiresAt, userId]
    );
  },
  async getUserByVerifyToken(token) {
    const { rows } = await pool.query(
      "SELECT * FROM users WHERE verify_token = $1 AND verify_token_expires > now()",
      [token]
    );
    return mapUser(rows[0]);
  },
  async markEmailVerified(userId) {
    const { rows } = await pool.query(
      "UPDATE users SET email_verified = true, verify_token = NULL, verify_token_expires = NULL WHERE id = $1 RETURNING *",
      [userId]
    );
    return mapUser(rows[0]);
  },

  // ---- inquiries ----
  async addInquiry(inquiry) {
    const { rows } = await pool.query(
      `INSERT INTO inquiries (listing_id, name, phone, email, move_in, message, room_type)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [inquiry.listingId, inquiry.name, inquiry.phone || null, inquiry.email || null,
       inquiry.moveIn || null, inquiry.message || null, inquiry.roomType || null]
    );
    return mapInquiry(rows[0]);
  },
async getInquiries() {
    const { rows } = await pool.query("SELECT * FROM inquiries ORDER BY id DESC");
    return rows.map(mapInquiry);
  },
  async setConfirmedResident(id, confirmed) {
    const { rows } = await pool.query(
      "UPDATE inquiries SET confirmed_resident = $1 WHERE id = $2 RETURNING *",
      [confirmed, id]
    );
    return mapInquiry(rows[0]);
  },

  // ---- Email & Communication Center ----
  // Everything below reads/writes the SAME `users` table above — there is no
  // separate email-address store. Roles are the existing Student/Parent/Owner
  // values already on the users row.
  async getUserCountsByRole() {
    const { rows } = await pool.query(
      `SELECT role, count(*)::int AS count FROM users WHERE role <> 'Admin' GROUP BY role`
    );
    const counts = { Student: 0, Parent: 0, Owner: 0 };
    let all = 0;
    for (const r of rows) {
      if (counts[r.role] !== undefined) counts[r.role] = r.count;
      all += r.count;
    }
    return { all, ...counts };
  },
  // Marketing-eligible counts (marketing_emails = true), used for the audience
  // picker so the admin sees the number of people who will actually receive
  // an optional/announcement campaign, not just the raw role count.
  async getMarketingEligibleCountsByRole() {
    const { rows } = await pool.query(
      `SELECT role, count(*)::int AS count FROM users WHERE role <> 'Admin' AND marketing_emails = true GROUP BY role`
    );
    const counts = { Student: 0, Parent: 0, Owner: 0 };
    let all = 0;
    for (const r of rows) {
      if (counts[r.role] !== undefined) counts[r.role] = r.count;
      all += r.count;
    }
    return { all, ...counts };
  },
  // Server-side searchable/paginated user picker for "Selected Users" — never
  // ships the whole user table to the browser.
  async searchUsers({ search = "", role = "", limit = 20, offset = 0 } = {}) {
    const clauses = ["role <> 'Admin'"];
    const values = [];
    let i = 1;
    if (search.trim()) {
      clauses.push(`(name ILIKE $${i} OR email ILIKE $${i})`);
      values.push(`%${search.trim()}%`);
      i += 1;
    }
    if (role && role !== "All") {
      clauses.push(`role = $${i}`);
      values.push(role);
      i += 1;
    }
    const where = `WHERE ${clauses.join(" AND ")}`;
    const { rows: countRows } = await pool.query(`SELECT count(*)::int AS count FROM users ${where}`, values);
    values.push(limit, offset);
    const { rows } = await pool.query(
      `SELECT id, name, email, role, marketing_emails FROM users ${where} ORDER BY name ASC LIMIT $${i} OFFSET $${i + 1}`,
      values
    );
    return { total: countRows[0]?.count || 0, users: rows.map((r) => ({ id: r.id, name: r.name, email: r.email, role: r.role, marketingEmails: r.marketing_emails })) };
  },
  async getUsersByIds(ids) {
    if (!ids || !ids.length) return [];
    const { rows } = await pool.query(
      `SELECT id, name, email, role, marketing_emails FROM users WHERE id = ANY($1::int[]) AND role <> 'Admin'`,
      [ids]
    );
    return rows.map((r) => ({ id: r.id, name: r.name, email: r.email, role: r.role, marketingEmails: r.marketing_emails }));
  },
  async getUsersByRole(role, { marketingOnly = false } = {}) {
    const clauses = ["role = $1"];
    const values = [role];
    if (marketingOnly) clauses.push("marketing_emails = true");
    const { rows } = await pool.query(
      `SELECT id, name, email, role, marketing_emails FROM users WHERE ${clauses.join(" AND ")}`,
      values
    );
    return rows.map((r) => ({ id: r.id, name: r.name, email: r.email, role: r.role, marketingEmails: r.marketing_emails }));
  },
  async getAllNonAdminUsers({ marketingOnly = false } = {}) {
    const clauses = ["role <> 'Admin'"];
    if (marketingOnly) clauses.push("marketing_emails = true");
    const { rows } = await pool.query(
      `SELECT id, name, email, role, marketing_emails FROM users WHERE ${clauses.join(" AND ")}`
    );
    return rows.map((r) => ({ id: r.id, name: r.name, email: r.email, role: r.role, marketingEmails: r.marketing_emails }));
  },
  async setMarketingPreference(userId, marketingEmails) {
    const { rows } = await pool.query(
      "UPDATE users SET marketing_emails = $1 WHERE id = $2 RETURNING *",
      [marketingEmails, userId]
    );
    return mapUser(rows[0]);
  },

  // ---- email templates ----
  async getEmailTemplates() {
    const { rows } = await pool.query("SELECT * FROM email_templates ORDER BY id ASC");
    return rows.map(mapEmailTemplate);
  },
  async getEmailTemplateById(id) {
    const { rows } = await pool.query("SELECT * FROM email_templates WHERE id = $1", [id]);
    return mapEmailTemplate(rows[0]);
  },
  async createEmailTemplate({ name, subject, content, category, createdBy }) {
    const { rows } = await pool.query(
      `INSERT INTO email_templates (name, subject, content, category, created_by)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [name, subject || "", content || "", category || "General", createdBy || null]
    );
    return mapEmailTemplate(rows[0]);
  },
  async updateEmailTemplate(id, patch) {
    const cols = { name: "name", subject: "subject", content: "content", category: "category" };
    const sets = [];
    const values = [];
    let i = 1;
    for (const [key, col] of Object.entries(cols)) {
      if (patch[key] === undefined) continue;
      sets.push(`${col} = $${i}`);
      values.push(patch[key]);
      i += 1;
    }
    sets.push(`updated_at = now()`);
    if (!sets.length) return this.getEmailTemplateById(id);
    values.push(id);
    const { rows } = await pool.query(
      `UPDATE email_templates SET ${sets.join(", ")} WHERE id = $${i} RETURNING *`,
      values
    );
    return mapEmailTemplate(rows[0]);
  },
  async deleteEmailTemplate(id) {
    const { rowCount } = await pool.query("DELETE FROM email_templates WHERE id = $1", [id]);
    return rowCount > 0;
  },

  // ---- email campaigns ----
  async createEmailCampaign(c) {
    const { rows } = await pool.query(
      `INSERT INTO email_campaigns
        (subject, content, audience_type, selected_user_ids, template_id, status,
         recipient_count, created_by, created_by_name, scheduled_at, idempotency_key)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       RETURNING *`,
      [
        c.subject || "", c.content || "", c.audienceType || "all",
        JSON.stringify(c.selectedUserIds || []), c.templateId || null, c.status || "draft",
        c.recipientCount || 0, c.createdBy || null, c.createdByName || null,
        c.scheduledAt || null, c.idempotencyKey || null,
      ]
    );
    return mapEmailCampaign(rows[0]);
  },
  async getEmailCampaignByIdempotencyKey(key) {
    if (!key) return null;
    const { rows } = await pool.query("SELECT * FROM email_campaigns WHERE idempotency_key = $1", [key]);
    return mapEmailCampaign(rows[0]);
  },
  async getEmailCampaignById(id) {
    const { rows } = await pool.query("SELECT * FROM email_campaigns WHERE id = $1", [id]);
    return mapEmailCampaign(rows[0]);
  },
  async updateEmailCampaign(id, patch) {
    const cols = {
      subject: "subject", content: "content", audienceType: "audience_type",
      status: "status", recipientCount: "recipient_count", sentCount: "sent_count",
      deliveredCount: "delivered_count", failedCount: "failed_count",
      scheduledAt: "scheduled_at", sentAt: "sent_at", error: "error",
    };
    const jsonbFields = new Set(["selectedUserIds"]);
    const sets = [];
    const values = [];
    let i = 1;
    for (const [key, col] of Object.entries(cols)) {
      if (patch[key] === undefined) continue;
      sets.push(`${col} = $${i}`);
      values.push(patch[key]);
      i += 1;
    }
    if (patch.selectedUserIds !== undefined) {
      sets.push(`selected_user_ids = $${i}`);
      values.push(JSON.stringify(patch.selectedUserIds));
      i += 1;
    }
    sets.push(`updated_at = now()`);
    if (!sets.length) return this.getEmailCampaignById(id);
    values.push(id);
    const { rows } = await pool.query(
      `UPDATE email_campaigns SET ${sets.join(", ")} WHERE id = $${i} RETURNING *`,
      values
    );
    return mapEmailCampaign(rows[0]);
  },
  async deleteEmailCampaign(id) {
    const { rowCount } = await pool.query("DELETE FROM email_campaigns WHERE id = $1 AND status = 'draft'", [id]);
    return rowCount > 0;
  },
  async getEmailCampaigns({ search = "", status = "", audience = "", createdBy = "", excludeDrafts = false, limit = 20, offset = 0 } = {}) {
    const clauses = [];
    const values = [];
    let i = 1;
    if (search.trim()) {
      clauses.push(`subject ILIKE $${i}`);
      values.push(`%${search.trim()}%`);
      i += 1;
    }
    if (status) {
      clauses.push(`status = $${i}`);
      values.push(status);
      i += 1;
    }
    if (audience) {
      clauses.push(`audience_type = $${i}`);
      values.push(audience);
      i += 1;
    }
    if (createdBy) {
      clauses.push(`created_by = $${i}`);
      values.push(Number(createdBy));
      i += 1;
    }
    if (excludeDrafts) clauses.push(`status <> 'draft'`);
    const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
    const { rows: countRows } = await pool.query(`SELECT count(*)::int AS count FROM email_campaigns ${where}`, values);
    values.push(limit, offset);
    const { rows } = await pool.query(
      `SELECT * FROM email_campaigns ${where} ORDER BY id DESC LIMIT $${i} OFFSET $${i + 1}`,
      values
    );
    return { total: countRows[0]?.count || 0, campaigns: rows.map(mapEmailCampaign) };
  },
  async getDueScheduledCampaigns() {
    const { rows } = await pool.query(
      `SELECT * FROM email_campaigns WHERE status = 'scheduled' AND scheduled_at <= now()`
    );
    return rows.map(mapEmailCampaign);
  },
  async getEmailDashboardStats() {
    const { rows: totals } = await pool.query(
      `SELECT
         COALESCE(SUM(sent_count),0)::int AS sent,
         COALESCE(SUM(delivered_count),0)::int AS delivered,
         COALESCE(SUM(failed_count),0)::int AS failed
       FROM email_campaigns WHERE status <> 'draft'`
    );
    const { rows: monthRows } = await pool.query(
      `SELECT COALESCE(SUM(sent_count),0)::int AS sent
       FROM email_campaigns
       WHERE status <> 'draft' AND sent_at >= date_trunc('month', now())`
    );
    return {
      totalSent: totals[0]?.sent || 0,
      totalDelivered: totals[0]?.delivered || 0,
      totalFailed: totals[0]?.failed || 0,
      sentThisMonth: monthRows[0]?.sent || 0,
    };
  },

  // ---- email recipients ----
  async addEmailRecipients(campaignId, recipients) {
    if (!recipients.length) return [];
    const values = [];
    const placeholders = recipients.map((r, idx) => {
      const base = idx * 4;
      values.push(campaignId, r.userId || null, r.name || null, r.email);
      return `($${base + 1},$${base + 2},$${base + 3},$${base + 4})`;
    });
    const { rows } = await pool.query(
      `INSERT INTO email_recipients (campaign_id, user_id, name, email) VALUES ${placeholders.join(",")} RETURNING *`,
      values
    );
    return rows.map(mapEmailRecipient);
  },
  async updateEmailRecipient(id, patch) {
    const cols = {
      status: "status", providerMessageId: "provider_message_id", error: "error",
      sentAt: "sent_at", deliveredAt: "delivered_at", openedAt: "opened_at", clickedAt: "clicked_at",
    };
    const sets = [];
    const values = [];
    let i = 1;
    for (const [key, col] of Object.entries(cols)) {
      if (patch[key] === undefined) continue;
      sets.push(`${col} = $${i}`);
      values.push(patch[key]);
      i += 1;
    }
    if (!sets.length) return null;
    values.push(id);
    const { rows } = await pool.query(
      `UPDATE email_recipients SET ${sets.join(", ")} WHERE id = $${i} RETURNING *`,
      values
    );
    return mapEmailRecipient(rows[0]);
  },
  async getEmailRecipientByMessageId(providerMessageId) {
    const { rows } = await pool.query("SELECT * FROM email_recipients WHERE provider_message_id = $1", [providerMessageId]);
    return mapEmailRecipient(rows[0]);
  },
  async updateEmailRecipientByMessageId(providerMessageId, patch) {
    const cols = { status: "status", deliveredAt: "delivered_at", openedAt: "opened_at", clickedAt: "clicked_at", error: "error" };
    const sets = [];
    const values = [];
    let i = 1;
    for (const [key, col] of Object.entries(cols)) {
      if (patch[key] === undefined) continue;
      sets.push(`${col} = $${i}`);
      values.push(patch[key]);
      i += 1;
    }
    if (!sets.length) return null;
    values.push(providerMessageId);
    const { rows } = await pool.query(
      `UPDATE email_recipients SET ${sets.join(", ")} WHERE provider_message_id = $${i} RETURNING *`,
      values
    );
    return mapEmailRecipient(rows[0]);
  },
  async getEmailRecipientsByCampaign(campaignId, { limit = 50, offset = 0 } = {}) {
    const { rows: countRows } = await pool.query(
      "SELECT count(*)::int AS count FROM email_recipients WHERE campaign_id = $1",
      [campaignId]
    );
    const { rows } = await pool.query(
      "SELECT * FROM email_recipients WHERE campaign_id = $1 ORDER BY id ASC LIMIT $2 OFFSET $3",
      [campaignId, limit, offset]
    );
    return { total: countRows[0]?.count || 0, recipients: rows.map(mapEmailRecipient) };
  },
  async recalculateCampaignCounts(campaignId) {
    const { rows } = await pool.query(
      `SELECT
         count(*) FILTER (WHERE status IN ('sent','delivered','opened','clicked'))::int AS sent,
         count(*) FILTER (WHERE status IN ('delivered','opened','clicked'))::int AS delivered,
         count(*) FILTER (WHERE status IN ('failed','bounced'))::int AS failed
       FROM email_recipients WHERE campaign_id = $1`,
      [campaignId]
    );
    const { sent, delivered, failed } = rows[0] || { sent: 0, delivered: 0, failed: 0 };
    const { rows: updated } = await pool.query(
      `UPDATE email_campaigns SET sent_count = $1, delivered_count = $2, failed_count = $3, updated_at = now() WHERE id = $4 RETURNING *`,
      [sent, delivered, failed, campaignId]
    );
    return mapEmailCampaign(updated[0]);
  },
};

function mapEmailTemplate(row) {
  if (!row) return null;
  return {
    id: row.id, name: row.name, subject: row.subject, content: row.content,
    category: row.category, createdBy: row.created_by,
    createdAt: row.created_at, updatedAt: row.updated_at,
  };
}

function mapEmailCampaign(row) {
  if (!row) return null;
  return {
    id: row.id, subject: row.subject, content: row.content,
    audienceType: row.audience_type, selectedUserIds: row.selected_user_ids || [],
    templateId: row.template_id, status: row.status,
    recipientCount: row.recipient_count, sentCount: row.sent_count,
    deliveredCount: row.delivered_count, failedCount: row.failed_count,
    createdBy: row.created_by, createdByName: row.created_by_name,
    createdAt: row.created_at, updatedAt: row.updated_at,
    scheduledAt: row.scheduled_at, sentAt: row.sent_at, error: row.error,
  };
}

function mapEmailRecipient(row) {
  if (!row) return null;
  return {
    id: row.id, campaignId: row.campaign_id, userId: row.user_id,
    name: row.name, email: row.email, status: row.status,
    providerMessageId: row.provider_message_id, error: row.error,
    sentAt: row.sent_at, deliveredAt: row.delivered_at,
    openedAt: row.opened_at, clickedAt: row.clicked_at,
  };
}
