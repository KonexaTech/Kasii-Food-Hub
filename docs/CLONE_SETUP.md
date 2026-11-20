# Kasii Food Hub cloned foundation: setup gates

* Uses Kota Connect Neon ordering UI/API architecture, but is a different application and database.
* Own repository, feature branch `feature/reuse-kota-ordering-foundation-20261120`, DB table prefix `kfh_`.
* Backend is disabled by default and browser public endpoints are unset. No secrets copied.
* Provision separate Neon project, Neon Auth and Cloudflare Worker. Apply reviewed SQL scripts in `neon/migrations/` only on that database. The old `db/schema.sql` is retired.
* Configure Worker `DATABASE_URL` secret, exact `EXPECTED_NEON_HOST`, dedicated `NEON_AUTH_BASE_URL` and origin allowlist. Verify identity and admin assignment are only for this new app.
* Only after verification, set `NEON_ONLY_MODE=true` and the frontend `authUrl`/`apiUrl` in `app-config.js`.
* Tests: `npm run check`, `npm run build`, database migration isolation, admin/owner authorization denial and real order/Android tests.
* No-account checkout, payments, photos, custom cake requests, native push and Android signing require additional work and tests.
* Do not merge/deploy until code checks and isolated environment acceptance pass.
