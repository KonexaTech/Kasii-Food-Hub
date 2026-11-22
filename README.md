# Kasii Food Hub

Independent marketplace for cooked meals, shisanyama and takeaways. Preserve the approved **Order Food Now** photographic experience.

**Public transactions remain on HOLD.** The home page is a clearly labelled browser-session demonstration. Sample orders, customers, business approvals and uploaded photographs are not permanent marketplace records. Do not accept real payments or treat the example delivery fee as an actual service commitment.

Separate Neon customer, owner and administrator pages and a server API foundation exist. The public `app-config.js` API/Auth URLs remain blank. The existing independent Neon QA project has been inspected read-only; its existence does not prove the public demonstration is connected.

Read [the current release report](docs/release/2026-11-22-release-readiness.md) for exact evidence, repairs, proposed SQL, configuration gaps and release gates. [The acceptance checklist](docs/RELEASE_GATES.md) remains open until observable live evidence is recorded.

## Local checks

```sh
npm ci --no-audit --no-fund
npm --prefix worker ci --no-audit --no-fund
npm run check
npm --prefix worker run check
npm run build
npm run test:e2e
```

Browser tests require Playwright Chromium (or an explicitly supplied `CHROMIUM_PATH`). They exercise isolated session-only demonstrations, not live transactions or physical Android acceptance.

## Isolation

Use only this application's dedicated Neon project and API. Never reuse Kota Connect or Cake Connect databases, Auth tenants or secrets. Inspect and review migrations and recoverable backups before any remote application. This repair branch changes no production data, commissions, public configuration, branding or navigation. Payments, push, signed Android builds and shared delivery still require implementation/configuration and acceptance; no provider success is simulated.
