-- Apply ONLY to the NEW, DEDICATED Kasii Food Hub Neon development database. Never run on Kota Connect.
CREATE TABLE IF NOT EXISTS kfh_shops (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_subject text NOT NULL,
  name text NOT NULL,
  area text NOT NULL,
  address text,
  phone text,
  approved boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS kfh_menu_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES kfh_shops(id),
  name text NOT NULL,
  price_cents integer NOT NULL CHECK (price_cents > 0),
  available boolean NOT NULL DEFAULT true
);
CREATE TABLE IF NOT EXISTS kfh_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number text UNIQUE NOT NULL,
  shop_id uuid NOT NULL REFERENCES kfh_shops(id),
  customer_subject text NOT NULL,
  customer_name text NOT NULL,
  customer_phone text NOT NULL,
  area text NOT NULL,
  delivery_address text,
  fulfillment_type text NOT NULL CHECK (fulfillment_type IN ('pickup','delivery')),
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','accepted','preparing','ready_for_collection','out_for_delivery','completed','rejected','delayed')),
  subtotal_cents integer NOT NULL CHECK (subtotal_cents >= 0),
  delivery_cents integer NOT NULL DEFAULT 0 CHECK (delivery_cents >= 0),
  total_cents integer NOT NULL CHECK (total_cents >= 0),
  owner_note text NOT NULL DEFAULT '',
  delay_minutes integer NOT NULL DEFAULT 0,
  test_order boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS kfh_order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES kfh_orders(id),
  menu_item_id uuid NOT NULL REFERENCES kfh_menu_items(id),
  item_name text NOT NULL,
  unit_price_cents integer NOT NULL CHECK (unit_price_cents > 0),
  quantity integer NOT NULL CHECK (quantity BETWEEN 1 AND 50)
);
CREATE INDEX IF NOT EXISTS kfh_orders_shop_created_idx ON kfh_orders(shop_id,created_at DESC);
CREATE INDEX IF NOT EXISTS kfh_orders_customer_created_idx ON kfh_orders(customer_subject,created_at DESC);
