CREATE TABLE ai_usage (
 user_id uuid NOT NULL REFERENCES neon_auth."user"(id) ON DELETE CASCADE,
 day date NOT NULL,
 requests integer NOT NULL DEFAULT 0,
 PRIMARY KEY(user_id,day)
);
CREATE TABLE cart_plans (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id uuid NOT NULL REFERENCES neon_auth."user"(id) ON DELETE CASCADE,
 items jsonb NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX cart_plans_user_date ON cart_plans(user_id,created_at DESC);
