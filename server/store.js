import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { SEED_LISTINGS } from "./seed.js";
import { TRIAL_DAYS } from "./plans.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, "data", "db.json");

function defaultData() {
  return {
    listings: SEED_LISTINGS,
    users: [],
    inquiries: [],
    nextListingId: SEED_LISTINGS.length + 1,
    nextUserId: 1,
    nextInquiryId: 1,
  };
}

function load() {
  if (!fs.existsSync(DB_PATH)) {
    const data = defaultData();
    save(data);
    return data;
  }
  try {
    const raw = fs.readFileSync(DB_PATH, "utf-8");
    const parsed = JSON.parse(raw);
    // Backfill any fields missing from an older db.json
    const merged = { ...defaultData(), ...parsed };
    merged.users = (merged.users || []).map((u) => ({
      ...u,
      hasUsedFreeTrial: !!u.hasUsedFreeTrial,
      subscription: {
        tier: null, status: "none",
        trialStartedAt: null, trialEndsAt: null,
        subscriptionStartedAt: null, subscriptionEndsAt: null,
        cancelledAt: null, remindersSent: {},
        ...(u.subscription || {}),
      },
    }));
    return merged;
  } catch (err) {
    console.error("Failed to read db.json, starting fresh:", err.message);
    const data = defaultData();
    save(data);
    return data;
  }
}

function save(data) {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

let db = load();

export const store = {
  // ---- listings ----
  getListings() {
    return db.listings;
  },
  getListingsByOwner(ownerId) {
    return db.listings.filter((l) => l.ownerId === ownerId);
  },
  addListing(listing) {
    const newListing = { ...listing, id: db.nextListingId, views: [] };
    db.nextListingId += 1;
    db.listings = [newListing, ...db.listings];
    save(db);
    return newListing;
  },
  // Records one profile view (timestamped) against a listing, so owner-dashboard
  // "profile views" can be computed for real instead of being a fixed number.
  // Keeps at most the last 5000 timestamps per listing so the file can't grow unbounded.
  recordListingView(id) {
    let updated = null;
    db.listings = db.listings.map((l) => {
      if (l.id !== id) return l;
      const views = [...(l.views || []), new Date().toISOString()].slice(-5000);
      updated = { ...l, views };
      return updated;
    });
    save(db);
    return updated;
  },
  updateListing(id, patch) {
    let updated = null;
    db.listings = db.listings.map((l) => {
      if (l.id !== id) return l;
      updated = { ...l, ...patch, id: l.id };
      return updated;
    });
    save(db);
    return updated;
  },
  deleteListing(id) {
    const before = db.listings.length;
    db.listings = db.listings.filter((l) => l.id !== id);
    save(db);
    return db.listings.length < before;
  },
  addReview(listingId, review) {
    let updatedListing = null;
    db.listings = db.listings.map((l) => {
      if (l.id !== listingId) return l;
      const reviews = [...(l.reviews || []), review];
      // Recompute the average rating including the new review.
      const priorTotal = (l.rating || 0) * (l.reviewCount || 0);
      const newTotal = priorTotal + review.rating;
      const newCount = (l.reviewCount || 0) + 1;
      const newRating = Math.round((newTotal / newCount) * 10) / 10;
      updatedListing = { ...l, reviews, reviewCount: newCount, rating: newRating };
      return updatedListing;
    });
    save(db);
    return updatedListing;
  },

  // ---- users ----
  getUserByEmail(email) {
    return db.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  },
  getUserById(id) {
    return db.users.find((u) => u.id === id);
  },
  addUser({ name, email, passwordHash, role }) {
    const newUser = {
      id: db.nextUserId, name, email, passwordHash,
      role: role || "Student",
      subscription: {
        tier: null, status: "none",
        trialStartedAt: null, trialEndsAt: null,
        subscriptionStartedAt: null, subscriptionEndsAt: null,
        cancelledAt: null, remindersSent: {},
      },
      hasUsedFreeTrial: false,
      createdAt: new Date().toISOString(),
    };
    db.nextUserId += 1;
    db.users = [...db.users, newUser];
    save(db);
    return newUser;
  },
  // Activates (or upgrades/downgrades) a PAID plan — only ever called after a
  // payment has been verified server-side (see /api/payments/verify). A fresh
  // 30-day billing period starts from the moment of activation.
  setUserSubscription(id, tier) {
    let updated = null;
    const now = new Date();
    const nextBilling = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    db.users = db.users.map((u) => {
      if (u.id !== id) return u;
      updated = {
        ...u,
        subscription: {
          ...u.subscription,
          tier,
          status: "active",
          subscriptionStartedAt: now.toISOString(),
          subscriptionEndsAt: nextBilling.toISOString(),
          cancelledAt: null,
          remindersSent: {}, // fresh billing period — trial reminders don't apply, but reset for cleanliness
        },
      };
      return updated;
    });
    save(db);
    return updated;
  },
  // Cancels an active paid subscription immediately — the listing is paused
  // right away (this demo has no grace-period/proration billing integration;
  // a real payment provider webhook would drive end-of-period cancellation).
  cancelSubscription(id) {
    let updated = null;
    db.users = db.users.map((u) => {
      if (u.id !== id) return u;
      updated = { ...u, subscription: { ...u.subscription, status: "cancelled", cancelledAt: new Date().toISOString() } };
      return updated;
    });
    save(db);
    return updated;
  },
  // Grants the one-time 30-day free trial — tied to the OWNER ACCOUNT (via
  // hasUsedFreeTrial), never to a listing, so deleting and re-adding a listing
  // can never grant a second trial.
  grantFreeTrial(id) {
    let updated = null;
    const now = new Date();
    const endsAt = new Date(now.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000);
    db.users = db.users.map((u) => {
      if (u.id !== id) return u;
      updated = {
        ...u,
        subscription: {
          ...u.subscription,
          tier: null, // no paid plan on file — trial runs on Basic-level features
          status: "trial",
          trialStartedAt: now.toISOString(),
          trialEndsAt: endsAt.toISOString(),
          remindersSent: {},
        },
        hasUsedFreeTrial: true,
      };
      return updated;
    });
    save(db);
    return updated;
  },
  // Marks a trial reminder threshold (d7/d3/d1/expiry) as sent so it's never
  // shown twice for the same trial.
  markReminderSent(id, key) {
    let updated = null;
    db.users = db.users.map((u) => {
      if (u.id !== id) return u;
      updated = { ...u, subscription: { ...u.subscription, remindersSent: { ...(u.subscription.remindersSent || {}), [key]: true } } };
      return updated;
    });
    save(db);
    return updated;
  },

  getUsers() {
    return db.users;
  },

  // ---- inquiries ----
  addInquiry(inquiry) {
    const newInquiry = { ...inquiry, id: db.nextInquiryId, createdAt: new Date().toISOString() };
    db.nextInquiryId += 1;
    db.inquiries = [newInquiry, ...db.inquiries];
    save(db);
    return newInquiry;
  },
  getInquiries() {
    return db.inquiries;
  },
};
