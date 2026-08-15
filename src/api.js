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

// Multipart upload — separate from request() because it sends FormData, not
// JSON. Used for listing photos/gallery/walkthrough images and video: the
// file goes straight to Cloudinary server-side and we get back a URL.
async function uploadFile(file, token) {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch(`${BASE}/uploads`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.error || `Upload failed (${res.status})`);
  return data; // { url, publicId }
}

export const api = {
  getListings: () => request("/listings"),
  uploadFile,
  addListing: (listing, token) => request("/listings", { method: "POST", body: listing, token }),
  updateListing: (id, listing, token) => request(`/listings/${id}`, { method: "PUT", body: listing, token }),
  deleteListing: (id, token) => request(`/listings/${id}`, { method: "DELETE", token }),
  addReview: (id, review) => request(`/listings/${id}/reviews`, { method: "POST", body: review }),
  recordView: (id) => request(`/listings/${id}/view`, { method: "POST" }).catch(() => {}),
  signup: (name, email, password, role) => request("/auth/signup", { method: "POST", body: { name, email, password, role } }),
  login: (email, password) => request("/auth/login", { method: "POST", body: { email, password } }),
  me: (token) => request("/auth/me", { token }),
  forgotPassword: (email) => request("/auth/forgot-password", { method: "POST", body: { email } }),
  resendVerification: (email) => request("/auth/resend-verification", { method: "POST", body: { email } }),
  resetPassword: (token, password) => request("/auth/reset-password", { method: "POST", body: { token, password } }),
  verifyEmail: (token) => request("/auth/verify-email", { method: "POST", body: { token } }),
  verifyPayment: (reference, tier, token) => request("/payments/verify", { method: "POST", body: { reference, tier }, token }),
  sendInquiry: (payload) => request("/inquiries", { method: "POST", body: payload }),
  getInquiries: (token) => request("/inquiries", { token }),
  verifyBookingPayment: (reference) =>
  request("/bookings/verify-payment", { method: "POST", body: { reference } }),
  getOwnerStats: (token) => request("/owner/stats", { token }),
  getMyListings: (token) => request("/listings/mine", { token }),
  getMySubscription: (token) => request("/subscription/me", { token }),
  startFreeTrial: (token) => request("/subscription/start-trial", { method: "POST", token }),
  cancelSubscription: (token) => request("/subscription/cancel", { method: "POST", token }),
  // Platform admin only (role === "Admin") — site-wide stats and user directory.
  getAdminUsers: (token) => request("/admin/users", { token }),
  impersonateUser: (id, token) => request(`/admin/users/${id}/impersonate`, { method: "POST", token }),
  getAdminStats: (token) => request("/admin/stats", { token }),
};
