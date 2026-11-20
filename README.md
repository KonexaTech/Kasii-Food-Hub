# Kasii Food Hub

Cooked meals, shisanyama and takeaway ordering. Independent GitHub frontend with a Kota Connect-style customer, business-owner and administrator flow.

## Current status — interactive demo only

This branch contains a working **browser-session simulation**. It is **not** a production marketplace. The sample businesses and prices are fictional. No backend, payment gateway, actual delivery service, secure sign-in, email verification or server-side commission is connected. Customer names, application entries, orders and uploaded photos in the demo exist only in browser memory and disappear on refresh. Do not use this preview for real transactions.

## Customer flow

1. Welcome screen → tap **Proceed**.
2. Choose a Newcastle area (including Madadeni Sections 1–7) or search for a business by name.
3. View an approved demo business, products and indicative prices.
4. **Tap the price** → enter details, select quantity and collection/delivery.
5. Create an **unpaid sample order** (delivery is a R5 example quote, not a service commitment).
6. Track order progress as the demo owner marks it accepted → preparing → ready → completed.

## Business-owner flow

- **Register business** opens a form that creates a pending demo application.
- No email is sent and no owner account is created yet.
- **Owner preview** lets you select an approved sample business, then use pop-up panels to manage shop details, menu, prices and optional session-only photos.
- **Customer orders** pop-up updates permitted statuses. **Notifications** pop-up shows incoming sample orders and changes.
- Real owner permissions will be enforced by the backend later; the preview has no authentication.

## Administrator flow

- **Admin preview** displays counts, applications and approved businesses.
- **Business approvals** pop-up approves or rejects sample applications. An approved application becomes a sample listing without menu items until they are added.
- **Customer orders**, **Notifications**, **Business records**, and **Commission ledger** appear in separate pop-up panels.
- Commission rate is explicitly **not configured**; the frontend collects nothing. Real admin access and ledger will be server-controlled later.

## Running and checking

```bash
npm install
npm test
npm run dev
npm run build
```

A GitHub Actions workflow tests the marketplace rules and builds Vite on each branch push and pull request. A separate GitHub Pages workflow can publish the approved main branch after repository Pages settings are enabled.

## Separation and future backend

This app has its own repository and will later use its own Neon project, not the Kota Connect or the other marketplace's database. Payments, live identities, image uploads, notification delivery and permanent order records are deliberately deferred.

Controlled testing target: 15 December 2026; the current demo is not a controlled-release APK or production system.
