// ---------------------------------------------------------
// SUBSCRIPTION PLANS — single source of truth
// ---------------------------------------------------------
// Every plan/feature/price check anywhere in the backend goes through this
// file. Nothing about a user's plan or feature access is ever trusted from
// the client — the frontend mirrors these values for display only.

export const PLAN_ORDER = ["Basic", "Premium", "Featured"];

// GH₵ per month.
export const PLAN_PRICES = { Basic: 50, Premium: 150, Featured: 300 };

export const TRIAL_DAYS = 30;

// How many listings the owner's CURRENT trial/plan allows — trial runs on
// Basic-level access (1 listing), same as an explicit Basic subscription.
export function maxListingsForView(view) {
  if (view.status === "trial") return PLAN_FEATURES.Basic.maxListings;
  if (view.status === "active") return PLAN_FEATURES[view.plan]?.maxListings || 0;
  return 0; // no active trial/subscription — no new listings until they subscribe
}

// A hostel/apartment owner can list more than one property once they're on a
// higher plan — Basic: 1, Premium: 2, Featured: 3. Room count *within* a listing
// never affects this (a 100-room hostel is still one listing).
export const PLAN_FEATURES = {
  Basic: {
    maxListings: 1,
    maxPhotos: 3,
    videoTour: false,
    whatsappEnquiries: true,
    analytics: false,
    verifiedBadge: false,
    higherSearchRanking: false,
    topSearch: false,
    homepagePlacement: false,
    priorityEnquiries: false,
    featuredBadge: false,
    virtualWalkthrough: false,
    maxWalkthroughStops: 0,
    searchPriority: 0,
  },
  Premium: {
    maxListings: 2,
    maxPhotos: 10,
    videoTour: true,
    whatsappEnquiries: true,
    analytics: true,
    verifiedBadge: true,
    higherSearchRanking: true,
    topSearch: false,
    homepagePlacement: false,
    priorityEnquiries: false,
    featuredBadge: false,
    virtualWalkthrough: false,
    maxWalkthroughStops: 0,
    searchPriority: 1,
  },
  Featured: {
    maxListings: 3,
    maxPhotos: 20,
    videoTour: true,
    whatsappEnquiries: true,
    analytics: true,
    verifiedBadge: true,
    higherSearchRanking: true,
    topSearch: true,
    homepagePlacement: true,
    priorityEnquiries: true,
    featuredBadge: true,
    virtualWalkthrough: true,
    maxWalkthroughStops: 6,
    searchPriority: 2,
  },
};

// The trial gets Basic-level feature access (see spec §3) — never Premium/Featured.
export function featuresForPlan(plan) {
  return PLAN_FEATURES[plan] || PLAN_FEATURES.Basic;
}

export function daysBetween(fromMs, toMs) {
  return Math.max(0, Math.ceil((toMs - fromMs) / 86400000));
}

// Computes the *live*, authoritative subscription view for a user, deriving
// trial/subscription expiry from real timestamps (never a manually stored
// countdown). This is what every permission check in the backend calls —
// req.body / localStorage / query params are never trusted for plan or status.
export function computeSubscriptionView(user) {
  const sub = user.subscription || {};
  const now = Date.now();
  let status = sub.status || "none"; // none | trial | active | expired | cancelled | payment_failed
  const plan = sub.tier || null; // Basic | Premium | Featured | null

  if (status === "trial") {
    const endsAt = sub.trialEndsAt ? new Date(sub.trialEndsAt).getTime() : 0;
    if (!endsAt || now >= endsAt) status = "expired";
  } else if (status === "active") {
    const endsAt = sub.subscriptionEndsAt ? new Date(sub.subscriptionEndsAt).getTime() : null;
    if (endsAt && now >= endsAt) status = "expired";
  }

  // The plan whose *features* currently apply — Basic during trial, the paid
  // plan while active, or null once trial/subscription is no longer active.
  const effectivePlan = status === "trial" ? "Basic" : status === "active" ? plan : null;
  const isListingVisible = status === "trial" || status === "active";
  const features = featuresForPlan(effectivePlan || "Basic");

  let daysRemaining = null;
  if (status === "trial" && sub.trialEndsAt) {
    daysRemaining = daysBetween(now, new Date(sub.trialEndsAt).getTime());
  }

  // Was this expiry a trial expiry or a paid-subscription expiry? Trial records
  // never set `tier`, so a null plan at expiry means it was the free trial.
  const expiredFromTrial = status === "expired" && !plan;

  return {
    plan,
    status,
    effectivePlan,
    features,
    isListingVisible,
    expiredFromTrial,
    trialStartedAt: sub.trialStartedAt || null,
    trialEndsAt: sub.trialEndsAt || null,
    trialUsed: !!user.hasUsedFreeTrial,
    daysRemaining,
    subscriptionStartedAt: sub.subscriptionStartedAt || null,
    subscriptionEndsAt: sub.subscriptionEndsAt || null,
    nextBillingDate: status === "active" ? sub.subscriptionEndsAt || null : null,
    cancelledAt: sub.cancelledAt || null,
  };
}

// One-time trial reminder, tied to real date thresholds — never repeated once
// sent (dedup happens in store.js via subscription.remindersSent).
export function reminderForView(view) {
  if (view.status === "trial" && view.daysRemaining !== null) {
    const d = view.daysRemaining;
    if (d <= 1) return { key: "d1", message: "Your BookInn free trial ends tomorrow. Subscribe to prevent your listing from being paused." };
    if (d <= 3) return { key: "d3", message: "Your BookInn free trial ends in 3 days. Subscribe to keep your listing active." };
    if (d <= 7) return { key: "d7", message: "Your BookInn free trial ends in 7 days. Choose a plan to keep your hostel visible to students." };
    return null;
  }
  if (view.expiredFromTrial) {
    return { key: "expiry", message: "Your free trial has ended. Subscribe to reactivate your listing." };
  }
  return null;
}
