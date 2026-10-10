# Haggle

A public shopping deal hub based on the supplied Haggle v2 design: warm paper, orange accents, editorial typography, and browsing before sign-up.

- **Live:** https://haggle-blue.vercel.app
- **Repository:** https://github.com/zinnoberHaus/haggle

Production is currently a public beta. Managed account flows passed local integration tests, but live signup is blocked until the production URL is added to Neon Auth's trusted domains. See [verification evidence](docs/verification.md) for the current deployment checks and remaining setup.

## What works

- Real attributed DealNews RSS offers, refreshed every six hours; categories, search, coupons, full source details and actual collected price history.
- Optional AI comparisons grounded in the collected offers, through Vercel AI Gateway. Ten questions per signed-in user per UTC day.
- Neon managed authentication: email/password sign-up and sign-in, email verification, reset-password flow, profile/password management and session revocation.
- Account-owned saved deals, price targets, in-app target matches, preferences and data export.
- Shopping-list comparisons with explicitly selected alternatives, saved approval plans and a checkout checklist linking to the source.
- A real Chrome/Chromium MV3 search companion, available as an unpacked-extension ZIP.
- Original shopping guides, fee calculator and an empty-by-default savings ledger.

## Current limits

Haggle does not automatically import/fill retailer carts, test coupons, activate cashback, place orders or file refunds. Cart differences are estimates; no fees are charged. The planned success fee is 10% of verified savings, capped at $20 per task. The extension is a search companion, not a published Chrome Web Store product.

Email notification preferences are stored but price-alert emails and weekly digests are not sent. Managed auth reset/verification API flows work; real recipient inbox deliverability requires an operator check and a production mail-provider review. Price history begins with real observations on October 10, 2026, not the reference prototype's invented 12-month series.

## Run locally

Use Node 24 and npm. Link to the **Haggle** Vercel project before pulling environment variables; never reuse another app's database.

```sh
npm ci
vercel link --project haggle --scope my-team-ae70891f
vercel env pull .env.local
npm run db:migrate
npm run ingest
npm run dev
```

See `.env.example` for variable names. Secrets stay in local ignored files and Vercel environment settings. Never commit exported environment files.

```sh
npm run typecheck
npm test
npm run build
```

`RUN_LIVE_INGESTION_TEST=1 npm test` performs actual feed ingestion into the configured database and verifies replay idempotency. `TEST_BASE_URL=http://localhost:3002 npx tsx scripts/auth-smoke.ts` exercises actual managed auth with isolated temporary test identities; it requires the running app to use the same database as `.env.local`. Do not run against a database that you do not own.

## Operations

- [Architecture and feature boundaries](docs/architecture.md)
- [Data sources, licensing and ingestion recovery](docs/sources.md)
- [Deployment, accounts and recovery](docs/operations.md)
- [Verification evidence](docs/verification.md)

The data source attribution and original referral links must remain intact. The extension must not embed the DealNews feed; see the source terms linked in `docs/sources.md`.
