import "dotenv/config";
import express from "express";
import cors from "cors";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import path from "path";
import { fileURLToPath } from "url";
import { store } from "./store.js";
import { PLAN_PRICES, PLAN_FEATURES, PLAN_ORDER, maxListingsForView, computeSubscriptionView, reminderForView } from "./plans.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const PORT = process.env.PORT || 4000;
// In a real production deployment, set JWT_SECRET as a real environment
// variable and never commit a secret to source control.
const JWT_SECRET = process.env.JWT_SECRET || "bookinn-dev-secret-change-me";
const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY || "";

// GHS amounts (cedis) for each subscription tier — the single source of truth
// lives in plans.js and is mirrored (display-only) in src/App.jsx.
const SUBSCRIPTION_AMOUNTS = PLAN_PRICES;

const app = express();
app.use(cors());
app.use(express.json({ limit: "10mb" })); // generous limit — listing photos are sent as base64

const ROLES = ["Owner", "Student", "Parent"]; // roles the public signup form is allowed to create
const ADMIN_ROLE = "Admin"; // never accepted from public /auth/signup — seeded below instead
const SUBSCRIPTION_TIERS = PLAN_ORDER;
const HOSTEL_ROOM_TYPES = ["One in a room", "Two in a room", "Three in a room", "Four in a room", "Six in a room"];
const APARTMENT_ROOM_TYPES = ["Self-contained", "Shared Apartment"];

// Credentials for the platform admin account, seeded automatically the first time the
// server starts (only if no Admin account exists yet). Override via .env in production.
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@bookinn.app";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin12345";

function signToken(user) {
  return jwt.sign({ sub: user.id, email: user.email, name: user.name }, JWT_SECRET, { expiresIn: "7d" });
}

function publicUser(user) {
  return {
    id: user.id, name: user.name, email: user.email, role: user.role,
    subscription: user.subscription,
    subscriptionView: computeSubscriptionView(user),
    hasUsedFreeTrial: !!user.hasUsedFreeTrial,
    createdAt: user.createdAt,
  };
}

function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Missing auth token." });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token." });
  }
}

// Property owners must have a currently-visible subscription (active paid plan or
// live free trial — never trusted from the client, always recomputed from real
// timestamps) before they can create/edit/delete a listing they own.
function requireActiveOwner(req, res, next) {
  const user = store.getUserById(req.user.sub);
  if (!user) return res.status(404).json({ error: "User not found." });
  if (user.role !== "Owner") return res.status(403).json({ error: "Only property owner accounts can manage listings." });
  const view = computeSubscriptionView(user);
  if (!view.isListingVisible) {
    return res.status(403).json({ error: "Your trial or subscription isn't active. Subscribe to a plan to manage your listing.", subscriptionView: view });
  }
  req.subscriptionView = view;
  next();
}

// A listing can only be edited or deleted by the owner account that created it
// (or by a platform Admin) — otherwise any subscribed owner could touch anyone's listing.
function requireOwnsListing(req, res, next) {
  const id = Number(req.params.id);
  const listing = store.getListings().find((l) => l.id === id);
  if (!listing) return res.status(404).json({ error: "Listing not found." });
  const user = store.getUserById(req.user.sub);
  if (user.role !== ADMIN_ROLE && listing.ownerId !== user.id) {
    return res.status(403).json({ error: "You can only manage your own listings." });
  }
  next();
}

// Gates creating a NEW listing. How many listings an owner may have depends on
// their CURRENT plan (Basic: 1, Premium: 2, Featured: 3) — room count inside a
// single hostel/apartment never affects this. The limit is always re-derived
// from the owner's live, server-verified subscription — never trusted from
// the client.
//
// The free trial is never granted as a side effect of this route — an owner
// must explicitly start it themselves via POST /api/subscription/start-trial
// first (see below). This route only checks whether a trial/subscription is
// already live.
function requireCanCreateListing(req, res, next) {
  const user = store.getUserById(req.user.sub);
  if (!user) return res.status(404).json({ error: "User not found." });
  if (user.role !== "Owner") return res.status(403).json({ error: "Only property owner accounts can create listings." });

  const ownerListingCount = store.getListingsByOwner(user.id).length;
  const view = computeSubscriptionView(user);

  if (!view.isListingVisible) {
    const error = user.hasUsedFreeTrial
      ? "Subscribe to a plan to add a listing."
      : "Start your free trial to add a listing.";
    return res.status(403).json({ error, subscriptionView: view });
  }

  const limit = maxListingsForView(view);
  if (ownerListingCount >= limit) {
    const planLabel = view.status === "trial" ? "trial" : view.plan;
    return res.status(403).json({
      error: `Your ${planLabel} plan allows up to ${limit} listing${limit === 1 ? "" : "s"}. Upgrade to add another.`,
      subscriptionView: view,
    });
  }
  req.subscriptionView = view;
  return next();
}

// Platform admin routes (site-wide stats, all users) are restricted to the Admin role.
function requireAdmin(req, res, next) {
  const user = store.getUserById(req.user.sub);
  if (!user) return res.status(404).json({ error: "User not found." });
  if (user.role !== ADMIN_ROLE) return res.status(403).json({ error: "Admin access only." });
  next();
}

// ---------------------------------------------------------
// Auth
// ---------------------------------------------------------
app.post("/api/auth/signup", async (req, res) => {
  const { name, email, password, role } = req.body || {};
  if (!name || !email || !password) return res.status(400).json({ error: "Name, email and password are required." });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: "Enter a valid email address." });
  if (password.length < 6) return res.status(400).json({ error: "Password must be at least 6 characters." });
  if (role && !ROLES.includes(role)) return res.status(400).json({ error: "Invalid account type." });
  if (store.getUserByEmail(email)) return res.status(409).json({ error: "An account with this email already exists." });

  const passwordHash = await bcrypt.hash(password, 10);
  const user = store.addUser({ name, email, passwordHash, role });
  const token = signToken(user);
  res.status(201).json({ token, user: publicUser(user) });
});

app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: "Email and password are required." });
  const user = store.getUserByEmail(email);
  if (!user) return res.status(401).json({ error: "Invalid email or password." });
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(401).json({ error: "Invalid email or password." });
  const token = signToken(user);
  res.json({ token, user: publicUser(user) });
});

app.get("/api/auth/me", requireAuth, (req, res) => {
  const user = store.getUserById(req.user.sub);
  if (!user) return res.status(404).json({ error: "User not found." });
  res.json({ user: publicUser(user) });
});

// ---------------------------------------------------------
// Payments (Paystack)
// ---------------------------------------------------------
// The Paystack popup on the frontend reports success client-side, which can be spoofed —
// so before unlocking anything we re-check the transaction directly with Paystack using the
// secret key, and confirm the amount/currency/status all match the plan being purchased.
app.post("/api/payments/verify", requireAuth, async (req, res) => {
  const { reference, tier } = req.body || {};
  if (!reference || !SUBSCRIPTION_TIERS.includes(tier)) {
    return res.status(400).json({ error: "A payment reference and a valid plan are required." });
  }
  if (!PAYSTACK_SECRET_KEY) {
    return res.status(500).json({ error: "Payments aren't configured on the server yet — set PAYSTACK_SECRET_KEY." });
  }
  try {
    const psRes = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
      headers: { Authorization: `Bearer ${PAYSTACK_SECRET_KEY}` },
    });
    const psData = await psRes.json();
    if (!psRes.ok || !psData.status) {
      return res.status(402).json({ error: psData?.message || "Could not verify this payment with Paystack." });
    }
    const tx = psData.data;
    const expectedAmount = SUBSCRIPTION_AMOUNTS[tier] * 100; // pesewas
    if (tx.status !== "success") {
      return res.status(402).json({ error: "That payment was not successful." });
    }
    if (tx.currency !== "GHS" || tx.amount !== expectedAmount) {
      return res.status(402).json({ error: "The paid amount didn't match the selected plan." });
    }
    const updated = store.setUserSubscription(req.user.sub, tier);
    if (!updated) return res.status(404).json({ error: "User not found." });
    res.json({ user: publicUser(updated) });
  } catch (err) {
    console.error("Paystack verification error:", err);
    res.status(502).json({ error: "Payment verification failed. Please try again." });
  }
});

// Starts the one-time 30-day free trial. This is a deliberate, explicit action —
// the owner clicks "Start Free Trial" themselves; the trial is never granted as
// a side effect of any other request (e.g. creating a listing). Still fully
// server-verified: hasUsedFreeTrial and the live subscription view are re-checked
// here, never trusted from the client.
app.post("/api/subscription/start-trial", requireAuth, (req, res) => {
  const user = store.getUserById(req.user.sub);
  if (!user) return res.status(404).json({ error: "User not found." });
  if (user.role !== "Owner") return res.status(403).json({ error: "Only property owner accounts can start a free trial." });
  if (user.hasUsedFreeTrial) return res.status(403).json({ error: "You've already used your free trial. Subscribe to a plan to continue." });
  const view = computeSubscriptionView(user);
  if (view.isListingVisible) return res.status(400).json({ error: "You already have an active trial or subscription." });
  const updated = store.grantFreeTrial(user.id);
  res.json({ user: publicUser(updated) });
});

// Cancels an active paid subscription (the demo has no billing-provider webhook,
// so cancellation takes effect immediately rather than at period end).
app.post("/api/subscription/cancel", requireAuth, (req, res) => {
  const user = store.getUserById(req.user.sub);
  if (!user) return res.status(404).json({ error: "User not found." });
  if (user.role !== "Owner") return res.status(403).json({ error: "Only property owner accounts have a subscription." });
  const view = computeSubscriptionView(user);
  if (view.status !== "active") return res.status(400).json({ error: "There's no active paid subscription to cancel." });
  const updated = store.cancelSubscription(user.id);
  res.json({ user: publicUser(updated) });
});

// ---------------------------------------------------------
// Subscription status — the single endpoint the owner dashboard polls for its
// status card, trial countdown and one-time trial reminders. Every value here is
// computed live from real timestamps, never a client-supplied or manually
// decremented number.
// ---------------------------------------------------------
app.get("/api/subscription/me", requireAuth, (req, res) => {
  const user = store.getUserById(req.user.sub);
  if (!user) return res.status(404).json({ error: "User not found." });
  const view = computeSubscriptionView(user);

  let reminder = null;
  const candidate = reminderForView(view);
  if (candidate && !(user.subscription.remindersSent || {})[candidate.key]) {
    reminder = candidate;
    store.markReminderSent(user.id, candidate.key);
  }

  res.json({
    subscriptionView: view,
    plans: { prices: PLAN_PRICES, features: PLAN_FEATURES },
    reminder,
  });
});

// A hostel can offer several room occupancy categories at once (e.g. "Two in a room" at
// GH₵1,200 AND "Four in a room" at GH₵800) — each with its own price. Apartments only ever
// have a single category. This normalizes whatever the client sent into a clean array and
// derives the headline roomType/price used for cards, search and sorting.
function normalizeRoomOptions(type, rawOptions) {
  const validTypes = type === "Hostel" ? HOSTEL_ROOM_TYPES : APARTMENT_ROOM_TYPES;
  const list = Array.isArray(rawOptions) ? rawOptions : [];
  const seen = new Set();
  const cleaned = [];
  for (const opt of list) {
    const roomType = opt?.roomType;
    const price = Number(opt?.price);
    if (!validTypes.includes(roomType)) continue;
    if (!price || price <= 0) continue;
    if (seen.has(roomType)) continue;
    seen.add(roomType);
    cleaned.push({ roomType, price });
  }
  if (!cleaned.length) return null;
  cleaned.sort((a, b) => a.price - b.price);
  return {
    roomOptions: cleaned,
    price: cleaned[0].price,
    roomType: cleaned.length > 1 ? `${cleaned.length} room types` : cleaned[0].roomType,
  };
}



// Enforces the photo/video/featured-badge limits for the owner's CURRENT effective
// plan when they create or update a listing. The cover photo is the listing's
// required thumbnail and isn't counted against the plan's photo allowance — the
// allowance applies to the gallery ("more room photos") the owner uploads, which is
// where §11's 5/10/unlimited limits actually bite in this app's listing form.
// Returns { error } if the submission itself exceeds the plan, otherwise the
// sanitized fields to store. Never trusts l.featured/l.video from the client — those
// are only kept if the owner's ACTUAL plan (verified server-side) allows them.
// Sanitizes the Featured-only "virtual walkthrough" — an ordered set of
// room-by-room stops (a photo + short label per stop, e.g. "Bedroom",
// "Kitchen", "Bathroom") that a student can step through, distinct from the
// single video-tour file. Never trusts client-supplied stops beyond what the
// owner's ACTUAL plan allows: capped at `cap` (0 for non-Featured plans, so
// the array comes back empty and any previously-saved stops stop rendering
// the moment a Featured plan lapses), and each stop is reshaped so nothing
// but a label + image data URL can ever be stored.
function normalizeWalkthrough(input, cap) {
  if (!cap) return [];
  const stops = Array.isArray(input) ? input : [];
  return stops
    .filter((s) => s && typeof s.image === "string" && s.image.startsWith("data:image"))
    .slice(0, cap)
    .map((s, i) => ({
      id: i + 1,
      label: typeof s.label === "string" && s.label.trim() ? s.label.trim().slice(0, 40) : `Stop ${i + 1}`,
      image: s.image,
    }));
}

function enforcePlanOnListingPayload(view, l) {
  const { features, effectivePlan } = view;
  const images = Array.isArray(l.images) ? l.images : [];
  const galleryCap = features.maxPhotos;
  if (images.length > galleryCap) {
    const nextPlan = effectivePlan === "Featured" ? null : effectivePlan === "Basic" ? "Premium" : "Featured";
    const nextLimit = nextPlan ? `up to ${PLAN_FEATURES[nextPlan].maxPhotos} photos` : null;
    return {
      error: `You've reached the ${galleryCap}-photo limit on the ${effectivePlan || "Basic"} plan.${nextPlan ? ` Upgrade to ${nextPlan} for ${nextLimit}.` : ""}`,
    };
  }
  return {
    images: images.slice(0, galleryCap),
    video: features.videoTour ? (l.video || "") : "",
    featured: features.featuredBadge ? !!l.featured : false,
    walkthrough: normalizeWalkthrough(l.walkthrough, features.virtualWalkthrough ? (features.maxWalkthroughStops || 0) : 0),
  };
}

// Shapes a listing for STUDENT-FACING responses: hides listings whose owner's
// trial/subscription isn't currently active/visible, slices photos and strips
// video/WhatsApp/badges down to what the owner's live plan actually allows (so a
// downgrade takes effect immediately even on a listing that was saved while on a
// higher plan), and attaches search-ranking/badge info. Returns null when the
// listing should not be shown publicly at all.
function toPublicListing(listing) {
  const owner = store.getUserById(listing.ownerId);
  const view = owner ? computeSubscriptionView(owner) : { isListingVisible: false, features: {}, effectivePlan: null };
  if (!view.isListingVisible) return null;
  const { features, effectivePlan } = view;
  const cap = features.maxPhotos ?? 0;
  return {
    ...listing,
    images: (listing.images || []).slice(0, cap),
    video: features.videoTour ? (listing.video || "") : "",
    ownerWhatsapp: features.whatsappEnquiries ? (listing.ownerWhatsapp || "") : "",
    featured: !!features.featuredBadge && !!listing.featured,
    verified: !!features.verifiedBadge,
    topSearch: !!features.topSearch,
    homepagePlacement: !!features.homepagePlacement,
    priorityEnquiries: !!features.priorityEnquiries,
    virtualWalkthrough: !!features.virtualWalkthrough,
    walkthrough: features.virtualWalkthrough ? (listing.walkthrough || []) : [],
    planTier: effectivePlan,
    searchPriority: features.searchPriority || 0,
  };
}

// Public feed — students only ever see listings whose owner currently has an
// active trial or paid subscription (never a paused/expired one), and each
// listing is shaped down to exactly what the owner's live plan allows (photos,
// video, WhatsApp, badges) — enforced here, not just hidden in the UI.
// Sorted by plan-based search ranking: Featured > Premium > Basic/trial.
// Which of this owner's listings are within their CURRENT plan's listing cap.
// Nothing is ever deleted on a downgrade — if an owner had 3 listings on
// Featured and drops to Premium (cap 2), the 3rd stays stored but is hidden
// from public search until they upgrade again or free up a slot themselves.
// Oldest listings are kept active first (lowest id = created earliest).
function visibleListingIdsForOwner(user, ownerListings) {
  const view = computeSubscriptionView(user);
  if (!view.isListingVisible) return new Set();
  const limit = maxListingsForView(view);
  const ids = [...ownerListings].sort((a, b) => a.id - b.id).slice(0, limit).map((l) => l.id);
  return new Set(ids);
}

app.get("/api/listings", (req, res) => {
  const all = store.getListings();
  const byOwner = {};
  all.forEach((l) => { (byOwner[l.ownerId] ||= []).push(l); });
  const visibleIds = new Set();
  Object.entries(byOwner).forEach(([ownerId, ownerListings]) => {
    const owner = store.getUserById(Number(ownerId));
    if (!owner) return;
    visibleListingIdsForOwner(owner, ownerListings).forEach((id) => visibleIds.add(id));
  });
  const listings = all
    .filter((l) => visibleIds.has(l.id))
    .map(toPublicListing)
    .filter(Boolean)
    .sort((a, b) => b.searchPriority - a.searchPriority);
  res.json({ listings });
});

// Owner's own listings — unfiltered (includes a paused/expired listing so the
// owner can still see and manage it) and annotated with their live subscription
// view so the dashboard always reflects real, server-computed status.
app.get("/api/listings/mine", requireAuth, (req, res) => {
  const user = store.getUserById(req.user.sub);
  if (!user) return res.status(404).json({ error: "User not found." });
  if (user.role !== "Owner") return res.status(403).json({ error: "Only property owner accounts have listings." });
  const view = computeSubscriptionView(user);
  const ownerListings = store.getListingsByOwner(user.id);
  const visibleIds = visibleListingIdsForOwner(user, ownerListings);
  const listings = ownerListings.map((l) => ({
    ...l,
    visible: visibleIds.has(l.id),
    photosOverLimit: Math.max(0, (l.images?.length || 0) - view.features.maxPhotos),
  }));
  res.json({ listings, subscriptionView: view, maxListings: maxListingsForView(view) });
});

app.post("/api/listings", requireAuth, requireCanCreateListing, (req, res) => {
  const l = req.body || {};
  const type = l.type === "Apartment" ? "Apartment" : "Hostel";
  if (!l.name) return res.status(400).json({ error: "Listing name is required." });
  const rooms = normalizeRoomOptions(type, l.roomOptions);
  if (!rooms) {
    return res.status(400).json({
      error: type === "Hostel"
        ? "Choose at least one room category (e.g. Two in a room) and set a price for it."
        : "Choose a room type and set a price.",
    });
  }
  if (!l.ownerEmail && !l.ownerWhatsapp) {
    return res.status(400).json({ error: "Add an email or WhatsApp number so booking requests can reach you." });
  }
  const planCheck = enforcePlanOnListingPayload(req.subscriptionView, l);
  if (planCheck.error) return res.status(400).json({ error: planCheck.error });
  const listing = store.addListing({
    ownerId: req.user.sub,
    name: l.name,
    type,
    roomOptions: rooms.roomOptions,
    roomType: rooms.roomType,
    price: rooms.price,
    bath: l.bath || "Shared bath",
    kitchen: !!l.kitchen,
    university: l.university || "Koforidua Technical University",
    distance: l.distance || "New listing",
    pricingPeriod: l.pricingPeriod || "Per semester",
    rating: l.rating ?? 0,
    reviewCount: l.reviewCount ?? 0,
    featured: planCheck.featured,
    image: l.image || "hostel1",
    images: planCheck.images,
    video: planCheck.video,
    walkthrough: planCheck.walkthrough,
    amenities: l.amenities || ["Wifi", "Security"],
    desc: l.desc || "Newly added listing — description coming soon.",
    locationDescription: l.locationDescription || "",
    ownerEmail: l.ownerEmail || "",
    ownerWhatsapp: l.ownerWhatsapp || "",
    availability: ["Space available", "Partly booked", "Fully booked"].includes(l.availability) ? l.availability : "Space available",
    reviews: [],
  });
  const updatedUser = store.getUserById(req.user.sub);
  res.status(201).json({ listing, user: publicUser(updatedUser) });
});

app.put("/api/listings/:id", requireAuth, requireActiveOwner, requireOwnsListing, (req, res) => {
  const id = Number(req.params.id);
  const l = req.body || {};
  const type = l.type === "Apartment" ? "Apartment" : "Hostel";
  if (!l.name) return res.status(400).json({ error: "Listing name is required." });
  const rooms = normalizeRoomOptions(type, l.roomOptions);
  if (!rooms) {
    return res.status(400).json({
      error: type === "Hostel"
        ? "Choose at least one room category (e.g. Two in a room) and set a price for it."
        : "Choose a room type and set a price.",
    });
  }
  if (!l.ownerEmail && !l.ownerWhatsapp) {
    return res.status(400).json({ error: "Add an email or WhatsApp number so booking requests can reach you." });
  }
  const planCheck = enforcePlanOnListingPayload(req.subscriptionView, l);
  if (planCheck.error) return res.status(400).json({ error: planCheck.error });
  const patch = {
    name: l.name,
    type,
    roomOptions: rooms.roomOptions,
    roomType: rooms.roomType,
    price: rooms.price,
    bath: l.bath || "Shared bath",
    kitchen: !!l.kitchen,
    university: l.university || "Koforidua Technical University",
    distance: l.distance || "New listing",
    pricingPeriod: l.pricingPeriod || "Per semester",
    featured: planCheck.featured,
    image: l.image || "hostel1",
    images: planCheck.images,
    video: planCheck.video,
    walkthrough: planCheck.walkthrough,
    amenities: l.amenities || [],
    desc: l.desc || "",
    locationDescription: l.locationDescription || "",
    ownerEmail: l.ownerEmail || "",
    ownerWhatsapp: l.ownerWhatsapp || "",
    availability: ["Space available", "Partly booked", "Fully booked"].includes(l.availability) ? l.availability : "Space available",
  };
  const updated = store.updateListing(id, patch);
  if (!updated) return res.status(404).json({ error: "Listing not found." });
  res.json({ listing: updated });
});

app.delete("/api/listings/:id", requireAuth, requireActiveOwner, requireOwnsListing, (req, res) => {
  const ok = store.deleteListing(Number(req.params.id));
  if (!ok) return res.status(404).json({ error: "Listing not found." });
  res.status(204).end();
});

// Records a profile view — called once when a student opens a listing's detail page.
// No auth required (students browse anonymously); feeds the owner dashboard's real
// "Profile views" stat instead of a hardcoded number.
app.post("/api/listings/:id/view", (req, res) => {
  const updated = store.recordListingView(Number(req.params.id));
  if (!updated) return res.status(404).json({ error: "Listing not found." });
  res.status(204).end();
});

// Student reviews — anyone can leave one, no login required.
app.post("/api/listings/:id/reviews", (req, res) => {
  const id = Number(req.params.id);
  const { name, rating, text } = req.body || {};
  if (!name || !rating) return res.status(400).json({ error: "Name and a star rating are required." });
  const ratingNum = Number(rating);
  if (ratingNum < 1 || ratingNum > 10) return res.status(400).json({ error: "Rating must be between 1 and 10." });
  const updated = store.addReview(id, { name, rating: ratingNum, text: text || "" });
  if (!updated) return res.status(404).json({ error: "Listing not found." });
  res.status(201).json({ listing: updated });
});

// ---------------------------------------------------------
// Inquiries (booking / contact form submissions)
// ---------------------------------------------------------
app.post("/api/inquiries", (req, res) => {
  const { listingId, name, phone, email, moveIn, message, roomType } = req.body || {};
  if (!listingId || !name) return res.status(400).json({ error: "listingId and name are required." });
  const inquiry = store.addInquiry({ listingId, name, phone, email, moveIn, message, roomType });
  res.status(201).json({ inquiry });
});

// Attaches a `priority` flag to each inquiry — true when the listing's owner is on
// a plan with the priorityEnquiries feature (Featured) — and sorts priority
// inquiries first, newest first within each group. Keeps the "priority enquiries"
// promise real rather than a dead PLAN_FEATURES field.
function withPriority(inquiries) {
  const listings = store.getListings();
  const listingById = new Map(listings.map((l) => [l.id, l]));
  const ownerFeaturesCache = new Map();
  const featuresForOwner = (ownerId) => {
    if (!ownerFeaturesCache.has(ownerId)) {
      const owner = store.getUserById(ownerId);
      ownerFeaturesCache.set(ownerId, owner ? computeSubscriptionView(owner).features : PLAN_FEATURES.Basic);
    }
    return ownerFeaturesCache.get(ownerId);
  };
  const enriched = inquiries.map((i) => {
    const listing = listingById.get(i.listingId);
    const priority = !!(listing && featuresForOwner(listing.ownerId).priorityEnquiries);
    return { ...i, priority };
  });
  enriched.sort((a, b) => {
    if (a.priority !== b.priority) return a.priority ? -1 : 1;
    return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
  });
  return enriched;
}

app.get("/api/inquiries", requireAuth, (req, res) => {
  const user = store.getUserById(req.user.sub);
  if (!user) return res.status(404).json({ error: "User not found." });
  if (user.role === ADMIN_ROLE) {
    return res.json({ inquiries: withPriority(store.getInquiries()) });
  }
  if (user.role === "Owner") {
    const myListingIds = new Set(store.getListings().filter((l) => l.ownerId === user.id).map((l) => l.id));
    return res.json({ inquiries: withPriority(store.getInquiries().filter((i) => myListingIds.has(i.listingId))) });
  }
  return res.status(403).json({ error: "Only property owners and platform admins can view inquiries." });
});

// ---------------------------------------------------------
// Owner dashboard — real, per-owner stats (replaces any hardcoded numbers on the frontend)
// ---------------------------------------------------------
app.get("/api/owner/stats", requireAuth, (req, res) => {
  const user = store.getUserById(req.user.sub);
  if (!user) return res.status(404).json({ error: "User not found." });
  if (user.role !== "Owner") return res.status(403).json({ error: "Only property owner accounts have a dashboard." });

  const myListings = store.getListings().filter((l) => l.ownerId === user.id);
  const myListingIds = new Set(myListings.map((l) => l.id));

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const inquiriesThisMonthList = store.getInquiries().filter(
    (i) => myListingIds.has(i.listingId) && i.createdAt && new Date(i.createdAt).getTime() >= startOfMonth
  );
  const inquiriesThisMonth = inquiriesThisMonthList.length;

  const view = computeSubscriptionView(user);

  // Analytics (profile views + estimated revenue) is a Premium/Featured feature.
  // Gate it server-side too — the dashboard hiding the stat cards isn't enough,
  // since a Basic/trial owner could otherwise call this endpoint directly.
  if (!view.features.analytics) {
    return res.json({
      activeListings: view.isListingVisible ? myListings.length : 0,
      inquiriesThisMonth,
      profileViews30d: null,
      estimatedRevenueGHS: null,
      analyticsLocked: true,
    });
  }

  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const profileViews30d = myListings.reduce((sum, l) => {
    const views = (l.views || []).filter((ts) => new Date(ts).getTime() >= thirtyDaysAgo);
    return sum + views.length;
  }, 0);

  // Estimated revenue: there's no real payments ledger (no checkout/booking-confirmation
  // flow exists), so this is an estimate off the closest real signal available — the
  // listing's price for each booking request (inquiry) received this month. This used to
  // be keyed off the owner's manually-set "availability" dropdown, which a student's
  // booking request never touches — so it never moved when a student actually booked.
  const listingById = new Map(myListings.map((l) => [l.id, l]));
  const estimatedRevenueGHS = inquiriesThisMonthList.reduce((sum, i) => {
    const listing = listingById.get(i.listingId);
    return sum + (listing ? Number(listing.price) || 0 : 0);
  }, 0);

  res.json({
    activeListings: view.isListingVisible ? myListings.length : 0,
    inquiriesThisMonth,
    profileViews30d,
    estimatedRevenueGHS,
    analyticsLocked: false,
  });
});

// ---------------------------------------------------------
// Platform admin — accounts, listings & inquiries overview
// ---------------------------------------------------------
app.get("/api/admin/users", requireAuth, requireAdmin, (req, res) => {
  const users = store.getUsers().map(publicUser);
  res.json({ users });
});

app.get("/api/admin/stats", requireAuth, requireAdmin, (req, res) => {
  const users = store.getUsers();
  const listings = store.getListings();
  const inquiries = store.getInquiries();

  const byRole = { Student: 0, Parent: 0, Owner: 0, Admin: 0 };
  let activeSubscriptions = 0;
  const tierCounts = { Basic: 0, Premium: 0, Featured: 0 };
  const statusCounts = { trial: 0, active: 0, expired: 0, cancelled: 0, none: 0, payment_failed: 0 };
  let estimatedRevenue = 0;
  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
  let newSignups30d = 0;

  const ownersOverview = [];

  users.forEach((u) => {
    if (byRole[u.role] !== undefined) byRole[u.role] += 1;
    if (u.createdAt && new Date(u.createdAt).getTime() >= thirtyDaysAgo) newSignups30d += 1;
    if (u.role !== "Owner") return;

    const view = computeSubscriptionView(u);
    statusCounts[view.status] = (statusCounts[view.status] || 0) + 1;
    if (view.status === "active") {
      activeSubscriptions += 1;
      if (tierCounts[view.plan] !== undefined) tierCounts[view.plan] += 1;
      estimatedRevenue += SUBSCRIPTION_AMOUNTS[view.plan] || 0;
    }

    const ownerListings = store.getListingsByOwner(u.id);
    const visibleIds = visibleListingIdsForOwner(u, ownerListings);
    ownersOverview.push({
      ownerId: u.id,
      ownerName: u.name,
      ownerEmail: u.email,
      listings: ownerListings.map((l) => ({ id: l.id, name: l.name, status: visibleIds.has(l.id) ? "Active" : "Paused" })),
      maxListings: maxListingsForView(view),
      plan: view.plan,
      status: view.status,
      trialStartedAt: view.trialStartedAt,
      trialEndsAt: view.trialEndsAt,
      daysRemaining: view.daysRemaining,
      subscriptionStartedAt: view.subscriptionStartedAt,
      nextBillingDate: view.nextBillingDate,
      cancelledAt: view.cancelledAt,
    });
  });

  const inquiriesThirtyDays = inquiries.filter(
    (i) => i.createdAt && new Date(i.createdAt).getTime() >= thirtyDaysAgo
  ).length;

  const ownerCount = byRole.Owner || 0;
  const avgRevenuePerActiveOwner = activeSubscriptions ? Math.round((estimatedRevenue / activeSubscriptions) * 100) / 100 : 0;
  const ownerConversionRate = ownerCount ? Math.round((activeSubscriptions / ownerCount) * 1000) / 10 : 0;

  const recentSignups = [...users]
    .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
    .slice(0, 5)
    .map((u) => ({ name: u.name, role: u.role, createdAt: u.createdAt }));

  const topListings = [...listings]
    .sort((a, b) => (b.reviewCount || 0) - (a.reviewCount || 0) || (b.rating || 0) - (a.rating || 0))
    .slice(0, 5)
    .map((l) => ({ id: l.id, name: l.name, rating: l.rating || 0, reviewCount: l.reviewCount || 0 }));

  res.json({
    totalUsers: users.length,
    usersByRole: byRole,
    newSignups30d,
    totalListings: listings.length,
    featuredListings: listings.filter((l) => l.featured).length,
    totalInquiries: inquiries.length,
    inquiries30d: inquiriesThirtyDays,
    activeSubscriptions,
    tierCounts,
    statusCounts,
    estimatedRevenueGHS: estimatedRevenue,
    avgRevenuePerActiveOwner,
    ownerConversionRate,
    recentSignups,
    topListings,
    ownersOverview,
  });
});

app.get("/api/health", (req, res) => res.json({ ok: true }));

// Serve the built frontend (npm run build → dist/) so this one server handles
// both the API and the site — the whole app deploys as a single service.
// Only kicks in when dist/ actually exists (i.e. in production after a build);
// in local dev, Vite's own dev server handles the frontend instead.
const distPath = path.join(__dirname, "..", "dist");
app.use(express.static(distPath));
app.get(/^(?!\/api).*/, (req, res, next) => {
  res.sendFile(path.join(distPath, "index.html"), (err) => {
    if (err) next(); // dist/ doesn't exist yet (e.g. local dev without a build) — fall through
  });
});

// Ensure a platform admin account always exists. The Admin role can never be created through
// the public /auth/signup endpoint, so it's seeded here instead — safe to run on every boot,
// it only creates the account the first time.
async function ensureAdminSeeded() {
  const existing = store.getUsers().find((u) => u.role === ADMIN_ROLE);
  if (existing) return;
  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);
  store.addUser({ name: "BookInn Admin", email: ADMIN_EMAIL, passwordHash, role: ADMIN_ROLE });
  console.log("──────────────────────────────────────────────");
  console.log(" Seeded platform admin account:");
  console.log(`   email:    ${ADMIN_EMAIL}`);
  console.log(`   password: ${ADMIN_PASSWORD}`);
  console.log(" Change this password in production via the ADMIN_EMAIL / ADMIN_PASSWORD env vars.");
  console.log("──────────────────────────────────────────────");
}

ensureAdminSeeded().then(() => {
  app.listen(PORT, () => {
    console.log(`BookInn API listening on http://localhost:${PORT}`);
  });
});
