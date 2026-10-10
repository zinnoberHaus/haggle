CREATE TABLE cost_comparisons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES neon_auth."user"(id) ON DELETE CASCADE,
  input jsonb NOT NULL CHECK (jsonb_typeof(input) = 'object'),
  result jsonb NOT NULL CHECK (jsonb_typeof(result) = 'object'),
  source_snapshot jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX cost_comparisons_owner_updated ON cost_comparisons(user_id, updated_at DESC);
