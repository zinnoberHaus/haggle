CREATE TABLE IF NOT EXISTS offers (
  id text PRIMARY KEY,
  source_guid text NOT NULL UNIQUE,
  title text NOT NULL,
  description text NOT NULL,
  image text,
  source_url text NOT NULL,
  source_name text NOT NULL,
  source_links jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(source_links) = 'array'),
  published_at timestamptz NOT NULL,
  fetched_at timestamptz NOT NULL,
  expires_at timestamptz,
  price_cents integer CHECK (price_cents > 0),
  original_price_cents integer CHECK (original_price_cents > 0),
  price_type text NOT NULL CHECK (price_type IN ('exact', 'from', 'unknown')),
  category text NOT NULL,
  source_category text NOT NULL,
  merchant text NOT NULL,
  shipping text,
  status text NOT NULL CHECK (status IN ('active', 'unavailable'))
);

CREATE INDEX IF NOT EXISTS offers_published_active_idx ON offers (published_at DESC, id) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS offers_fetched_idx ON offers (fetched_at DESC);

CREATE TABLE IF NOT EXISTS feed_ingestion_runs (
  id text PRIMARY KEY,
  source_url text NOT NULL,
  fetched_at timestamptz NOT NULL,
  item_count integer NOT NULL CHECK (item_count > 0)
);
CREATE INDEX IF NOT EXISTS feed_ingestion_runs_fetched_idx ON feed_ingestion_runs (fetched_at DESC);

CREATE TABLE IF NOT EXISTS price_observations (
  offer_id text NOT NULL REFERENCES offers(id) ON DELETE CASCADE,
  run_id text NOT NULL REFERENCES feed_ingestion_runs(id) ON DELETE CASCADE,
  price_cents integer NOT NULL CHECK (price_cents > 0),
  observed_at timestamptz NOT NULL,
  PRIMARY KEY (offer_id, run_id)
);
CREATE INDEX IF NOT EXISTS price_observations_offer_time_idx ON price_observations (offer_id, observed_at);
CREATE INDEX IF NOT EXISTS price_observations_run_idx ON price_observations (run_id);

CREATE TABLE IF NOT EXISTS target_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES neon_auth."user"(id) ON DELETE CASCADE,
  offer_id text NOT NULL REFERENCES offers(id) ON DELETE CASCADE,
  target_price_cents integer NOT NULL CHECK (target_price_cents > 0),
  observed_price_cents integer NOT NULL CHECK (observed_price_cents > 0),
  observed_at timestamptz NOT NULL,
  read_at timestamptz,
  UNIQUE (user_id, offer_id, target_price_cents)
);
CREATE INDEX IF NOT EXISTS target_alerts_user_time_idx ON target_alerts (user_id, observed_at DESC);
CREATE INDEX IF NOT EXISTS target_alerts_offer_idx ON target_alerts (offer_id);
