-- PROPOSAL ONLY — DO NOT EXECUTE WITHOUT OWNER APPROVAL.
-- Restricted to this app's isolated Neon staging branch, after snapshot,
-- schema/role inventory, business quote policy, transaction and rollback review.
-- No monetary amounts, automatic driver payouts or distance fees defined here.
BEGIN;
CREATE TABLE kfh_delivery_quotes (
  order_id uuid PRIMARY KEY REFERENCES kfh_orders(id) ON DELETE RESTRICT,
  pickup_lat double precision NOT NULL CHECK (pickup_lat BETWEEN -90 AND 90),
  pickup_lon double precision NOT NULL CHECK (pickup_lon BETWEEN -180 AND 180),
  dropoff_lat double precision NOT NULL CHECK (dropoff_lat BETWEEN -90 AND 90),
  dropoff_lon double precision NOT NULL CHECK (dropoff_lon BETWEEN -180 AND 180),
  route_distance_m integer NOT NULL CHECK (route_distance_m > 0),
  weight_grams integer NOT NULL CHECK (weight_grams > 0),
  currency text NOT NULL DEFAULT 'ZAR' CHECK (currency = 'ZAR'),
  fee_cents integer NOT NULL CHECK (fee_cents >= 0),
  payout_cents integer NOT NULL CHECK (payout_cents >= 0 AND payout_cents <= fee_cents),
  payment_verified boolean NOT NULL DEFAULT false,
  cash_on_delivery_approved boolean NOT NULL DEFAULT false,
  dispatch_ready boolean NOT NULL DEFAULT false,
  not_before timestamptz,
  approved_at timestamptz NOT NULL,
  approved_by text NOT NULL CHECK (length(trim(approved_by)) > 0),
  CHECK (payment_verified OR cash_on_delivery_approved)
);
-- An order's approved dispatch quote is immutable. Changes require a separately
-- reviewed cancellation/re-quote flow, never silent repricing of an active job.
CREATE FUNCTION kfh_reject_delivery_quote_change()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Approved delivery quotes are immutable';
END $$;
CREATE TRIGGER kfh_delivery_quote_immutable
BEFORE UPDATE OR DELETE ON kfh_delivery_quotes
FOR EACH ROW EXECUTE FUNCTION kfh_reject_delivery_quote_change();
ALTER TABLE kfh_delivery_quotes ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON kfh_delivery_quotes FROM PUBLIC;
COMMIT;

-- Review separately before use:
-- 1. Verify schema, app roles, RLS policies and least-privileged Worker access.
-- 2. Approve sourced quote amounts and payment/COD evidence, not placeholders.
-- 3. Only authorized server-side operations can insert approved dispatch quotes.
-- 4. No generic client SELECT/INSERT/UPDATE/DELETE grant.
-- 5. Bind approval to the actual order/merchant readiness and geocoded address.
-- 6. Retain audit evidence; do not drop nonempty tables on rollback.
-- Rollback while preserving data: unset DELIVERY_SOURCE_LOOKUP_ENABLED.
