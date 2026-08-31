// ---------------------------------------------------------
// OWNER FEATURE ACCESS — single source of truth
// ---------------------------------------------------------
// Paid subscription plans (Basic/Premium/Featured) and the booking-fee payment
// have been removed. Every property owner now gets full, permanent access to
// every feature that used to require the top ("Featured") plan — nothing here
// is trusted from the client, it's just no longer gated behind payment.

// The one feature set every owner now gets, for free, always.
export const FULL_FEATURES = {
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
  advancedAvailability: true,
};

// Kept for any code path that still asks "how many listings can this owner
// create" — always the full amount now.
export function maxListingsForView(view) {
  return FULL_FEATURES.maxListings;
}

export function featuresForPlan() {
  return FULL_FEATURES;
}

// Every owner account is always fully active — no plan, no trial, no expiry,
// nothing to subscribe to or cancel. Kept as a function (rather than a plain
// constant) so every existing call site keeps working unchanged.
export function computeSubscriptionView(user) {
  return {
    plan: null,
    status: "active",
    effectivePlan: null,
    features: FULL_FEATURES,
    isListingVisible: true,
    expiredFromTrial: false,
    trialStartedAt: null,
    trialEndsAt: null,
    trialUsed: true,
    daysRemaining: null,
    subscriptionStartedAt: user?.createdAt || null,
    subscriptionEndsAt: null,
    nextBillingDate: null,
    cancelledAt: null,
  };
}

// No more trial/expiry reminders — nothing left to remind anyone about.
export function reminderForView(view) {
  return null;
}
