import crypto from "crypto";
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
    university: row.university,
    officialAgent: !!row.official_agent,
    passwordChangedAt: row.password_changed_at,
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
    lat: row.lat == null ? null : Number(row.lat),
    lng: row.lng == null ? null : Number(row.lng),
    ownerEmail: row.owner_email,
    ownerWhatsapp: row.owner_whatsapp,
    availability: row.availability,
    reviews: row.reviews,
    views: row.views,
    createdAt: row.created_at,
    isPublic: !!row.is_public,
    hidePrice: !!row.hide_price,
    publicKind: row.is_public ? (row.public_kind === "Hall" ? "Hall" : "Hostel") : null,
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
    groupId: row.group_id || null,
    groupCode: row.group_code || null,
    groupCapacity: row.group_capacity || null,
  };
}

function mapPublicHall(row) {
  if (!row) return null;
  return { id: row.id, name: row.name, university: row.university, kind: row.kind, notes: row.notes || "", createdAt: row.created_at };
}

function mapUniversity(row) {
  if (!row) return null;
  return { id: row.id, name: row.name, createdAt: row.created_at };
}

const LISTING_COLUMNS = {
  name: "name", type: "type", roomOptions: "room_options", roomType: "room_type",
  price: "price", bath: "bath", kitchen: "kitchen", university: "university",
  distance: "distance", pricingPeriod: "pricing_period", rating: "rating",
  reviewCount: "review_count", featured: "featured", image: "image",
  images: "images", video: "video", walkthrough: "walkthrough",
  amenities: "amenities", desc: '"desc"', locationDescription: "location_description",
  ownerEmail: "owner_email", ownerWhatsapp: "owner_whatsapp",
  availability: "availability", reviews: "reviews", views: "views", publicKind: "public_kind",
  lat: "lat", lng: "lng", hidePrice: "hide_price",
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
  async getListingById(id) {
    const { rows } = await pool.query("SELECT * FROM listings WHERE id = $1", [id]);
    return mapListing(rows[0]);
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
         availability, reviews, views, is_public, public_kind, lat, lng, hide_price)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31)
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
        JSON.stringify([]), !!listing.isPublic, listing.isPublic ? (listing.publicKind === "Hall" ? "Hall" : "Hostel") : null,
        listing.lat ?? null, listing.lng ?? null, !!listing.hidePrice,
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
  // Used by requireAuth on every request: null means the account no longer
  // exists; otherwise when its password was last changed by an admin (or null).
  async getAuthState(id) {
    const { rows } = await pool.query("SELECT password_changed_at FROM users WHERE id = $1", [id]);
    return rows[0] ? { passwordChangedAt: rows[0].password_changed_at } : null;
  },
  // Admin edit of an account's login email and/or password. A changed email is
  // marked unverified again (and any pending verify token cleared) because the
  // new address hasn't been confirmed; a changed password stamps
  // password_changed_at so older login tokens stop working.
  async adminUpdateUser(id, { email, passwordHash }) {
    const sets = [];
    const values = [];
    let i = 1;
    if (email !== undefined) {
      sets.push(`email = $${i++}`, "email_verified = false", "verify_token = NULL", "verify_token_expires = NULL");
      values.push(email);
    }
    if (passwordHash !== undefined) {
      sets.push(`password_hash = $${i++}`, "password_changed_at = now()", "reset_token = NULL", "reset_token_expires = NULL");
      values.push(passwordHash);
    }
    if (!sets.length) return this.getUserById(id);
    values.push(id);
    const { rows } = await pool.query(
      `UPDATE users SET ${sets.join(", ")} WHERE id = $${i} RETURNING *`, values
    );
    return mapUser(rows[0]);
  },
  // Permanently removes an account. Its listings are removed by the
  // listings.owner_id ON DELETE CASCADE foreign key, and each listing's
  // inquiries go with it (inquiries.listing_id ON DELETE CASCADE). Email
  // campaign/template/recipient rows that point at the user are set to NULL
  // so sent-email history survives. Returns how many listings were removed,
  // or null if the user doesn't exist.
  async deleteUser(id) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const { rows: countRows } = await client.query(
        "SELECT COUNT(*)::int AS n FROM listings WHERE owner_id = $1", [id]
      );
      const { rowCount } = await client.query("DELETE FROM users WHERE id = $1", [id]);
      await client.query("COMMIT");
      return rowCount > 0 ? { listingsDeleted: countRows[0].n } : null;
    } catch (err) {
      await client.query("ROLLBACK").catch(() => {});
      throw err;
    } finally {
      client.release();
    }
  },
  async addUser({ name, email, passwordHash, role, university, marketingEmails = false }) {
    // terms_accepted_at records when the person agreed to the Terms/Privacy Policy
    // (the API refuses account creation without that agreement).
    const { rows } = await pool.query(
      `INSERT INTO users (name, email, password_hash, role, subscription, has_used_free_trial, university, marketing_emails, terms_accepted_at)
       VALUES ($1,$2,$3,$4,$5,false,$6,$7, now()) RETURNING *`,
      [name, email, passwordHash, role || "Student", JSON.stringify(defaultSubscription()), university || null, !!marketingEmails]
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
  async setOfficialAgent(id, value) {
    const { rows } = await pool.query(
      "UPDATE users SET official_agent = $1 WHERE id = $2 AND role = 'Agent' RETURNING *",
      [!!value, id]
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
    const { rows } = await pool.query(
      `SELECT i.*, g.code AS group_code, g.capacity AS group_capacity
         FROM inquiries i LEFT JOIN booking_groups g ON g.id = i.group_id
        ORDER BY i.id DESC`
    );
    return rows.map(mapInquiry);
  },
  async setConfirmedResident(id, confirmed) {
    const { rows } = await pool.query(
      "UPDATE inquiries SET confirmed_resident = $1 WHERE id = $2 RETURNING *",
      [confirmed, id]
    );
    return mapInquiry(rows[0]);
  },

  // ---- roommate groups ----
  // Short, unambiguous share code (no 0/O/1/I) that friends type to join.
  _newGroupCode() {
    const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = "";
    for (let i = 0; i < 6; i++) code += alphabet[crypto.randomInt(alphabet.length)];
    return code;
  },

  // Starts a group and saves the creator's inquiry as its first member, atomically.
  async createGroupWithInquiry(inquiry, capacity) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      let group = null;
      for (let attempt = 0; attempt < 5 && !group; attempt++) {
        try {
          await client.query("SAVEPOINT g");
          const r = await client.query(
            `INSERT INTO booking_groups (code, listing_id, room_type, capacity, leader_token)
             VALUES ($1,$2,$3,$4,$5) RETURNING *`,
            [this._newGroupCode(), inquiry.listingId, inquiry.roomType, capacity, crypto.randomBytes(24).toString("hex")]
          );
          group = r.rows[0];
        } catch (err) {
          if (err.code !== "23505") throw err; // code collision — retry
          await client.query("ROLLBACK TO SAVEPOINT g");
        }
      }
      if (!group) throw new Error("Couldn't create a group code. Please try again.");
      const { rows } = await client.query(
        `INSERT INTO inquiries (listing_id, name, phone, email, move_in, message, room_type, group_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
        [inquiry.listingId, inquiry.name, inquiry.phone || null, inquiry.email || null,
         inquiry.moveIn || null, inquiry.message || null, inquiry.roomType || null, group.id]
      );
      await client.query("COMMIT");
      return { inquiry: mapInquiry({ ...rows[0], group_code: group.code, group_capacity: group.capacity }),
               group: { code: group.code, capacity: group.capacity, joined: 1, roomType: group.room_type, listingId: group.listing_id, leaderToken: group.leader_token } };
    } catch (err) {
      await client.query("ROLLBACK").catch(() => {});
      throw err;
    } finally {
      client.release();
    }
  },

  // Adds an inquiry to an existing group. The group row is locked while we
  // count members, so two friends joining the last bed at once can't both get it.
  async joinGroupWithInquiry(code, inquiry) {
    const client = await pool.connect();
    const fail = (status, message) => Object.assign(new Error(message), { status });
    try {
      await client.query("BEGIN");
      const g = await client.query("SELECT * FROM booking_groups WHERE code = $1 FOR UPDATE", [code]);
      const group = g.rows[0];
      if (!group) throw fail(404, "We couldn't find that group code. Check it and try again.");
      if (group.listing_id !== Number(inquiry.listingId) || group.room_type !== inquiry.roomType) {
        throw fail(400, "That group code is for a different property or room type.");
      }
      const members = await client.query("SELECT phone, email FROM inquiries WHERE group_id = $1", [group.id]);
      if (members.rows.length >= group.capacity) throw fail(409, "This group is already full.");
      const dup = members.rows.some((m) =>
        (inquiry.phone && m.phone && m.phone === inquiry.phone) ||
        (inquiry.email && m.email && m.email.toLowerCase() === String(inquiry.email).toLowerCase()));
      if (dup) throw fail(409, "You're already in this group.");
      const { rows } = await client.query(
        `INSERT INTO inquiries (listing_id, name, phone, email, move_in, message, room_type, group_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
        [inquiry.listingId, inquiry.name, inquiry.phone || null, inquiry.email || null,
         inquiry.moveIn || null, inquiry.message || null, inquiry.roomType || null, group.id]
      );
      await client.query("COMMIT");
      return { inquiry: mapInquiry({ ...rows[0], group_code: group.code, group_capacity: group.capacity }),
               group: { code: group.code, capacity: group.capacity, joined: members.rows.length + 1, roomType: group.room_type, listingId: group.listing_id } };
    } catch (err) {
      await client.query("ROLLBACK").catch(() => {});
      throw err;
    } finally {
      client.release();
    }
  },

  // Member list for the group leader, who sends ONE combined request to the owner.
  // Returns null if the code or the leader token is wrong (same answer for both, so
  // a guesser can't tell which part was right).
  async getGroupForLeader(code, token, markSent = false) {
    const { rows } = await pool.query("SELECT * FROM booking_groups WHERE code = $1", [code]);
    const g = rows[0];
    if (!g || !g.leader_token || typeof token !== "string") return null;
    const a = Buffer.from(g.leader_token), b = Buffer.from(token);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
    const m = await pool.query(
      "SELECT name, phone, email, move_in FROM inquiries WHERE group_id = $1 ORDER BY id ASC", [g.id]);
    let sentCount = g.sent_count || 0;
    if (markSent) {
      const u = await pool.query("UPDATE booking_groups SET sent_count = sent_count + 1 WHERE id = $1 RETURNING sent_count", [g.id]);
      sentCount = u.rows[0].sent_count;
    }
    return {
      code: g.code, listingId: g.listing_id, roomType: g.room_type, capacity: g.capacity, sentCount,
      members: m.rows.map((r) => ({ name: r.name, phone: r.phone, email: r.email, moveIn: r.move_in })),
    };
  },

  // Lets the leader get back in from any device: the group code plus the phone number
  // or email they used when starting the group. Returns the leader token on a match.
  // Same null answer for a wrong code and wrong contact, so nothing can be probed.
  async recoverLeader(code, contact) {
    const { rows } = await pool.query("SELECT * FROM booking_groups WHERE code = $1", [code]);
    const g = rows[0];
    if (!g) return null;
    const first = (await pool.query(
      "SELECT phone, email FROM inquiries WHERE group_id = $1 ORDER BY id ASC LIMIT 1", [g.id])).rows[0];
    if (!first) return null;
    // Compare the last 9 digits so 0241234567, 241234567 and +233241234567 all match.
    const tail = (v) => String(v || "").replace(/\D/g, "").slice(-9);
    const phoneOk = tail(contact.phone).length === 9 && tail(contact.phone) === tail(first.phone);
    const emailOk = !!contact.email && !!first.email &&
      String(contact.email).trim().toLowerCase() === String(first.email).trim().toLowerCase();
    if (!phoneOk && !emailOk) return null;
    let token = g.leader_token;
    if (!token) { // group created before leader tokens existed
      token = crypto.randomBytes(24).toString("hex");
      await pool.query("UPDATE booking_groups SET leader_token = $1 WHERE id = $2", [token, g.id]);
    }
    const joined = (await pool.query("SELECT COUNT(*)::int AS n FROM inquiries WHERE group_id = $1", [g.id])).rows[0].n;
    return { leaderToken: token, group: { code: g.code, listingId: g.listing_id, roomType: g.room_type, capacity: g.capacity, joined } };
  },

  // Public, privacy-safe summary of a group: no names or contact details.
  async getGroupSummary(code) {
    const { rows } = await pool.query(
      `SELECT g.*, (SELECT COUNT(*) FROM inquiries i WHERE i.group_id = g.id)::int AS joined
         FROM booking_groups g WHERE g.code = $1`, [code]);
    const g = rows[0];
    if (!g) return null;
    return { code: g.code, listingId: g.listing_id, roomType: g.room_type, capacity: g.capacity, joined: g.joined };
  },

  // ---- public halls & hostels ----
  async getPublicHalls(university) {
    const { rows } = university
      ? await pool.query("SELECT * FROM public_halls WHERE university = $1 ORDER BY name ASC", [university])
      : await pool.query("SELECT * FROM public_halls ORDER BY university ASC, name ASC");
    return rows.map(mapPublicHall);
  },
  async addPublicHall({ name, university, kind, notes }) {
    const { rows } = await pool.query(
      `INSERT INTO public_halls (name, university, kind, notes) VALUES ($1, $2, $3, $4)
       ON CONFLICT DO NOTHING RETURNING *`,
      [name, university, kind, notes || ""]
    );
    return mapPublicHall(rows[0]);
  },
  async deletePublicHall(id) {
    const { rowCount } = await pool.query("DELETE FROM public_halls WHERE id = $1", [id]);
    return rowCount > 0;
  },

  // ---- universities ----
  // Editable list of campuses BookInn operates in — drives the signup form,
  // the owner listing form, and student/guest browse filters. Managed from
  // the platform admin dashboard instead of being hardcoded.
  async getUniversities() {
    const { rows } = await pool.query("SELECT * FROM universities ORDER BY name ASC");
    return rows.map(mapUniversity);
  },
   async addUniversity(name) {
    const { rows } = await pool.query(
      "INSERT INTO universities (name) VALUES ($1) ON CONFLICT (name) DO NOTHING RETURNING *",
      [name]
    );
    if (rows[0]) return mapUniversity(rows[0]);
    // Name already existed — return the existing row instead of null so the
    // caller (admin "add university" form) doesn't see a false failure.
    const { rows: existing } = await pool.query("SELECT * FROM universities WHERE lower(name) = lower($1)", [name]);
    return mapUniversity(existing[0]);
  },
  async renameUniversity(id, newName) {
    const { rows: existingRows } = await pool.query("SELECT * FROM universities WHERE id = $1", [id]);
    if (!existingRows[0]) return null;
    const oldName = existingRows[0].name;
    if (oldName === newName) return mapUniversity(existingRows[0]);
    const { rows } = await pool.query(
      "UPDATE universities SET name = $1 WHERE id = $2 RETURNING *",
      [newName, id]
    );
    // listings.university and users.university store the name as plain text,
    // not a foreign key — cascade the rename onto both so existing listings
    // and students don't silently fall off the university they were on.
    await pool.query("UPDATE listings SET university = $1 WHERE university = $2", [newName, oldName]);
    await pool.query("UPDATE users SET university = $1 WHERE university = $2", [newName, oldName]);
    return mapUniversity(rows[0]);
  },
  async deleteUniversity(id) {
    const { rowCount } = await pool.query("DELETE FROM universities WHERE id = $1", [id]);
    return rowCount > 0;
  },

  // ---- Email & Communication Center ----
  // Everything below reads/writes the SAME `users` table above — there is no
  // separate email-address store. Roles are the existing Student/Parent/Owner
  // values already on the users row.
  async getUserCountsByRole() {
    const { rows } = await pool.query(
      `SELECT role, count(*)::int AS count FROM users WHERE role <> 'Admin' GROUP BY role`
    );
    const counts = { Student: 0, Parent: 0, Owner: 0, Agent: 0 };
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
    const counts = { Student: 0, Parent: 0, Owner: 0, Agent: 0 };
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
