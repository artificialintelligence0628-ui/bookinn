const BASE = "/api";

async function request(path, { method = "GET", body, token } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  let data = null;
  try {
    data = await res.json();
  } catch {
    // no JSON body (e.g. 204 No Content)
  }

  if (!res.ok) {
    const message = data?.error || `Request failed (${res.status})`;
    throw new Error(message);
  }
  return data;
}

export const api = {
  getListings: () => request("/listings"),
  addListing: (listing, token) => request("/listings", { method: "POST", body: listing, token }),
  updateListing: (id, listing, token) => request(`/listings/${id}`, { method: "PUT", body: listing, token }),
  deleteListing: (id, token) => request(`/listings/${id}`, { method: "DELETE", token }),
  addReview: (id, review) => request(`/listings/${id}/reviews`, { method: "POST", body: review }),
  recordView: (id) => request(`/listings/${id}/view`, { method: "POST" }).catch(() => {}),

  signup: (name, email, password, role) => request("/auth/signup", { method: "POST", body: { name, email, password, role } }),
  login: (email, password) => request("/auth/login", { method: "POST", body: { email, password } }),
  me: (token) => request("/auth/me", { token }),
  verifyPayment: (reference, tier, token) => request("/payments/verify", { method: "POST", body: { reference, tier }, token }),

  sendInquiry: (payload) => request("/inquiries", { method: "POST", body: payload }),
  getInquiries: (token) => request("/inquiries", { token }),
  getOwnerStats: (token) => request("/owner/stats", { token }),

  getMyListings: (token) => request("/listings/mine", { token }),
  getMySubscription: (token) => request("/subscription/me", { token }),
  startFreeTrial: (token) => request("/subscription/start-trial", { method: "POST", token }),
  cancelSubscription: (token) => request("/subscription/cancel", { method: "POST", token }),

  // Platform admin only (role === "Admin") — site-wide stats and user directory.
  getAdminUsers: (token) => request("/admin/users", { token }),
  getAdminStats: (token) => request("/admin/stats", { token }),
};
