# Kasii Food Hub

Cooked meals, shisanyama and takeaway ordering.

Independent marketplace app with customer ordering, business-owner operations and administrator oversight.

## Status
Initial repository scaffold. No live payments, production authentication or database connection yet. Do not treat as release-ready.

## Architecture goals
- Customer: browse businesses by area, view photos and confirmed prices, place orders and track progress.
- Business owner: manage products, accept and prepare orders, mark ready for collection, complete orders.
- Administrator: approve businesses, monitor orders and maintain a commission ledger (commission disabled until configured).
- Separate Neon PostgreSQL project; never reuse Kota Connect credentials or production data.
- Server-enforced authentication and role-based access before live usage.

Target: controlled testing by 15 December 2026.
