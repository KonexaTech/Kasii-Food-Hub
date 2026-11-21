-- Staging-only migration. Review existing schema and apply manually after backup.
-- Contains only new tables; no existing order or shop records are modified.
CREATE TABLE IF NOT EXISTS kfh_push_tokens (
  token text PRIMARY KEY,
  owner_subject text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS kfh_push_tokens_owner_idx ON kfh_push_tokens(owner_subject);
CREATE TABLE IF NOT EXISTS kfh_push_dispatch (
  order_id text PRIMARY KEY,
  owner_subject text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS kfh_push_dispatch_owner_idx ON kfh_push_dispatch(owner_subject);
REVOKE ALL ON kfh_push_tokens, kfh_push_dispatch FROM PUBLIC;
