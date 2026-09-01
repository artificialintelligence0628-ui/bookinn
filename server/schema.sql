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
