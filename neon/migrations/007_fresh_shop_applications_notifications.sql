-- Neon-only fresh launch: new real-shop applications and in-app notification records.
CREATE TABLE IF NOT EXISTS kfh_shop_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  applicant_subject text NOT NULL,
  owner_name text NOT NULL CHECK (length(trim(owner_name)) BETWEEN 2 AND 120),
  shop_name text NOT NULL CHECK (length(trim(shop_name)) BETWEEN 2 AND 160),
  phone text NOT NULL,
  area text NOT NULL,
  address text NOT NULL,
  description text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  reviewed_by_subject text,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS kfh_shop_applications_status_created_idx ON kfh_shop_applications(status,created_at DESC);
CREATE INDEX IF NOT EXISTS kfh_shop_applications_applicant_idx ON kfh_shop_applications(applicant_subject,created_at DESC);
CREATE TABLE IF NOT EXISTS kfh_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_subject text NOT NULL,
  order_id uuid REFERENCES kfh_orders(id) ON DELETE RESTRICT,
  kind text NOT NULL CHECK (kind IN ('new_order','order_status','application_status')),
  title text NOT NULL,
  body text NOT NULL DEFAULT '',
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS kfh_notifications_recipient_idx ON kfh_notifications(recipient_subject,created_at DESC);
