-- Commission ledger: one R0.50 charge per completed non-test order.
-- Run on Neon development branch only until migration is verified.
CREATE TABLE IF NOT EXISTS kfh_commission_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL UNIQUE REFERENCES kfh_orders(id) ON DELETE RESTRICT,
  shop_id uuid NOT NULL REFERENCES kfh_shops(id),
  amount_cents integer NOT NULL DEFAULT 50 CHECK (amount_cents = 50),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS kfh_commission_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES kfh_shops(id),
  amount_cents integer NOT NULL CHECK (amount_cents > 0),
  recorded_by_subject text NOT NULL,
  payment_reference text,
  paid_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS kfh_commission_entries_shop_idx ON kfh_commission_entries(shop_id);
CREATE INDEX IF NOT EXISTS kfh_commission_payments_shop_idx ON kfh_commission_payments(shop_id);
-- Only a trusted, authenticated backend should insert entries after a validated
-- order status transition to completed; never accept commission amounts from clients.
-- The backend must use ON CONFLICT (order_id) DO NOTHING for retry safety.
-- Never infer payments from completed orders: record them explicitly.
