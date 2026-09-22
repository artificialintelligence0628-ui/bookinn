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

// Agents (real-estate/letting agents who list on behalf of multiple
// landlords) get everything an Owner gets, except their listing count is
// never capped — an agent may be managing dozens of properties at once.
export const AGENT_FEATURES = {
  ...FULL_FEATURES,
  maxListings: Infinity,
};

// Single source of truth for "which feature set does this account get" —
// keyed off role so every other function here just asks for a role's
// features instead of re-deriving them.
export function featuresForRole(role) {
  return role === "Agent" ? AGENT_FEATURES : FULL_FEATURES;
}

// Kept for any code path that still asks "how many listings can this owner
// create" — reads it off the view's own features so it stays correct for
// whichever role computed that view (Owner: capped, Agent: unlimited).
export function maxListingsForView(view) {
  return view?.features?.maxListings ?? FULL_FEATURES.maxListings;
}

export function featuresForPlan() {
  return FULL_FEATURES;
}

// Every owner/agent account is always fully active — no plan, no trial, no
// expiry, nothing to subscribe to or cancel. Kept as a function (rather than
// a plain constant) so every existing call site keeps working unchanged.
export function computeSubscriptionView(user) {
  const features = featuresForRole(user?.role);
  return {
    plan: null,
    status: "active",
    effectivePlan: null,
    features,
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
