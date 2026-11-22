# Kasii Food Hub release engineering — 22 November 2026

**Decision: NOT READY for public transactions. Public release remains HOLD.**

Repository: `KonexaTech/Kasii-Food-Hub`. Baseline main: `440d5533be002d58f2307e32bcbae4e80e90fa6a` (PR #7 merged). Repair branch: `development/release-recovery-rls-20261122`. No open PR existed at discovery. This report distinguishes the public browser-session demonstration, the independent Neon QA database, and the unverified API deployment. Neither a rendered button nor a successful build establishes real ordering acceptance.

## Verified infrastructure and deployment baseline

- Dedicated existing Neon project `polished-dew-44314985`, PostgreSQL 18, AWS us-east-2. No new project was created.
- QA branch `br-sweet-voice-bd6rnmjd` (`qa-validation-2026-11-21`) and production branch `br-autumn-sound-bd2onfcu` remain separate. Only read-only QA catalog queries were run; no customer records were retrieved or changed.
- Ten `kfh_` marketplace tables inspected through PostgreSQL catalogs: admins, shops, menu_items, orders, order_items, order_status_events, commission_entries, commission_payments, notifications, shop_applications. All ten have RLS enabled in the current QA database; nine FORCE RLS, commission_entries does not FORCE. This is configuration evidence, not live actor-isolation acceptance.
- Worker configuration targets `kasii-food-hub-api-qa` and the QA host `ep-calm-sea-bdye9zrl.c-8.us-east-2.aws.neon.tech`; Auth URL uses the same QA endpoint. Database secrets remain server-side. The actual deployed Worker's database role and runtime bindings have not been verified.
- Main's historical GitHub Pages preview deployment succeeded in [run 44900837231](https://github.com/KonexaTech/Kasii-Food-Hub/actions/runs/44900837231). This is a demonstration, not a verified transaction deployment. The configured staging frontend origin is `https://kasii-food-hub-neon-staging.pages.dev`; its availability was not established by this audit.
- Historical QA deployment [run 44908689457](https://github.com/KonexaTech/Kasii-Food-Hub/actions/runs/44908689457) failed. A source configuration file is not proof that its API is deployed. Current main's workflow skips deployment if `CLOUDFLARE_API_TOKEN` is absent; a green skipped workflow cannot prove deployment.
- Public `app-config.js` still has empty API/Auth URLs. The approved photographic home uses a clearly labelled browser-memory demo. Separate customer/owner/admin Neon pages exist, but are not publicly connected by those blank settings.

## Confirmed repairs and supporting tests

| Defect | Repair | Observable evidence |
| --- | --- | --- |
| QA config supplies `NEON_AUTH_URL`, but password reset used only `NEON_AUTH_BASE_URL` | Normalize the existing aliases consistently for request and reset page | Functional Worker tests capture the upstream URL and redirect for both aliases |
| Network failure during password recovery escaped the handler | Return generic retryable 502 without upstream details | Injected failed fetch yields exact generic response |
| RLS migration contained two missing SQL terminators | Repair those two statements | Fresh migration sequence previously failed, now compiles in in-memory PostgreSQL |
| Fresh migration used FORCE without ENABLE RLS | Explicitly ENABLE RLS on all ten marketplace tables | Actual PostgreSQL catalog assertion checks all ten tables |
| Existing QA notification policy cannot authorize owner-to-customer status notices; status transaction can roll back | Proposed migration 009 binds `new_order` to customer→shop owner and `order_status` to shop owner→customer, retaining admin rights | Restricted non-superuser local role reproduces old-policy rejection, then commits status+notification after the proposed repair; outsider reads and spoofed recipients are denied |
| Null/non-object checkout items and wrongly typed fields could throw instead of returning validation errors | Validate checkout records before field access, enforce bounded strings and canonical UUIDs | Authenticated Ed25519/JWKS handler test reproduces null-item failure, then verifies 400, retry deduplication, server menu prices, preserved delivery details, 409 on changed retry and 401 for anonymous checkout |
| Root test script excluded recovery tests | Include all Worker test files; install both dependency lockfiles before CI tests | All 29 individual unit/Worker/database cases pass |
| Dependency resolution was not pinned | Add root/Worker lockfiles and use `npm ci` in existing workflows | Clean root and Worker `npm ci` both pass |

No migration was applied remotely. Migration 009 is a reviewed proposal, not a claim that the deployed API was repaired. The existing admin/owner separation and disabled frontend transactions are preserved. Branding, approved layout, navigation, commission rules, and production records were not changed.

## Feature inventory

| Capability | Implementation found | Verification result |
| --- | --- | --- |
| Area/name discovery, menus and quantities | Browser demo and approved-shop SQL endpoints | PASS scoped demo tests; live API NOT TESTED |
| Server-created order totals and IDs | Worker computes menu prices and uses UUID request idempotency | IMPLEMENTED; authenticated live checkout BLOCKED |
| Order persistence/history | `kfh_orders`, items and status events, scoped API routes | Schema inspected; live customer→owner persistence BLOCKED |
| Owner applications, menu editing and admin approval | Separate Neon pages, guarded API routes, admin registry | Role classifier tests PASS; actual JWT/database acceptance BLOCKED |
| Owner status lifecycle | API transaction and database transition triggers | Local owner acceptance+notification regression PASS; remote policy still needs controlled staging rollout |
| Commission | Historical 50-cent ledger code plus a later disable-launch migration | QA drift: commission trigger is still present. Approved Kasii policy/rate must be reconciled before transactions; no activation or rate changes made |
| Payments | No verified provider/webhook implementation | NOT IMPLEMENTED for real payments; no payment success fabricated |
| Notifications | In-app records and polling; no verified push dispatch | Local record authorization PASS; actual merchant/customer notification delivery BLOCKED |
| Photography/uploads | Approved sample imagery and session-only upload preview | Demo images checked by browser tests; durable secured owner upload NOT IMPLEMENTED |
| Shared delivery | Source order has delivery state and a hardcoded 1500-cent fee | Not an approved quote, confirmed capacity, or dispatch integration; NOT IMPLEMENTED end-to-end |
| Android | No native package/signing workflow in this repository | NOT IMPLEMENTED; real-device acceptance BLOCKED |
| PWA | Web manifest and responsive browser UI | Full install/offline/recovery acceptance NOT TESTED |
| Monitoring, backup and privacy sign-off | No completed acceptance evidence | BLOCKED |

There is no configured 40-persona live QA run demonstrated by this repository. Four isolated browser tests exercise the demonstration; they do not represent live customers or real Android evidence.

## Checks executed

Committed evidence: [unit/Worker/database case output](evidence-20261122/unit-worker-database.log), [mobile browser demo output](evidence-20261122/browser-demo.log), and [check summary](evidence-20261122/checks.json).

- Root and Worker clean installs: PASS (`npm ci --no-audit --no-fund`, then the equivalent `--prefix worker`).
- Root `npm run check`: PASS; Worker `npm --prefix worker run check`: PASS. No separate lint script is supplied; syntax checks are not reported as a lint run.
- Actual case-level run: `node --test --test-isolation=none --test-concurrency=1 tests/*.test.js tests/*.test.mjs worker/test/*.test.mjs`: **29 passed, 0 failed**. Includes PostgreSQL execution and restricted-role checks, not only source matching.
- Browser run: `CHROMIUM_PATH=/usr/bin/chromium npm run test:e2e -- --workers=1`: **4 passed, 0 failed**, viewport 390×844. Customer sample order lifecycle, sample registration/admin approval, menu availability, and photo checkout all pass. Records are browser-session fixtures; no live transaction was performed.
- Production web build after clean installation: PASS. Worker `wrangler deploy --dry-run` packaging: PASS; no version was uploaded or deployed.
- Production dependency audits: root **0 vulnerabilities**, Worker **0 vulnerabilities** (`npm audit --omit=dev`). This does not prove the absence of application security flaws.
- New focused before-fix run: 4 failures reproduced. After repair, those four pass; the notification regression separately reproduces and verifies the old/fixed SQL behavior. One additional authenticated checkout handler test reproduced the null-item TypeError before repair and now passes.
- Physical Android installation, real Auth recovery inbox, live actor-isolation, live payments, actual delivery and closed-app push: BLOCKED or NOT IMPLEMENTED as listed above.

The completed automated run's pass rate is **33/33 = 100%**, counting 29 individual unit/Worker/database cases plus four browser demo cases once each. Repeated checks and separate Worker reruns are not added again. This percentage describes only that automated scope.

## Release gate assessment

| Mandatory public-release gate | Result | Evidence or missing acceptance |
| --- | --- | --- |
| Essential customer journey end-to-end | FAIL | Public configuration disconnected; demo orders do not persist |
| Authentication and authorization | BLOCKED | JWT guards exist; need real QA customer, owner, admin and outsider sessions |
| Database integrity and cross-user isolation | BLOCKED | QA catalog and local negative tests pass; real API role/isolation unverified |
| Critical/high blockers resolved | FAIL | Runtime notification policy and commission drift need approved staging resolution |
| Applicable automated regression suite | PASS | 29 individual cases, four demo browser cases and web build pass |
| Payments, commission and notification acceptance | BLOCKED | Provider configuration/implementation, business-policy reconciliation and live delivery missing |
| Android/PWA target acceptance | BLOCKED | No signed Android artifact; PWA install/offline acceptance missing |
| Monitoring and tested recovery | BLOCKED | No verified backup export/restore drill or monitoring acceptance |
| Privacy/legal and deployment review | BLOCKED | Owner review and actual runtime configuration checks outstanding |
| Real-device acceptance and release sign-off | BLOCKED | Human Android journeys and sign-off required |

Verified release-gate completion is **1/10 = 10%** using the ten user-defined mandatory gates above. It is not an implementation percentage, probability, or permission to release. A feature implementation percentage is intentionally not inferred from file counts or demo controls.

The API delayed-status allowlist now matches the existing database transition trigger: pending→delayed is allowed; delayed orders can return to accepted or rejected. Unsupported delayed→preparing/ready/out-for-delivery requests return 409 before writes instead of reaching the database and causing a generic availability error. The authenticated handler regression reproduces the previous failure and checks commits/rollbacks; live status acceptance remains outstanding.

## Safe next milestone

1. Review the proposed migration with a recoverable backup and rollback snapshot, then apply only to the existing QA branch after owner approval; verify the actual Worker's restricted database role.
2. Reconcile QA commission-trigger drift against the approved Kasii rules; keep real collection disabled until confirmed.
3. Deploy a QA-only Worker revision through the existing credentialed workflow, then configure a QA frontend without changing the public demonstration's working behavior.
4. Run approved fixture accounts through authenticated checkout→owner acceptance→preparing→ready→completion, refresh persistence, duplicate request/rejected-order/error recovery and outsider denial.
5. Implement approved payment and delivery contracts in sandbox/default-off mode before claiming integration.
6. Add applicable PWA/Android packaging and physical tests after the essential server-backed journey passes; do not copy another app's signing identity or database.

## Migration compatibility and rollback

The corrected 008 file is needed for fresh isolated rebuilds. Existing QA already has RLS enabled, so no remote replay is necessary to prove that repair. Never disable RLS as a rollback.

Before 009, record the current `pg_policies` row for `kfh_notification_insert` in a protected operator backup and verify recoverability. The proposed migration replaces one policy transactionally, changes no table schema or records, and is compatible with the current Worker INSERTs. Roll back that policy only by restoring the captured prior definition within a transaction; this restores the known owner-notification limitation. Retain all orders, status events, notification history, keys and independent databases. A schema snapshot alone is not a verified data backup or restore drill.

## Controlled-beta continuity: compose existing QA deployment gate

The existing unmerged `feature/qa-api-hardening-20261121` branch contains a more reliable QA credential gate than main. That exact workflow repair has been composed into this candidate, preserving `npm ci` and the existing QA-only Worker identity, database-host guard, branch trigger and manual dispatch. No production branch or frontend deployment is activated. No app database credential is copied from another app.

The workflow now stops when either its own `CLOUDFLARE_API_TOKEN` or `NEON_DATABASE_URL` repository secret is absent; it does not return a successful skipped-deployment result. When both exist, it deploys only the existing configured QA Worker and sets its server-side DATABASE_URL through the existing secret mechanism. Two local behavioral tests cover all four credential-presence combinations and assert no credential values appear in output. Root checks and production build passed after composition.

The deployment workflow can be manually run on this repair branch to establish current configuration, but no deployment PASS is inferred from unit tests. A successful workflow still needs live source/runtime-role, authenticated lifecycle, persistence, negative authorization and mobile acceptance. Missing token/configuration must be entered through private GitHub settings, never chat. Reading Actions-secret metadata through the available integration can be forbidden; a denied metadata read is not proof that a secret is absent.
