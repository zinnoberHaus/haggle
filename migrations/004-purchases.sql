-- User-reported purchases remain separate from the verified savings ledger.
-- The composite key also prevents attaching another account's cart plan.
CREATE UNIQUE INDEX cart_plans_id_user_idx ON cart_plans(id, user_id);

CREATE TABLE purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES neon_auth."user"(id) ON DELETE CASCADE,
  cart_plan_id uuid,
  offer_id text REFERENCES offers(id) ON DELETE SET NULL,
  product_name text NOT NULL CHECK (length(btrim(product_name)) BETWEEN 2 AND 150),
  merchant text NOT NULL CHECK (length(btrim(merchant)) BETWEEN 1 AND 100),
  purchased_on date NOT NULL CHECK (purchased_on >= DATE '1900-01-01'),
  paid_total_cents integer NOT NULL CHECK (paid_total_cents BETWEEN 1 AND 100000000),
  baseline_total_cents integer CHECK (baseline_total_cents BETWEEN 0 AND 100000000),
  reported_savings_cents integer GENERATED ALWAYS AS
    (GREATEST(COALESCE(baseline_total_cents, paid_total_cents) - paid_total_cents, 0)) STORED,
  fee_cents integer NOT NULL DEFAULT 0 CHECK (fee_cents = 0),
  policy_url text CHECK (policy_url IS NULL OR (length(policy_url) <= 2000 AND policy_url ~ '^https://')),
  adjustment_deadline date CHECK (adjustment_deadline IS NULL OR adjustment_deadline >= purchased_on),
  adjustment_status text NOT NULL DEFAULT 'draft' CHECK (adjustment_status IN ('draft', 'submitted', 'received', 'rejected')),
  refund_cents integer NOT NULL DEFAULT 0 CHECK (refund_cents BETWEEN 0 AND paid_total_cents),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (cart_plan_id, user_id) REFERENCES cart_plans(id, user_id) ON DELETE SET NULL (cart_plan_id),
  CHECK ((adjustment_status = 'received' AND refund_cents > 0) OR (adjustment_status <> 'received' AND refund_cents = 0))
);
CREATE INDEX purchases_user_date_idx ON purchases(user_id, purchased_on DESC, created_at DESC);
CREATE INDEX purchases_offer_idx ON purchases(offer_id) WHERE offer_id IS NOT NULL;
