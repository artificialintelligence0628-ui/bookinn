import { pool } from "./db.js";
import { TRIAL_DAYS } from "./plans.js";

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
    const nextBilling = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
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
  async grantFreeTrial(id) {
    const user = await this.getUserById(id);
    if (!user) return null;
    const now = new Date();
    const endsAt = new Date(now.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000);
    const subscription = {
      ...user.subscription,
      tier: null,
      status: "trial",
      trialStartedAt: now.toISOString(),
      trialEndsAt: endsAt.toISOString(),
      remindersSent: {},
    };
    const { rows } = await pool.query(
      "UPDATE users SET subscription = $1, has_used_free_trial = true WHERE id = $2 RETURNING *",
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
};
