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
