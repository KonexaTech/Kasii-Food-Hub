# Kasii Food Hub

Independent marketplace for cooked meals, shisanyama and takeaways. Customer browsing/order/tracking, owner menus/orders and administrator approvals were adapted from the Kota Connect Neon user experience.

## Screens
- `index.html` / `neon-customer.html` — customer
- `neon-owner.html` — owner
- `neon-admin.html` — administrator

**Not live:** `app-config.js` deliberately has no Auth or API endpoint. This application must use its own Neon project and Worker; never use Kota Connect credentials or data. Server-side API, migrations and role enforcement require separate configuration and tests before controlled testing. Payments, custom requests, photographs and native push are not implemented by copying these screens.

Run `npm run check` and `npm run build` once dependencies are installed. Controlled-test target: 15 December 2026. No database migration, merge or deployment has been performed.
