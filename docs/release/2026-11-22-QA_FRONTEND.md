# Kasii Food Hub: source-bound isolated QA frontend

Status: prepared and regression-tested; **live acceptance BLOCKED**. Production index.html and app-config.js remain unchanged. No database migration, production deployment or payment activation occurred.

## Confirmed gap repaired

Previously no separate frontend build connected the existing customer/owner/admin Neon pages to this application's QA services. The new `npm run build:qa` creates only `dist-qa`, using fixed public QA endpoints matching the existing Worker configuration. The branded customer page becomes the QA landing page. This does not replace the approved photographic demonstration or copy Kota's credentials/rates/data.

The generated Cloudflare Pages advanced Worker reuses Kota's same-origin Auth/cookie transport pattern. Neon session cookies retain Secure/HttpOnly, move to the own QA origin, and are never forwarded to the application API. API calls retain only their signed JWT authorization. Cross-origin and cross-site Auth mutations are rejected. No browser database connection string, password or service token is introduced.

`/qa-health` requires an actually successful Neon database health response, Auth configuration and an exact API source commit match. A missing/stale/unavailable backend blocks forms before authentication or ordering calls. The QA deployment workflow stamps the validated public source SHA; generated QA artifacts record all file hashes and explicitly state live/device acceptance NOT_TESTED. The builder rejects dirty worktrees, so published artifact source metadata cannot silently refer to older code.

## Verification

Five focused transport/build tests passed, including cookie/JWT separation, foreign-origin denial, stale health failure, validated source marker and unchanged production config. Two real Chromium UI guard tests passed with unavailable/stale HTTP health responses; no protected request is made and order controls remain disabled. Four existing mobile-viewport demo journeys passed separately. Those fixtures are not live Neon ordering evidence. Full root/Worker checks and ordinary web production build passed. QA CI uploads a separate source-bound artifact after successful checks, without publishing it.

Initial Cake browser run could not find the downloaded Chromium binary. The same optional installed-browser override already used by Kasii was added; it changes no production behavior. The reviewed rerun used /usr/bin/chromium.

## External blocker verified again

Both existing isolated API workflows were re-run on their then-current repair heads: Kasii45047023914 and Cake45047027445. Both stopped before deployment with Cloudflare token MISSING and Neon database URL present. No secret values were read or printed. Configure this repo's own `CLOUDFLARE_API_TOKEN` privately; do not request/copy the already-present database URL or share app database credentials.

After successful final-source API deployment, the source-bound frontend artifact can be reviewed for deployment to the existing configured staging Pages project. Confirm that project exists before publishing; do not create a duplicate. The Auth provider must authorize the configured staging origin. Actual authenticated customer/merchant/admin lifecycle, persistent records after reload, negative access, notification policies, commission rules and physical Android/PWA behavior still require acceptance. No online payment is enabled.

## Commands and rollback

From a clean committed checkout:

```sh
npm ci
npm --prefix worker ci
npm run check
npm run check --prefix worker
npm run build
npm run build:qa
CHROMIUM_PATH=/usr/bin/chromium npm run test:e2e -- --workers=1
```

Inspect dist-qa/qa-build.json. Do not serve a stale or manually edited manifest. Existing QA API workflow may be manually dispatched on the reviewed repair branch; its credentials gate must remain active. Do not deploy the generated advanced Worker to production.

Rollback is source/deployment rollback to the previous reviewed QA artifact and Worker version. No persisted rows/schema are changed by this frontend bridge. Current source changes are independently reviewable in the existing repair PR.
