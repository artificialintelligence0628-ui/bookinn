-- BookInn database schema.
-- Applied automatically on server startup (see db.js migrate()) — every
-- statement is idempotent, so this is safe to run every time the app boots.

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'Student',
  subscription JSONB NOT NULL DEFAULT '{
    "tier": null, "status": "none",
    "trialStartedAt": null, "trialEndsAt": null,
    "subscriptionStartedAt": null, "subscriptionEndsAt": null,
    "cancelledAt": null, "remindersSent": {}
  }',
  has_used_free_trial BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS listings (
  id SERIAL PRIMARY KEY,
  owner_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  room_options JSONB NOT NULL DEFAULT '[]',
  room_type TEXT,
  price NUMERIC NOT NULL DEFAULT 0,
  bath TEXT DEFAULT 'Shared bath',
  kitchen BOOLEAN NOT NULL DEFAULT false,
  university TEXT,
  distance TEXT,
  pricing_period TEXT DEFAULT 'Per semester',
  rating NUMERIC NOT NULL DEFAULT 0,
  review_count INTEGER NOT NULL DEFAULT 0,
  featured BOOLEAN NOT NULL DEFAULT false,
  image TEXT,
  images JSONB NOT NULL DEFAULT '[]',
  video TEXT NOT NULL DEFAULT '',
  walkthrough JSONB NOT NULL DEFAULT '[]',
  amenities JSONB NOT NULL DEFAULT '[]',
 "desc" TEXT NOT NULL DEFAULT '',
  location_description TEXT NOT NULL DEFAULT '',
  owner_email TEXT NOT NULL DEFAULT '',
  owner_whatsapp TEXT NOT NULL DEFAULT '',
  availability TEXT NOT NULL DEFAULT 'Space available',
  reviews JSONB NOT NULL DEFAULT '[]',
  views JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS inquiries (
  id SERIAL PRIMARY KEY,
  listing_id INTEGER NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  move_in TEXT,
  message TEXT,
  room_type TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_listings_owner_id ON listings(owner_id);
CREATE INDEX IF NOT EXISTS idx_inquiries_listing_id ON inquiries(listing_id);

-- Added after launch — lets an owner/admin manually mark a student as an
-- actual confirmed resident (not just someone who paid the booking fee),
-- since move-in itself happens off-platform and can't be verified automatically.
ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS confirmed_resident BOOLEAN NOT NULL DEFAULT false;

-- Auth columns used by store.js (password reset / email verification). Kept
-- here as idempotent ALTERs — like everything else in this file — so an
-- already-initialized database is untouched and a fresh one ends up with the
-- same shape.
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token_expires TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS verify_token TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS verify_token_expires TIMESTAMPTZ;

-- ---------------------------------------------------------
-- Email & Communication Center
-- ---------------------------------------------------------
-- Lets a user opt out of optional/marketing announcements sent from the
-- admin Email Center while still receiving essential transactional email
-- (verification, password reset, booking confirmation, etc), which never
-- checks this flag.
ALTER TABLE users ADD COLUMN IF NOT EXISTS marketing_emails BOOLEAN NOT NULL DEFAULT true;

-- ---------------------------------------------------------
-- University scoping for students
-- ---------------------------------------------------------
-- A student's own campus, picked at signup, so their browse view can be
-- scoped to hostels/apartments at their university only.
ALTER TABLE users ADD COLUMN IF NOT EXISTS university TEXT;

-- The list of universities BookInn operates in. Editable from the platform
-- admin dashboard (Universities tab) instead of being hardcoded, so adding a
-- new campus doesn't require a code change/deploy.
CREATE TABLE IF NOT EXISTS universities (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS email_templates (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  subject TEXT NOT NULL DEFAULT '',
  content TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT 'General',
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS email_campaigns (
  id SERIAL PRIMARY KEY,
  subject TEXT NOT NULL DEFAULT '',
  content TEXT NOT NULL DEFAULT '',
  audience_type TEXT NOT NULL DEFAULT 'all',
  selected_user_ids JSONB NOT NULL DEFAULT '[]',
  template_id INTEGER REFERENCES email_templates(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  recipient_count INTEGER NOT NULL DEFAULT 0,
  sent_count INTEGER NOT NULL DEFAULT 0,
  delivered_count INTEGER NOT NULL DEFAULT 0,
  failed_count INTEGER NOT NULL DEFAULT 0,
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_by_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  scheduled_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  -- Client-generated once per compose session so a double-click or a
  -- refresh-resubmit of the same send request can't create two campaigns.
  idempotency_key TEXT UNIQUE,
  error TEXT
);

CREATE TABLE IF NOT EXISTS email_recipients (
  id SERIAL PRIMARY KEY,
  campaign_id INTEGER NOT NULL REFERENCES email_campaigns(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  name TEXT,
  email TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued',
  provider_message_id TEXT,
  error TEXT,
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_email_recipients_campaign_id ON email_recipients(campaign_id);
CREATE INDEX IF NOT EXISTS idx_email_recipients_message_id ON email_recipients(provider_message_id);
CREATE INDEX IF NOT EXISTS idx_email_campaigns_status ON email_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_email_campaigns_created_at ON email_campaigns(created_at);

-- ---------------------------------------------------------
-- Official BookInn Agents
-- ---------------------------------------------------------
-- Set only by a platform admin (Agents tab). Official agents get an
-- "Official BookInn Agent" label on their listings; ordinary agents are
-- unaffected and keep the plain "Agent listing" badge.
ALTER TABLE users ADD COLUMN IF NOT EXISTS official_agent BOOLEAN NOT NULL DEFAULT false;

-- ---------------------------------------------------------
-- Public halls & hostels (university-owned), managed by platform admin
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS public_halls (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  university TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'Hall',
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS public_halls_uni_name_idx ON public_halls (lower(university), lower(name));

-- ---------------------------------------------------------
-- Public hostels (admin-managed listings)
-- ---------------------------------------------------------
-- Listings created by a platform admin for university/public hostels and halls.
-- They behave like normal listings but show a "Public Hostel" tag, are always
-- visible (no owner subscription needed), and can only be managed by an admin.
ALTER TABLE listings ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT false;

-- Which kind of public listing this is: 'Hostel' or 'Hall' (only set when is_public).
ALTER TABLE listings ADD COLUMN IF NOT EXISTS public_kind TEXT;

-- ---------------------------------------------------------
-- Admin-initiated password changes
-- ---------------------------------------------------------
-- Set when a platform admin changes someone's password. Login tokens issued
-- before this moment are rejected, so a changed password signs out any session
-- that was already open on the old one.
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMPTZ;

-- ---------------------------------------------------------
-- Roommate groups
-- ---------------------------------------------------------
-- Lets friends request beds in the same multi-occupancy room together. One
-- student starts a group (getting a short share code), friends join with that
-- code, and every member's inquiry carries the group_id so the owner sees them
-- as one party. capacity is the room's occupancy (Two in a room = 2, etc).
CREATE TABLE IF NOT EXISTS booking_groups (
  id SERIAL PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  listing_id INTEGER NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  room_type TEXT NOT NULL,
  capacity INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS group_id INTEGER REFERENCES booking_groups(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_inquiries_group_id ON inquiries(group_id);

-- Secret held only by the student who started the group (kept in their browser).
-- It lets that student, and only that student, fetch the member list to send one
-- combined booking request to the owner.
ALTER TABLE booking_groups ADD COLUMN IF NOT EXISTS leader_token TEXT;

-- How many times the leader has sent the combined request to the owner. Lets the
-- owner see "UPDATED request #2" when more friends join after the first send.
ALTER TABLE booking_groups ADD COLUMN IF NOT EXISTS sent_count INTEGER NOT NULL DEFAULT 0;

-- When the person agreed to the Terms & Conditions / Privacy Policy at sign-up.
-- NULL for accounts created before the consent checkbox existed.
ALTER TABLE users ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMPTZ;

-- Exact map position of a listing (set by the owner/admin by pinning the
-- building on a map). NULL until pinned; the student map falls back to an
-- approximate spot near the campus for listings without one.
ALTER TABLE listings ADD COLUMN IF NOT EXISTS lat DOUBLE PRECISION;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS lng DOUBLE PRECISION;

-- Owner/agent can choose to show "Contact for price" instead of the price to students.
-- The real price is still stored (the system needs one); it is stripped from public API output.
ALTER TABLE listings ADD COLUMN IF NOT EXISTS hide_price BOOLEAN NOT NULL DEFAULT false;
