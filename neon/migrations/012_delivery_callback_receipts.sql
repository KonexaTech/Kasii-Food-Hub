-- PROPOSED ONLY. Server-role grants require review; no customer policies or financial writes.
CREATE TABLE IF NOT EXISTS public.kfh_delivery_state (
 order_id uuid PRIMARY KEY REFERENCES public.kfh_orders(id) ON DELETE RESTRICT,
 job_id uuid NOT NULL, sequence bigint NOT NULL CHECK(sequence>0),
 status text NOT NULL CHECK(status IN ('searching','assigned','ready','collected','enroute','delivered','cancelled','failed')),
 occurred_at timestamptz NOT NULL
);
CREATE TABLE IF NOT EXISTS public.kfh_delivery_events (
 event_id uuid PRIMARY KEY, order_id uuid NOT NULL REFERENCES public.kfh_orders(id) ON DELETE RESTRICT,
 job_id uuid NOT NULL, sequence bigint NOT NULL CHECK(sequence>0),
 status text NOT NULL CHECK(status IN ('searching','assigned','ready','collected','enroute','delivered','cancelled','failed')),
 occurred_at timestamptz NOT NULL, received_at timestamptz NOT NULL DEFAULT now(),
 payload_hash text NOT NULL CHECK(payload_hash ~ '^[0-9a-f]{64}$')
);
ALTER TABLE public.kfh_delivery_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kfh_delivery_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.kfh_delivery_state,public.kfh_delivery_events FROM PUBLIC;
