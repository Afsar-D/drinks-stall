-- Run this SQL in the Supabase SQL Editor.
-- This migration is non-destructive and preserves existing payment data.

CREATE TABLE IF NOT EXISTS payments (
  id             TEXT PRIMARY KEY,
  customer_name  TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  items_json     TEXT NOT NULL,
  total          REAL NOT NULL,
  created_at     TEXT NOT NULL,
  status         TEXT NOT NULL,
  order_id       TEXT,
  order_date     TEXT,
  approved_at    TEXT,
  inserted_at    TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE payments ADD COLUMN IF NOT EXISTS customer_name TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS customer_email TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS items_json TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS total REAL;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS created_at TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS status TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS order_id TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS order_date TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS approved_at TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS inserted_at TIMESTAMPTZ DEFAULT now();

-- Index for fast status-based queries (used by the admin panel)
CREATE INDEX IF NOT EXISTS payments_status_idx ON payments (status, inserted_at DESC);

-- Enforce required columns only if existing data already satisfies the constraint.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM payments
    WHERE customer_name IS NULL OR btrim(customer_name) = ''
  ) THEN
    ALTER TABLE payments ALTER COLUMN customer_name SET NOT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM payments
    WHERE customer_email IS NULL OR btrim(customer_email) = ''
  ) THEN
    ALTER TABLE payments ALTER COLUMN customer_email SET NOT NULL;
  END IF;
END $$;

-- Disable Row Level Security since all access goes through
-- Vercel serverless functions using the service role key.
ALTER TABLE payments DISABLE ROW LEVEL SECURITY;
