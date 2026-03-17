-- Run this SQL in the Supabase SQL Editor to set up the database schema.

CREATE TABLE IF NOT EXISTS payments (
  id            TEXT PRIMARY KEY,
  customer_name TEXT NOT NULL,
  customer_email TEXT,
  items_json    TEXT NOT NULL,
  total         REAL NOT NULL,
  created_at    TEXT NOT NULL,
  status        TEXT NOT NULL,
  order_id      TEXT,
  order_date    TEXT,
  approved_at   TEXT,
  inserted_at   TIMESTAMPTZ DEFAULT now()
);

-- Index for fast status-based queries (used by the admin panel)
CREATE INDEX IF NOT EXISTS payments_status_idx ON payments (status, inserted_at DESC);

-- Disable Row Level Security since all access goes through
-- Vercel serverless functions using the service role key.
ALTER TABLE payments DISABLE ROW LEVEL SECURITY;
