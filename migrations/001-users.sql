CREATE TABLE profiles (
  user_id uuid PRIMARY KEY REFERENCES neon_auth."user"(id) ON DELETE CASCADE,
  email_alerts boolean NOT NULL DEFAULT false,
  weekly_digest boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE saved_deals (
  user_id uuid NOT NULL REFERENCES neon_auth."user"(id) ON DELETE CASCADE,
  offer_id text NOT NULL,
  target_price_cents integer CHECK (target_price_cents IS NULL OR target_price_cents BETWEEN 1 AND 100000000),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, offer_id)
);

-- Only verified completed tasks may be written by future server-side settlement code.
-- No sample savings and no client-write endpoint.
CREATE TABLE savings_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES neon_auth."user"(id) ON DELETE CASCADE,
  description text NOT NULL,
  saved_cents integer NOT NULL CHECK (saved_cents > 0),
  fee_cents integer NOT NULL DEFAULT 0 CHECK (fee_cents >= 0 AND fee_cents <= saved_cents),
  recorded_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX savings_ledger_user_date ON savings_ledger(user_id, recorded_at DESC);
