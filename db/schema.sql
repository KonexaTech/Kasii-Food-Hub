-- Marketplace foundation schema for a dedicated Neon PostgreSQL database.
-- Run ONLY against this application's own new database after review.
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE TABLE IF NOT EXISTS accounts (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 email text NOT NULL UNIQUE,
 password_hash text NOT NULL,
 role text NOT NULL CHECK (role IN ('customer','owner','admin')),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS businesses (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 owner_id uuid NOT NULL REFERENCES accounts(id),
 name text NOT NULL,
 area text NOT NULL,
 phone text,
 description text,
 approval_status text NOT NULL DEFAULT 'pending' CHECK (approval_status IN ('pending','approved','rejected','suspended')),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS products (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 business_id uuid NOT NULL REFERENCES businesses(id),
 name text NOT NULL,
 description text,
 image_url text,
 price_cents integer NOT NULL CHECK (price_cents >= 0),
 available boolean NOT NULL DEFAULT true
);
CREATE TABLE IF NOT EXISTS orders (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 customer_id uuid NOT NULL REFERENCES accounts(id),
 business_id uuid NOT NULL REFERENCES businesses(id),
 status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','preparing','ready','completed','rejected','cancelled')),
 collection_method text NOT NULL DEFAULT 'collection' CHECK (collection_method IN ('collection')),
 total_cents integer NOT NULL CHECK (total_cents >= 0),
 payment_status text NOT NULL DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid','pending','paid','refunded')),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS order_items (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 order_id uuid NOT NULL REFERENCES orders(id),
 product_id uuid NOT NULL REFERENCES products(id),
 quantity integer NOT NULL CHECK (quantity > 0),
 unit_price_cents integer NOT NULL CHECK (unit_price_cents >= 0)
);
CREATE TABLE IF NOT EXISTS commission_ledger (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 order_id uuid NOT NULL UNIQUE REFERENCES orders(id),
 amount_cents integer NOT NULL CHECK (amount_cents >= 0),
 status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','earned','void')),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_businesses_area_status ON businesses(area,approval_status);
CREATE INDEX IF NOT EXISTS idx_orders_business_created ON orders(business_id,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_customer_created ON orders(customer_id,created_at DESC);
-- IMPORTANT: API must enforce roles and derive prices from the database.
-- Never expose the Neon connection string to client-side code.
