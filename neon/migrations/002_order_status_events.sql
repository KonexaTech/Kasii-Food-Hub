-- Auditable history for future authenticated status transitions.
CREATE TABLE IF NOT EXISTS kfh_order_status_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES kfh_orders(id) ON DELETE RESTRICT,
  previous_status text,
  new_status text NOT NULL CHECK (new_status IN ('pending','accepted','preparing','ready_for_collection','out_for_delivery','completed','rejected','delayed')),
  actor_subject text NOT NULL,
  actor_role text NOT NULL CHECK (actor_role IN ('customer','owner','admin','system')),
  note text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS kfh_order_events_order_time_idx ON kfh_order_status_events(order_id,created_at);
