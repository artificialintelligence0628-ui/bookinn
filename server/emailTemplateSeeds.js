// Starter templates for the Email Center — seeded once (only if the
// email_templates table is empty) so the admin isn't starting from a blank
// list. All fully editable/deletable afterward; this is just a helpful
// starting point, not a fixed set.
export const DEFAULT_EMAIL_TEMPLATES = [
  {
    name: "Welcome Student",
    category: "Welcome",
    subject: "Welcome to BookInn, {{name}}!",
    content: `<p>Hello {{name}},</p><p>Welcome to BookInn! You can now search verified hostels and apartments near your campus, compare prices, and message property owners directly.</p><p>Ready to find your next place?</p>`,
  },
  {
    name: "Welcome Parent",
    category: "Welcome",
    subject: "Welcome to BookInn, {{name}}",
    content: `<p>Hello {{name}},</p><p>Welcome to BookInn. You can use your account to help your ward find safe, verified student accommodation and keep track of their booking details.</p>`,
  },
  {
    name: "Welcome Owner",
    category: "Welcome",
    subject: "Welcome to BookInn — start listing your property",
    content: `<p>Hello {{name}},</p><p>Welcome to BookInn! Your owner account is ready. List your hostel or apartment to start reaching students actively searching near your property.</p>`,
  },
  {
    name: "New Hostel Announcement",
    category: "Announcement",
    subject: "New hostels just added on BookInn",
    content: `<p>Hello {{name}},</p><p>New hostels and apartments were just listed on BookInn — take a look before the best rooms are booked.</p>`,
  },
  {
    name: "Booking Confirmation",
    category: "Transactional",
    subject: "Your BookInn booking is confirmed",
    content: `<p>Hello {{name}},</p><p>Your booking has been confirmed. We'll be in touch with next steps for your move-in.</p>`,
  },
  {
    name: "Booking Cancellation",
    category: "Transactional",
    subject: "Your BookInn booking was cancelled",
    content: `<p>Hello {{name}},</p><p>Your booking has been cancelled. If this wasn't expected, please get in touch with us.</p>`,
  },
  {
    name: "Owner Listing Reminder",
    category: "Reminder",
    subject: "Keep your BookInn listing up to date",
    content: `<p>Hello {{name}},</p><p>Just a reminder to keep your listing's availability and photos up to date so students see accurate information.</p>`,
  },
  {
    name: "Platform Announcement",
    category: "Announcement",
    subject: "An update from BookInn",
    content: `<p>Hello {{name}},</p><p>We wanted to share an update about the BookInn platform.</p>`,
  },
  {
    name: "Password Reset",
    category: "Transactional",
    subject: "Reset your BookInn password",
    content: `<p>Hello {{name}},</p><p>Use the link we sent to reset your password. If you didn't request this, you can ignore this message.</p>`,
  },
];

export async function seedEmailTemplates(store) {
  const existing = await store.getEmailTemplates();
  if (existing.length) return;
  for (const t of DEFAULT_EMAIL_TEMPLATES) {
    await store.createEmailTemplate({ ...t, createdBy: null });
  }
}
