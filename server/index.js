import "dotenv/config";
import express from "express";
import cors from "cors";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import { store } from "./store.js";
import { migrate } from "./db.js";
import { FULL_FEATURES, maxListingsForView, computeSubscriptionView } from "./plans.js";
import { uploadBuffer, cloudinaryConfigured } from "./cloudinary.js";
import crypto from "crypto";
import { sendPasswordResetEmail, sendVerificationEmail, emailConfigured, personalizeContent, buildBrandedEmailHtml } from "./email.js";
import {
  AUDIENCE_TYPES, resolveAudience, audienceCounts, createAndDispatchCampaign,
  processCampaign, startScheduler, unsubscribeUrl, verifyUnsubscribeToken,
} from "./campaigns.js";
import { seedEmailTemplates } from "./emailTemplateSeeds.js";
import { verifyResendWebhook, handleResendEvent } from "./resendWebhook.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const PORT = process.env.PORT || 4000;
// In a real production deployment, set JWT_SECRET as a real environment
// variable and never commit a secret to source control.
const JWT_SECRET = process.env.JWT_SECRET || "bookinn-dev-secret-change-me";

const app = express();
app.use(cors());
// Listing photos/video now go through the multipart /api/uploads route above and
// straight to Cloudinary, so JSON bodies are just URLs + text — 1mb is generous.
// The `verify` hook stashes the raw request body so the Resend webhook route
// (server/resendWebhook.js) can check its HMAC signature — express.json()
// only exposes the already-parsed object otherwise.
app.use(express.json({
  limit: "1mb",
  verify: (req, res, buf) => { req.rawBody = buf.toString("utf8"); },
}));

const ROLES = ["Owner", "Student", "Parent"]; // roles the public signup form is allowed to create
const ADMIN_ROLE = "Admin"; // never accepted from public /auth/signup — seeded below instead
// The starting university, seeded into the `universities` table on first boot
// if the table is empty. From then on the list is managed via the platform
// admin dashboard (Universities tab) — see ensureUniversitySeeded() below.
const DEFAULT_UNIVERSITY = "Koforidua Technical University";
const HOSTEL_ROOM_TYPES = ["One in a room", "Two in a room", "Three in a room", "Four in a room", "Six in a room"];
const APARTMENT_ROOM_TYPES = ["Self-contained", "Shared Apartment"];

// Credentials for the platform admin account, seeded automatically the first time the
// server starts (only if no Admin account exists yet). Override via .env in production.
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@bookinn.app";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin12345";

// Wraps an async route/middleware so a rejected promise (e.g. a database
// error) is forwarded to Express's error handler instead of crashing the
// request silently — Express 4 doesn't catch async errors on its own.
const ah = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

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
    emailVerified: !!user.emailVerified,
    university: user.university || null,
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
const requireActiveOwner = ah(async (req, res, next) => {
  const user = await store.getUserById(req.user.sub);
  if (!user) return res.status(404).json({ error: "User not found." });
  if (user.role !== "Owner") return res.status(403).json({ error: "Only property owner accounts can manage listings." });
  const view = computeSubscriptionView(user);
  if (!view.isListingVisible) {
    return res.status(403).json({ error: "Your trial or subscription isn't active. Subscribe to a plan to manage your listing.", subscriptionView: view });
  }
  req.subscriptionView = view;
  next();
});

// A listing can only be edited or deleted by the owner account that created it
// (or by a platform Admin) — otherwise any subscribed owner could touch anyone's listing.
const requireOwnsListing = ah(async (req, res, next) => {
  const id = Number(req.params.id);
  const listings = await store.getListings();
  const listing = listings.find((l) => l.id === id);
  if (!listing) return res.status(404).json({ error: "Listing not found." });
  const user = await store.getUserById(req.user.sub);
  if (user.role !== ADMIN_ROLE && listing.ownerId !== user.id) {
    return res.status(403).json({ error: "You can only manage your own listings." });
  }
  next();
});

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
const requireCanCreateListing = ah(async (req, res, next) => {
  const user = await store.getUserById(req.user.sub);
  if (!user) return res.status(404).json({ error: "User not found." });
  if (user.role !== "Owner") return res.status(403).json({ error: "Only property owner accounts can create listings." });

  const ownerListings = await store.getListingsByOwner(user.id);
  const ownerListingCount = ownerListings.length;
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
});

// Platform admin routes (site-wide stats, all users) are restricted to the Admin role.
const requireAdmin = ah(async (req, res, next) => {
  const user = await store.getUserById(req.user.sub);
  if (!user) return res.status(404).json({ error: "User not found." });
  if (user.role !== ADMIN_ROLE) return res.status(403).json({ error: "Admin access only." });
  req.adminUser = user;
  next();
});

// ---------------------------------------------------------
// Email & Communication Center — small in-memory rate limiter for the
// send/schedule action (per admin), so a runaway script or a mis-click storm
// can't fire off many campaigns in a row. This is a single-process app (no
// Redis in the stack), so an in-memory window is the appropriate weight of
// protection here — it resets on redeploy, which is acceptable for an
// action a human admin takes deliberately and rarely.
const sendAttemptsByAdmin = new Map();
function checkSendRateLimit(adminId) {
  const now = Date.now();
  const windowMs = 60 * 1000;
  const maxPerWindow = 5;
  const attempts = (sendAttemptsByAdmin.get(adminId) || []).filter((t) => now - t < windowMs);
  if (attempts.length >= maxPerWindow) return false;
  attempts.push(now);
  sendAttemptsByAdmin.set(adminId, attempts);
  return true;
}
// ---------------------------------------------------------
// Uploads (Cloudinary)
// ---------------------------------------------------------
// Files arrive as multipart/form-data (not base64-in-JSON) and are held in
// memory only long enough to stream straight to Cloudinary — never written to
// disk and never stored in Postgres. Listings keep just the returned URL.
// 25MB covers the walkthrough/listing video case; images are far smaller.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
});

app.post("/api/uploads", requireAuth, upload.single("file"), ah(async (req, res) => {
  if (!cloudinaryConfigured) {
    return res.status(503).json({ error: "Image storage isn't configured on the server yet. Set the CLOUDINARY_* env vars." });
  }
  if (!req.file) return res.status(400).json({ error: "No file uploaded." });
  const isImage = req.file.mimetype.startsWith("image/");
  const isVideo = req.file.mimetype.startsWith("video/");
  if (!isImage && !isVideo) return res.status(400).json({ error: "Only image or video files are allowed." });

  const result = await uploadBuffer(req.file.buffer, {
    folder: `bookinn/${req.user.sub}`,
    resourceType: isVideo ? "video" : "image",
  });
  res.status(201).json({ url: result.secure_url, publicId: result.public_id });
}));

// ---------------------------------------------------------
// Auth
// ---------------------------------------------------------
app.post("/api/auth/signup", ah(async (req, res) => {
  const { name, email, password, role, university } = req.body || {};
  if (!name || !email || !password) return res.status(400).json({ error: "Name, email and password are required." });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: "Enter a valid email address." });
  if (password.length < 6) return res.status(400).json({ error: "Password must be at least 6 characters." });
  if (role && !ROLES.includes(role)) return res.status(400).json({ error: "Invalid account type." });
  if (await store.getUserByEmail(email)) return res.status(409).json({ error: "An account with this email already exists." });
  // Students pick their campus at signup so their browse view can be scoped
  // to hostels/apartments at that university only.
  const resolvedRole = role || "Student";
  if (resolvedRole === "Student") {
    if (!university) return res.status(400).json({ error: "Select your university." });
    const universities = await store.getUniversities();
    if (!universities.some((u) => u.name === university)) {
      return res.status(400).json({ error: "Select your university." });
    }
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await store.addUser({
    name, email, passwordHash, role,
    university: resolvedRole === "Student" ? university : null,
  });

  // Sends a "confirm your email" link. A failure here (e.g. Resend not yet
  // configured) is logged but never blocks account creation — the person can
  // still sign in and use BookInn immediately either way.
  const verifyToken = crypto.randomBytes(32).toString("hex");
  const verifyExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
  await store.setVerifyToken(user.id, verifyToken, verifyExpiresAt);
  try {
    await sendVerificationEmail(user.email, verifyToken);
  } catch (err) {
    console.error("Failed to send verification email:", err);
  }

  const token = signToken(user);
  res.status(201).json({ token, user: publicUser(user) });
}));

// Forgot password — always responds the same way whether or not the email is
// registered, so this endpoint can't be used to check which emails have
// BookInn accounts.
app.post("/api/auth/forgot-password", ah(async (req, res) => {
  const { email } = req.body || {};
  if (!email) return res.status(400).json({ error: "Email is required." });
  const user = await store.getUserByEmail(email);
  if (user) {
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await store.setResetToken(user.id, token, expiresAt);
    try {
      await sendPasswordResetEmail(user.email, token);
    } catch (err) {
      console.error("Failed to send password reset email:", err);
    }
  }
  res.json({ message: "If an account exists for that email, a reset link has been sent." });
}));

// Reset password — the token proves the person clicked the emailed link;
// it's single-use (store.resetPassword clears it) and expires after 1 hour.
app.post("/api/auth/reset-password", ah(async (req, res) => {
  const { token, password } = req.body || {};
  if (!token || !password) return res.status(400).json({ error: "A token and new password are required." });
  if (password.length < 6) return res.status(400).json({ error: "Password must be at least 6 characters." });
  const user = await store.getUserByResetToken(token);
  if (!user) return res.status(400).json({ error: "This reset link is invalid or has expired. Request a new one." });
  const passwordHash = await bcrypt.hash(password, 10);
  const updated = await store.resetPassword(user.id, passwordHash);
  const jwtToken = signToken(updated);
  res.json({ token: jwtToken, user: publicUser(updated) });
}));

// Verify email — the person clicks the link sent at signup; single-use,
// expires after 24 hours.
app.post("/api/auth/verify-email", ah(async (req, res) => {
  const { token } = req.body || {};
  if (!token) return res.status(400).json({ error: "A verification token is required." });
  const user = await store.getUserByVerifyToken(token);
  if (!user) return res.status(400).json({ error: "This verification link is invalid or has expired." });
  const updated = await store.markEmailVerified(user.id);
  res.json({ user: publicUser(updated) });
}));

// Resend the signup verification link — same privacy-safe pattern as
// forgot-password: always responds the same way whether or not the email is
// registered, and also whether or not it's already verified, so this
// endpoint can't be used to check who has an account.
app.post("/api/auth/resend-verification", ah(async (req, res) => {
  const { email } = req.body || {};
  if (!email) return res.status(400).json({ error: "Email is required." });
  const user = await store.getUserByEmail(email);
  if (user && !user.emailVerified) {
    const verifyToken = crypto.randomBytes(32).toString("hex");
    const verifyExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    await store.setVerifyToken(user.id, verifyToken, verifyExpiresAt);
    try {
      await sendVerificationEmail(user.email, verifyToken);
    } catch (err) {
      console.error("Failed to send verification email:", err);
    }
  }
  res.json({ message: "If an account exists for that email and isn't verified yet, a new confirmation link has been sent." });
}));

app.post("/api/auth/login", ah(async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: "Email and password are required." });
  const user = await store.getUserByEmail(email);
  if (!user) return res.status(401).json({ error: "Invalid email or password." });
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(401).json({ error: "Invalid email or password." });
  // The platform admin account is seeded directly (never goes through the public
  // signup/verify-email flow), so it's exempt from this check. Everyone else must
  // have clicked their signup verification link — a single click is enough; after
  // that emailVerified stays true forever, so this never blocks them again.
  if (user.role !== ADMIN_ROLE && !user.emailVerified) {
    return res.status(403).json({ error: "Please check your email to confirm your account first." });
  }
  const token = signToken(user);
  res.json({ token, user: publicUser(user) });
}));

app.get("/api/auth/me", requireAuth, ah(async (req, res) => {
  const user = await store.getUserById(req.user.sub);
  if (!user) return res.status(404).json({ error: "User not found." });
  res.json({ user: publicUser(user) });
}));

// ---------------------------------------------------------
// Payment integration, the GH₵5 booking fee, and owner subscription plans
// (Basic/Premium/Featured) have been removed. Every owner now always has
// full feature access (see server/plans.js) and every booking request goes
// straight to the owner's WhatsApp with no fee.
// ---------------------------------------------------------
// Subscription status — kept as a lightweight endpoint (rather than removed)
// since the owner dashboard still reads it to know it always has full access.
app.get("/api/subscription/me", requireAuth, ah(async (req, res) => {
  const user = await store.getUserById(req.user.sub);
  if (!user) return res.status(404).json({ error: "User not found." });
  const view = computeSubscriptionView(user);
  res.json({ subscriptionView: view, reminder: null });
}));

// A hostel can offer several room occupancy categories at once (e.g. "Two in a room" at
// GH₵1,200 AND "Four in a room" at GH₵800) — each with its own price. Apartments only ever
// have a single category. This normalizes whatever the client sent into a clean array and
// derives the headline roomType/price used for cards, search and sorting.
function normalizeRoomOptions(type, rawOptions, allowAvailability) {
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
    const entry = { roomType, price };
    if (allowAvailability) {
      entry.availability = AVAILABILITY_STATUSES.includes(opt?.availability) ? opt.availability : "Space available";
    }
    cleaned.push(entry);
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
    .filter((s) => s && typeof s.image === "string" && s.image.trim())
    .slice(0, cap)
    .map((s, i) => ({
      id: i + 1,
      label: typeof s.label === "string" && s.label.trim() ? s.label.trim().slice(0, 40) : `Stop ${i + 1}`,
      image: s.image,
    }));
}

function enforcePlanOnListingPayload(view, l) {
  const { features } = view;
  const images = Array.isArray(l.images) ? l.images : [];
  const galleryCap = features.maxPhotos;
  if (images.length > galleryCap) {
    return {
      error: `You've reached the ${galleryCap}-photo limit per listing.`,
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
function toPublicListing(listing, owner) {
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
    topSearch: !!features.topSearch,
    homepagePlacement: !!features.homepagePlacement,
    priorityEnquiries: !!features.priorityEnquiries,
    virtualWalkthrough: !!features.virtualWalkthrough,
    walkthrough: features.virtualWalkthrough ? (listing.walkthrough || []) : [],
    planTier: effectivePlan,
    searchPriority: features.searchPriority || 0,
  };
}

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

app.get("/api/listings", ah(async (req, res) => {
  const all = await store.getListings();
  const byOwner = {};
  all.forEach((l) => { (byOwner[l.ownerId] ||= []).push(l); });

  const ownerIds = Object.keys(byOwner).map(Number);
  const owners = await Promise.all(ownerIds.map((id) => store.getUserById(id)));
  const ownerById = new Map(owners.filter(Boolean).map((u) => [u.id, u]));

  const visibleIds = new Set();
  Object.entries(byOwner).forEach(([ownerId, ownerListings]) => {
    const owner = ownerById.get(Number(ownerId));
    if (!owner) return;
    visibleListingIdsForOwner(owner, ownerListings).forEach((id) => visibleIds.add(id));
  });
  let listings = all
    .filter((l) => visibleIds.has(l.id))
    .map((l) => toPublicListing(l, ownerById.get(l.ownerId)))
    .filter(Boolean)
    .sort((a, b) => b.searchPriority - a.searchPriority);
  // Optional ?university= filter — used to scope a logged-in student's browse
  // view to their own campus so they never see (or open) another school's listings.
  if (req.query.university) {
    listings = listings.filter((l) => l.university === req.query.university);
  }
  res.json({ listings });
}));

// Owner's own listings — unfiltered (includes a paused/expired listing so the
// owner can still see and manage it) and annotated with their live subscription
// view so the dashboard always reflects real, server-computed status.
app.get("/api/listings/mine", requireAuth, ah(async (req, res) => {
  const user = await store.getUserById(req.user.sub);
  if (!user) return res.status(404).json({ error: "User not found." });
  if (user.role !== "Owner") return res.status(403).json({ error: "Only property owner accounts have listings." });
  const view = computeSubscriptionView(user);
  const ownerListings = await store.getListingsByOwner(user.id);
  const visibleIds = visibleListingIdsForOwner(user, ownerListings);
  const listings = ownerListings.map((l) => ({
    ...l,
    visible: visibleIds.has(l.id),
    photosOverLimit: Math.max(0, (l.images?.length || 0) - view.features.maxPhotos),
  }));
  res.json({ listings, subscriptionView: view, maxListings: maxListingsForView(view) });
}));

app.post("/api/listings", requireAuth, requireCanCreateListing, ah(async (req, res) => {
  const l = req.body || {};
  const type = l.type === "Apartment" ? "Apartment" : "Hostel";
  if (!l.name) return res.status(400).json({ error: "Listing name is required." });
  const rooms = normalizeRoomOptions(type, l.roomOptions, req.subscriptionView.features.advancedAvailability);
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
  const listing = await store.addListing({
    ownerId: req.user.sub,
    name: l.name,
    type,
    roomOptions: rooms.roomOptions,
    roomType: rooms.roomType,
    price: rooms.price,
    bath: l.bath || "Shared bath",
    kitchen: !!l.kitchen,
    university: l.university || DEFAULT_UNIVERSITY,
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
  const updatedUser = await store.getUserById(req.user.sub);
  res.status(201).json({ listing, user: publicUser(updatedUser) });
}));

app.put("/api/listings/:id", requireAuth, requireActiveOwner, requireOwnsListing, ah(async (req, res) => {
  const id = Number(req.params.id);
  const l = req.body || {};
  const type = l.type === "Apartment" ? "Apartment" : "Hostel";
  if (!l.name) return res.status(400).json({ error: "Listing name is required." });
 const rooms = normalizeRoomOptions(type, l.roomOptions, req.subscriptionView.features.advancedAvailability);
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
    university: l.university || DEFAULT_UNIVERSITY,
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
  const updated = await store.updateListing(id, patch);
  if (!updated) return res.status(404).json({ error: "Listing not found." });
  res.json({ listing: updated });
}));

app.delete("/api/listings/:id", requireAuth, requireActiveOwner, requireOwnsListing, ah(async (req, res) => {
  const ok = await store.deleteListing(Number(req.params.id));
  if (!ok) return res.status(404).json({ error: "Listing not found." });
  res.status(204).end();
}));

// Records a profile view — called once when a student opens a listing's detail page.
// No auth required (students browse anonymously); feeds the owner dashboard's real
// "Profile views" stat instead of a hardcoded number.
app.post("/api/listings/:id/view", ah(async (req, res) => {
  const updated = await store.recordListingView(Number(req.params.id));
  if (!updated) return res.status(404).json({ error: "Listing not found." });
  res.status(204).end();
}));

// Student reviews — anyone can leave one, no login required.
app.post("/api/listings/:id/reviews", ah(async (req, res) => {
  const id = Number(req.params.id);
  const { name, rating, text } = req.body || {};
  if (!name || !rating) return res.status(400).json({ error: "Name and a star rating are required." });
  const ratingNum = Number(rating);
  if (ratingNum < 1 || ratingNum > 10) return res.status(400).json({ error: "Rating must be between 1 and 10." });
  const updated = await store.addReview(id, { name, rating: ratingNum, text: text || "" });
  if (!updated) return res.status(404).json({ error: "Listing not found." });
  res.status(201).json({ listing: updated });
}));

// ---------------------------------------------------------
// Inquiries (booking / contact form submissions)
// ---------------------------------------------------------
app.post("/api/inquiries", ah(async (req, res) => {
  const { listingId, name, phone, email, moveIn, message, roomType } = req.body || {};
  if (!listingId || !name) return res.status(400).json({ error: "listingId and name are required." });
  const inquiry = await store.addInquiry({ listingId, name, phone, email, moveIn, message, roomType });
  res.status(201).json({ inquiry });
}));

// Attaches a `priority` flag to each inquiry — true when the listing's owner is on
// a plan with the priorityEnquiries feature (Featured) — and sorts priority
// inquiries first, newest first within each group. Keeps the "priority enquiries"
// promise real rather than a dead PLAN_FEATURES field.
async function withPriority(inquiries) {
  const listings = await store.getListings();
  const listingById = new Map(listings.map((l) => [l.id, l]));
  const ownerFeaturesCache = new Map();
  const featuresForOwner = async (ownerId) => {
    if (!ownerFeaturesCache.has(ownerId)) {
      const owner = await store.getUserById(ownerId);
      ownerFeaturesCache.set(ownerId, owner ? computeSubscriptionView(owner).features : FULL_FEATURES);
    }
    return ownerFeaturesCache.get(ownerId);
  };
  const enriched = [];
  for (const i of inquiries) {
    const listing = listingById.get(i.listingId);
    const priority = !!(listing && (await featuresForOwner(listing.ownerId)).priorityEnquiries);
    enriched.push({ ...i, priority });
  }
  enriched.sort((a, b) => {
    if (a.priority !== b.priority) return a.priority ? -1 : 1;
    return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
  });
  return enriched;
}

app.get("/api/inquiries", requireAuth, ah(async (req, res) => {
  const user = await store.getUserById(req.user.sub);
  if (!user) return res.status(404).json({ error: "User not found." });
  if (user.role === ADMIN_ROLE) {
    return res.json({ inquiries: await withPriority(await store.getInquiries()) });
  }
  if (user.role === "Owner") {
    const listings = await store.getListings();
    const myListingIds = new Set(listings.filter((l) => l.ownerId === user.id).map((l) => l.id));
    const inquiries = await store.getInquiries();
    return res.json({ inquiries: await withPriority(inquiries.filter((i) => myListingIds.has(i.listingId))) });
  }
  return res.status(403).json({ error: "Only property owners and platform admins can view inquiries." });
}));

// Marks (or unmarks) a student as an actual confirmed resident — separate from
// having paid the booking fee, since whether they really moved in only the
// owner (or platform admin, standing in for a busy owner) can confirm.
app.patch("/api/inquiries/:id/confirm", requireAuth, ah(async (req, res) => {
  const id = Number(req.params.id);
  const { confirmed } = req.body || {};
  const inquiries = await store.getInquiries();
  const inquiry = inquiries.find((i) => i.id === id);
  if (!inquiry) return res.status(404).json({ error: "Inquiry not found." });
  const listings = await store.getListings();
  const listing = listings.find((l) => l.id === inquiry.listingId);
  if (!listing) return res.status(404).json({ error: "Listing not found." });
  const user = await store.getUserById(req.user.sub);
  if (user.role !== ADMIN_ROLE && listing.ownerId !== user.id) {
    return res.status(403).json({ error: "You can only update students on your own listings." });
  }
  const updated = await store.setConfirmedResident(id, !!confirmed);
  res.json({ inquiry: updated });
}));

// ---------------------------------------------------------
// Owner dashboard — real, per-owner stats (replaces any hardcoded numbers on the frontend)
// ---------------------------------------------------------
app.get("/api/owner/stats", requireAuth, ah(async (req, res) => {
  const user = await store.getUserById(req.user.sub);
  if (!user) return res.status(404).json({ error: "User not found." });
  if (user.role !== "Owner") return res.status(403).json({ error: "Only property owner accounts have a dashboard." });

  const allListings = await store.getListings();
  const myListings = allListings.filter((l) => l.ownerId === user.id);
  const myListingIds = new Set(myListings.map((l) => l.id));

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const allInquiries = await store.getInquiries();
  const inquiriesThisMonthList = allInquiries.filter(
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
}));

// ---------------------------------------------------------
// Universities — public read (signup form, owner listing form, guest/student
// filters), admin-only write (Universities tab on the platform admin dashboard).
// ---------------------------------------------------------
app.get("/api/universities", ah(async (req, res) => {
  const universities = await store.getUniversities();
  res.json({ universities });
}));

app.post("/api/admin/universities", requireAuth, requireAdmin, ah(async (req, res) => {
  const name = (req.body?.name || "").trim();
  if (!name) return res.status(400).json({ error: "University name is required." });
  const university = await store.addUniversity(name);
  res.status(201).json({ university });
}));

// Renames a university and cascades the new name onto every listing and
// student account that referenced the old one (see store.renameUniversity) —
// otherwise a rename would silently orphan existing listings/students.
app.patch("/api/admin/universities/:id", requireAuth, requireAdmin, ah(async (req, res) => {
  const id = Number(req.params.id);
  const name = (req.body?.name || "").trim();
  if (!name) return res.status(400).json({ error: "University name is required." });
  const universities = await store.getUniversities();
  const target = universities.find((u) => u.id === id);
  if (!target) return res.status(404).json({ error: "University not found." });
  if (universities.some((u) => u.id !== id && u.name.toLowerCase() === name.toLowerCase())) {
    return res.status(409).json({ error: "A university with that name already exists." });
  }
  const updated = await store.renameUniversity(id, name);
  res.json({ university: updated });
}));

app.delete("/api/admin/universities/:id", requireAuth, requireAdmin, ah(async (req, res) => {
  const id = Number(req.params.id);
  const universities = await store.getUniversities();
  const target = universities.find((u) => u.id === id);
  if (!target) return res.status(404).json({ error: "University not found." });
  // Block deleting a university that's still in use — otherwise existing
  // listings/students are left pointing at a campus that no longer appears
  // anywhere in the app (signup dropdown, filters, etc).
  const [listings, users] = await Promise.all([store.getListings(), store.getUsers()]);
  const inUseByListing = listings.some((l) => l.university === target.name);
  const inUseByStudent = users.some((u) => u.university === target.name);
  if (inUseByListing || inUseByStudent) {
    return res.status(400).json({ error: "Can't remove a university that still has listings or students assigned to it." });
  }
  const ok = await store.deleteUniversity(id);
  if (!ok) return res.status(404).json({ error: "University not found." });
  res.status(204).end();
}));

// ---------------------------------------------------------
// Platform admin — accounts, listings & inquiries overview
// ---------------------------------------------------------
app.get("/api/admin/users", requireAuth, requireAdmin, ah(async (req, res) => {
  const users = (await store.getUsers()).map(publicUser);
  res.json({ users });
}));

// Lets a platform admin manage an owner's listings on their behalf — e.g. the
// owner sent details over WhatsApp because they're busy — without needing
// their password or making them click a verification email first. Issues a
// normal login token for that owner's account; admin accounts can't be
// impersonated this way.
app.post("/api/admin/users/:id/impersonate", requireAuth, requireAdmin, ah(async (req, res) => {
  const targetUser = await store.getUserById(req.params.id);
  if (!targetUser) return res.status(404).json({ error: "User not found." });
  if (targetUser.role === ADMIN_ROLE) return res.status(400).json({ error: "Can't manage another admin account this way." });
  const token = signToken(targetUser);
  res.json({ token, user: publicUser(targetUser) });
}));
app.get("/api/admin/stats", requireAuth, requireAdmin, ah(async (req, res) => {
  const users = await store.getUsers();
  const listings = await store.getListings();
  const inquiries = await store.getInquiries();

  const byRole = { Student: 0, Parent: 0, Owner: 0, Admin: 0 };
  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
  let newSignups30d = 0;

  const ownersOverview = [];

  for (const u of users) {
    if (byRole[u.role] !== undefined) byRole[u.role] += 1;
    if (u.createdAt && new Date(u.createdAt).getTime() >= thirtyDaysAgo) newSignups30d += 1;
    if (u.role !== "Owner") continue;

    const view = computeSubscriptionView(u);
    const ownerListings = await store.getListingsByOwner(u.id);
    const visibleIds = visibleListingIdsForOwner(u, ownerListings);
    ownersOverview.push({
      ownerId: u.id,
      ownerName: u.name,
      ownerEmail: u.email,
      listings: ownerListings.map((l) => ({ id: l.id, name: l.name, status: visibleIds.has(l.id) ? "Active" : "Paused" })),
      maxListings: maxListingsForView(view),
      subscriptionStartedAt: view.subscriptionStartedAt,
    });
  }

  const inquiriesThirtyDays = inquiries.filter(
    (i) => i.createdAt && new Date(i.createdAt).getTime() >= thirtyDaysAgo
  ).length;

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
    recentSignups,
    topListings,
    ownersOverview,
  });
}));

// ---------------------------------------------------------
// Email & Communication Center
// ---------------------------------------------------------
// Every route below is behind requireAuth + requireAdmin — the same gate
// already used for the rest of the platform admin panel. There's no separate
// login/permission system for email; a BookInn Admin account is a BookInn
// Admin account.

app.get("/api/admin/emails/stats", requireAuth, requireAdmin, ah(async (req, res) => {
  const [dashboard, { campaigns: recentCampaigns }, eligible, raw] = await Promise.all([
    store.getEmailDashboardStats(),
    store.getEmailCampaigns({ excludeDrafts: true, limit: 8, offset: 0 }),
    audienceCounts(),
    store.getUserCountsByRole(),
  ]);
  res.json({
    ...dashboard,
    recentCampaigns,
    audience: { eligible, total: raw },
  });
}));

app.get("/api/admin/emails/audience-counts", requireAuth, requireAdmin, ah(async (req, res) => {
  const [eligible, raw] = await Promise.all([audienceCounts(), store.getUserCountsByRole()]);
  res.json({ eligible, total: raw });
}));

// Searchable/paginated recipient picker for "Selected Users" — never sends
// the whole user table to the browser, and scales to thousands of users.
app.get("/api/admin/emails/users", requireAuth, requireAdmin, ah(async (req, res) => {
  const search = String(req.query.search || "");
  const role = String(req.query.role || "");
  const limit = Math.min(Number(req.query.limit) || 20, 100);
  const page = Math.max(Number(req.query.page) || 1, 1);
  const result = await store.searchUsers({ search, role, limit, offset: (page - 1) * limit });
  res.json(result);
}));

// ---- templates ----
app.get("/api/admin/emails/templates", requireAuth, requireAdmin, ah(async (req, res) => {
  const templates = await store.getEmailTemplates();
  res.json({ templates });
}));

app.post("/api/admin/emails/templates", requireAuth, requireAdmin, ah(async (req, res) => {
  const { name, subject, content, category } = req.body || {};
  if (!name || !name.trim()) return res.status(400).json({ error: "Please enter a template name." });
  const template = await store.createEmailTemplate({ name: name.trim(), subject, content, category, createdBy: req.user.sub });
  res.status(201).json({ template });
}));

app.put("/api/admin/emails/templates/:id", requireAuth, requireAdmin, ah(async (req, res) => {
  const existing = await store.getEmailTemplateById(req.params.id);
  if (!existing) return res.status(404).json({ error: "Template not found." });
  const { name, subject, content, category } = req.body || {};
  const template = await store.updateEmailTemplate(req.params.id, { name, subject, content, category });
  res.json({ template });
}));

app.delete("/api/admin/emails/templates/:id", requireAuth, requireAdmin, ah(async (req, res) => {
  const ok = await store.deleteEmailTemplate(req.params.id);
  if (!ok) return res.status(404).json({ error: "Template not found." });
  res.json({ message: "Template deleted." });
}));

// Renders the exact branded shell + personalization a recipient would get,
// using the signed-in admin's own name/email/role as the sample values —
// what you see in Preview is what Send actually produces, not a mock-up.
app.post("/api/admin/emails/preview", requireAuth, requireAdmin, ah(async (req, res) => {
  const { subject, content } = req.body || {};
  if (subject === undefined || content === undefined) {
    return res.status(400).json({ error: "Subject and content are required." });
  }
  const sample = { name: req.adminUser.name, email: req.adminUser.email, role: "Student" };
  const personalizedSubject = personalizeContent(subject || "", sample);
  const personalizedBody = personalizeContent(content || "", sample);
  const html = buildBrandedEmailHtml({
    subject: personalizedSubject,
    bodyHtml: personalizedBody || "<p></p>",
    unsubscribeUrl: unsubscribeUrl(req.adminUser.id),
  });
  res.json({ subject: personalizedSubject, html, sample });
}));

// ---- campaigns: history / detail ----
app.get("/api/admin/emails/campaigns", requireAuth, requireAdmin, ah(async (req, res) => {
  const { search = "", status = "", audience = "", createdBy = "" } = req.query;
  const limit = Math.min(Number(req.query.limit) || 20, 100);
  const page = Math.max(Number(req.query.page) || 1, 1);
  const result = await store.getEmailCampaigns({
    search: String(search), status: String(status), audience: String(audience), createdBy: String(createdBy),
    limit, offset: (page - 1) * limit,
  });
  res.json(result);
}));

app.get("/api/admin/emails/campaigns/:id", requireAuth, requireAdmin, ah(async (req, res) => {
  const campaign = await store.getEmailCampaignById(req.params.id);
  if (!campaign) return res.status(404).json({ error: "Campaign not found." });
  res.json({ campaign });
}));

app.get("/api/admin/emails/campaigns/:id/recipients", requireAuth, requireAdmin, ah(async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 50, 200);
  const page = Math.max(Number(req.query.page) || 1, 1);
  const result = await store.getEmailRecipientsByCampaign(req.params.id, { limit, offset: (page - 1) * limit });
  res.json(result);
}));

// Shared validation for creating/sending a campaign.
function validateCampaignInput({ subject, content, audienceType, selectedUserIds, action }) {
  if (action !== "draft") {
    if (!subject || !subject.trim()) return "Please enter an email subject.";
    if (!content || !content.trim()) return "Please write a message before sending.";
  }
  if (audienceType && !AUDIENCE_TYPES.includes(audienceType)) return "Please choose a valid audience.";
  if (audienceType === "selected" && action !== "draft" && (!Array.isArray(selectedUserIds) || !selectedUserIds.length)) {
    return "Please select at least one recipient.";
  }
  return null;
}

// Creates a campaign. `action` is "draft" | "schedule" | "send" — the
// browser only ever asks for one of these three things; recipients are
// always resolved from the live database here, not sent from the client.
app.post("/api/admin/emails/campaigns", requireAuth, requireAdmin, ah(async (req, res) => {
  const { subject, content, audienceType = "all", selectedUserIds = [], templateId, action = "draft", scheduledAt, idempotencyKey } = req.body || {};

  const validationError = validateCampaignInput({ subject, content, audienceType, selectedUserIds, action });
  if (validationError) return res.status(400).json({ error: validationError });

  if (action === "schedule" && (!scheduledAt || new Date(scheduledAt).getTime() <= Date.now())) {
    return res.status(400).json({ error: "Please choose a future date and time to schedule this email." });
  }

  if (action === "send" && !checkSendRateLimit(req.user.sub)) {
    return res.status(429).json({ error: "Too many campaigns sent in a short time. Please wait a minute and try again." });
  }

  try {
    const { campaign, duplicate } = await createAndDispatchCampaign({
      subject: subject || "", content: content || "", audienceType, selectedUserIds,
      templateId, action, scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
      createdBy: req.user.sub, createdByName: req.adminUser.name,
      idempotencyKey: idempotencyKey || null,
    });
    if (duplicate) return res.status(200).json({ campaign, message: "This campaign was already submitted." });
    res.status(201).json({ campaign });
  } catch (err) {
    console.error("Failed to create campaign:", err);
    res.status(500).json({ error: "We couldn't send this campaign. Please try again." });
  }
}));

// Edits a draft (subject/content/audience/template) before it's sent.
app.put("/api/admin/emails/campaigns/:id", requireAuth, requireAdmin, ah(async (req, res) => {
  const existing = await store.getEmailCampaignById(req.params.id);
  if (!existing) return res.status(404).json({ error: "Campaign not found." });
  if (existing.status !== "draft") return res.status(400).json({ error: "Only draft campaigns can be edited this way." });

  const { subject, content, audienceType, selectedUserIds, templateId } = req.body || {};
  const validationError = validateCampaignInput({ subject, content, audienceType, selectedUserIds, action: "draft" });
  if (validationError) return res.status(400).json({ error: validationError });

  let recipientCount = existing.recipientCount;
  if (audienceType) {
    const recipients = await resolveAudience(audienceType, selectedUserIds);
    recipientCount = recipients.length;
  }

  const campaign = await store.updateEmailCampaign(req.params.id, {
    subject, content, audienceType,
    selectedUserIds: audienceType === "selected" ? (selectedUserIds || []).map(Number) : undefined,
    recipientCount,
  });
  res.json({ campaign });
}));

// Sends (or schedules) an existing draft/scheduled campaign — used from the
// Drafts and Scheduled lists. Recipients are re-resolved fresh at this
// moment (not reused from when the draft was first saved), and the
// idempotency guard + rate limit apply exactly as they do on create.
app.post("/api/admin/emails/campaigns/:id/send", requireAuth, requireAdmin, ah(async (req, res) => {
  const existing = await store.getEmailCampaignById(req.params.id);
  if (!existing) return res.status(404).json({ error: "Campaign not found." });
  if (!["draft", "scheduled", "cancelled"].includes(existing.status)) {
    return res.status(400).json({ error: "This campaign has already been sent or is currently sending." });
  }
  const { action = "send", scheduledAt, idempotencyKey } = req.body || {};

  if (!existing.subject?.trim()) return res.status(400).json({ error: "Please enter an email subject." });
  if (!existing.content?.trim()) return res.status(400).json({ error: "Please write a message before sending." });

  if (existing.audienceType === "selected" && !(existing.selectedUserIds || []).length) {
    return res.status(400).json({ error: "Please select at least one recipient." });
  }

  if (action === "schedule" && (!scheduledAt || new Date(scheduledAt).getTime() <= Date.now())) {
    return res.status(400).json({ error: "Please choose a future date and time to schedule this email." });
  }

  if (action === "send" && !checkSendRateLimit(req.user.sub)) {
    return res.status(429).json({ error: "Too many campaigns sent in a short time. Please wait a minute and try again." });
  }

  if (idempotencyKey) {
    const dup = await store.getEmailCampaignByIdempotencyKey(idempotencyKey);
    if (dup && dup.id !== existing.id) return res.status(200).json({ campaign: dup, message: "This campaign was already submitted." });
  }

  const recipients = await resolveAudience(existing.audienceType, existing.selectedUserIds);
  if (!recipients.length) return res.status(400).json({ error: "Please select at least one recipient." });

  if (action === "schedule") {
    const campaign = await store.updateEmailCampaign(existing.id, {
      status: "scheduled", scheduledAt: new Date(scheduledAt), recipientCount: recipients.length,
    });
    return res.json({ campaign });
  }

  await store.updateEmailCampaign(existing.id, { status: "queued", recipientCount: recipients.length });
  await store.addEmailRecipients(existing.id, recipients.map((r) => ({ userId: r.id, name: r.name, email: r.email })));
  processCampaign(existing.id).catch((err) => console.error(`Campaign ${existing.id} failed to process:`, err));

  const campaign = await store.getEmailCampaignById(existing.id);
  res.status(202).json({ campaign });
}));

app.post("/api/admin/emails/campaigns/:id/cancel", requireAuth, requireAdmin, ah(async (req, res) => {
  const existing = await store.getEmailCampaignById(req.params.id);
  if (!existing) return res.status(404).json({ error: "Campaign not found." });
  if (!["scheduled", "queued"].includes(existing.status)) {
    return res.status(400).json({ error: "Only scheduled or queued campaigns can be cancelled." });
  }
  const campaign = await store.updateEmailCampaign(existing.id, { status: "cancelled" });
  res.json({ campaign });
}));

app.delete("/api/admin/emails/campaigns/:id", requireAuth, requireAdmin, ah(async (req, res) => {
  const ok = await store.deleteEmailCampaign(req.params.id);
  if (!ok) return res.status(400).json({ error: "Only draft campaigns can be deleted." });
  res.json({ message: "Draft deleted." });
}));

// ---------------------------------------------------------
// Public: unsubscribe link (clicked from inside an email, so it's a plain
// GET landed on directly in the browser, not an API call from the SPA) and
// the Resend delivery-event webhook.
// ---------------------------------------------------------
app.get("/api/emails/unsubscribe", ah(async (req, res) => {
  const uid = Number(req.query.uid);
  const token = String(req.query.token || "");
  const page = (title, message) => `
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 60px auto; text-align: center; color: #1a1a1a;">
      <h2 style="color: #003580;">${title}</h2>
      <p style="color: #6b6b6b;">${message}</p>
    </div>`;
  if (!uid || !verifyUnsubscribeToken(uid, token)) {
    return res.status(400).send(page("Link invalid or expired", "This unsubscribe link isn't valid."));
  }
  await store.setMarketingPreference(uid, false);
  res.send(page("You've been unsubscribed", "You won't receive further announcement emails from BookInn. You'll still receive essential account emails like booking confirmations and password resets."));
}));

app.post("/api/webhooks/resend", ah(async (req, res) => {
  if (process.env.RESEND_WEBHOOK_SECRET && !verifyResendWebhook(req)) {
    return res.status(401).json({ error: "Invalid signature." });
  }
  try {
    await handleResendEvent(req.body);
  } catch (err) {
    console.error("Failed to process Resend webhook event:", err);
  }
  res.status(200).json({ ok: true });
}));

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

// Generic error handler — catches anything ah() forwarded (mainly database
// errors) so a broken query returns a clean 500 instead of crashing the process
// or hanging the request.
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  if (res.headersSent) return next(err);
  res.status(500).json({ error: "Something went wrong on the server. Please try again." });
});

// Ensure a platform admin account always exists. The Admin role can never be created through
// the public /auth/signup endpoint, so it's seeded here instead — safe to run on every boot,
// it only creates the account the first time.
async function ensureAdminSeeded() {
  const existing = (await store.getUsers()).find((u) => u.role === ADMIN_ROLE);
  if (existing) return;
  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);
  await store.addUser({ name: "BookInn Admin", email: ADMIN_EMAIL, passwordHash, role: ADMIN_ROLE });
  console.log("──────────────────────────────────────────────");
  console.log(" Seeded platform admin account:");
  console.log(`   email:    ${ADMIN_EMAIL}`);
  console.log(`   password: ${ADMIN_PASSWORD}`);
  console.log(" Change this password in production via the ADMIN_EMAIL / ADMIN_PASSWORD env vars.");
  console.log("──────────────────────────────────────────────");
}

// Seed the starting university the very first time the server boots against
// an empty universities table — from then on the list is fully managed via
// the platform admin dashboard, never hardcoded again.
async function ensureUniversitySeeded() {
  const existing = await store.getUniversities();
  if (existing.length) return;
  await store.addUniversity(DEFAULT_UNIVERSITY);
}

migrate()
  .then(() => ensureAdminSeeded())
  .then(() => ensureUniversitySeeded())
  .then(() => seedEmailTemplates(store))
  .then(() => {
    app.listen(PORT, () => {
      console.log(`BookInn API listening on http://localhost:${PORT}`);
      startScheduler();
    });
  })
  .catch((err) => {
    console.error("Failed to start server — could not connect to / migrate the database:", err);
    process.exit(1);
  });
