# Kasii Food Hub independent Neon API

This Worker uses the Kota Connect API architecture but SQL table prefix `kfh_`, not Kota Connect's tables. The Worker is **disabled by default** with `NEON_ONLY_MODE=false` in `wrangler.jsonc`.

Before enabling, provision a **separate** Neon PostgreSQL project, dedicated Neon Auth tenant, independent Cloudflare Worker, secret `DATABASE_URL`, `EXPECTED_NEON_HOST` exact allowlisted hostname, `NEON_AUTH_BASE_URL`, and the frontend `app-config.js` public API/Auth URLs. Verify the JWT issuer/audience and admin role are from this app's own database. Never reuse Kota Connect's secrets or API endpoint. Never commit secrets. Review and apply `../neon/migrations/` only to the isolated project, then run authenticated negative tests, cross-app denial tests and end-to-end checks.

No backend is deployed or activated by this branch.
