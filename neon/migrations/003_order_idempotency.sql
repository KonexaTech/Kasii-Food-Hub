-- Apply to a disposable Neon development branch first. Do not run on production until verified.
ALTER TABLE public.kfh_orders
  ADD COLUMN IF NOT EXISTS client_request_id uuid;
CREATE UNIQUE INDEX IF NOT EXISTS kfh_orders_customer_request_unique
  ON public.kfh_orders (customer_subject, client_request_id)
  WHERE client_request_id IS NOT NULL;
-- This prevents two successful checkouts for the same customer and client request UUID.
