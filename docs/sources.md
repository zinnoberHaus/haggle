# Feed sources and provenance

Reviewed 2026-10-10. Haggle's launch feed is an attributed reader of the publisher's RSS feed. It does not claim to have independently tested coupons, verified merchant inventory, or negotiated prices.

## Active source: DealNews

- Feed: `https://www.dealnews.com/?rss=1&sort=time`
- [RSS permission and restrictions](https://www.dealnews.com/pages/rss.html)
- [Publisher terms and affiliate disclosure](https://www.dealnews.com/disclaimer.html)

The publisher expressly permits public RSS display with attribution, provided content and source links/referral codes are preserved. It explicitly prohibits including this feed content in publicly distributed browser extensions. This integration is web-only. Do not reuse it in a future Haggle extension or replace the publisher's referral links. Do not present DealNews's editorial statements as Haggle's findings.

The app retains full title and description text, source image, original URL including referral parameters, and all safe embedded links. HTML is converted to inert text (paragraph/list whitespace changes only); scripts and other active markup are excluded. Render description as React text and render `sourceLinks` as separate source links, never with `dangerouslySetInnerHTML`. Visible source attribution must accompany the feed. Publisher affiliate relationships are disclosed alongside the source; Haggle must not falsely claim a commission relationship of its own.

The XML contains structured publisher fields: `dealnews:price` (USD), `dealnews:retailer`, `dealnews:category`, `dealnews:expires`, and `media:content`. The parser resolves the DealNews namespace URI, allowing alternate prefixes. Price uses the structured field rather than rounded headline amounts. Zero-valued or non-USD prices are left unknown because zero commonly means an unpriced promotion. All comparison prices remain null; the adapter never infers savings, review counts, coupon validity or price history. The original category is retained as `sourceCategory`; Haggle maps that label to its broad navigation categories using documented keyword rules in the adapter, or `Other` if it cannot classify it. This navigation classification is Haggle metadata, not publisher content. Shipping is a literal condition copied from the headline, not an independent eligibility check. Starting-price headlines are marked `priceType=from`.

## Refresh, history and recovery

Run `npm run db:migrate`, then `npm run ingest` with the private `DATABASE_URL` configured. The feed uses a fixed allowlisted URL, a 20-second fetch timeout, a 2 MiB limit, and XML validation with DTD/entity declarations forbidden. Malformed feeds do not alter existing records. Each ingestion atomically upserts offers, records the completed run, and appends observations of source-provided prices. An advisory transaction lock serializes writes.

The same XML within a six-hour refresh window has a stable run ID. Replaying it refreshes fetch timestamps without duplicate observations; a later six-hour window records another actual observation. No historic values are backfilled. The history represents observed **publisher feed prices**, not confirmed merchant checkout prices. Previous records remain if the source is unavailable. Expired records or records not refreshed for 48 hours are excluded from the public current feed, while saved detail links retain their last observation with an unavailable status.

Vercel calls `/api/cron/ingest` every six hours, authenticated with `Authorization: Bearer <CRON_SECRET>`. Requests fail closed if the secret is missing. Keep the secret in Vercel environment settings and out of browser bundles. The migration runner owns schema versioning. The feed migration adds source/history tables and private user target-alert records; it does not reset user data. Recovery: restore the database using the provider's recovery tooling, reapply any missing tracked migrations, then run ingestion. Re-running ingestion is safe. To stop refresh, disable the cron schedule; the existing data will age out honestly.

Run `npm test` for parser, URL, XML-size and authentication checks. `RUN_LIVE_INGESTION_TEST=1 npx tsx --test tests/ingestion.test.ts` additionally fetches the real source and verifies PostgreSQL persistence and replay idempotency using `.env.local`. This opt-in test performs real ingestion, so point it at the intended Haggle database; it does not create fake offers or histories.

Successful ingestion also creates owner-bound `target_alerts` when an active saved offer's observed price meets its target. A unique user/offer/target constraint prevents duplicate notifications. These are in-app records, not emails, and the user API must always filter them by the authenticated user. Account deletion cascades them. A target is compared to the publisher's conditional offer price, not a guaranteed final checkout total; the offer's membership/coupon terms still apply.

## Other researched sources

- [Woot's official API](https://developer.woot.com/) supplies direct live offers, but requires an issued API key. An unauthenticated request was verified to return 403. It is not active.
- [Best Buy API terms](https://developers.bestbuy.com/legal) include attribution and a 72-hour maximum temporary cache. Persistent historical storage needs a compatible agreement; this source is not active.
- [Apple website terms](https://www.apple.com/legal/internet-services/terms/site.html) restrict scraping. There is no Apple crawler.

[FTC affiliate disclosure guidance](https://www.ftc.gov/business-guidance/resources/ftcs-endorsement-guides-what-people-are-asking) supports disclosing compensation clearly near affected recommendations and links. Future cashback or card-reward estimates must show eligibility separately from checkout cost. Do not claim those programs exist before an actual integration and verified terms support them.
