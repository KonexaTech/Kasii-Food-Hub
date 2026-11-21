-- Admin authorization is stored in Neon, not in client-supplied claims.
-- Bootstrap the first admin only after its Neon Auth user ID is verified.
CREATE TABLE IF NOT EXISTS kfh_admins (
  subject text PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now()
);
