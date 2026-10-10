# Architecture and design decisions

Decided 2026-10-10 from the supplied Haggle v2 HTML and the reference conversation. The final instruction prioritizes an information hub with optional AI, not onboarding or an administrative dashboard.

## Product structure

Next.js App Router on Vercel serves an immediately usable public feed, source-backed deal details, categories, search, coupons and guides. Instrument Sans handles interface text, Newsreader headings and AI answers, DM Mono small metadata. Colors reproduce the supplied paper/ink/orange palette. Responsive layout moves the sidebar below the feed on small screens.

The design source is a prototype with hardcoded products, fabricated histories, timed AI logs, fake checkout success and prefilled savings. These are not evidence of real services. Haggle uses real feed records and empty user ledgers. Incomplete external automation is explicitly described at its entry point.

## Persistence and identity

A dedicated Neon Postgres resource belongs only to Haggle. Managed Neon Auth owns passwords, sessions, reset tokens and verification. The Next.js SDK proxies auth and manages HttpOnly session cookies. Application handlers derive the user ID from a session validated by the managed service. Every saved-deal, preference, alert, ledger and plan query includes that owner ID. Browser-supplied identity is rejected. POST/PATCH/DELETE handlers enforce same-origin JSON requests. The read-only operator view additionally requires an exact server-side user-ID allowlist; ordinary users cannot nominate themselves.

Tables are created with checksum-tracked transactional migrations. Source offers and observed prices are distinct from user data. The application does not write arbitrary user-provided amounts to the verified savings ledger. Account foreign keys cascade through identity deletion performed by the operator.

## Feed and AI

The fixed DealNews RSS endpoint is fetched server-side with bounded size/time and XML validation. React renders inert text, allowed links and source imagery. Original attribution and referral parameters are preserved. Six-hour ingestion is idempotent for an identical feed in the same refresh window; recorded histories are actual observations, not interpolation. Expired and stale offers disappear from the current feed.

AI receives only the current offer records and the signed-in user's question. It cannot browse arbitrary URLs, access another account, execute code, spend money or place orders. Structured output limits recommendations to known offer IDs; user queries and feed text are untrusted data. An atomic database quota caps questions per user. The model was chosen from the live Gateway catalog and verified with the account's available credits; it is configurable through `AI_GATEWAY_MODEL`.

Cart comparison uses the current collected feed and the user's entered baseline. A user explicitly chooses each replacement; the server resolves and snapshots published prices. Approval saves a shopping plan. The checkout companion provides source links and eligibility checks. It does not impersonate a retailer checkout.

The final-cost worksheet is public and optionally saved to an account. It computes in integer cents and distinguishes the amount due at checkout from possible later cashback and card rewards. Blank shipping/tax stays unknown, and already-included coupons are never deducted twice. Server handlers validate the source offer and recompute all stored results. Each saved worksheet includes its input assumptions and source snapshot; changed source prices trigger a warning without silently replacing a user's entries.

User-reported purchases live in a separate table from the verified savings ledger. Purchase totals, baseline differences, received refunds and zero fees are constrained on the server and in the database. A composite foreign key prevents linking another user's cart plan. Price-adjustment assistance uses a user-entered policy/deadline and actual observed publisher prices to create a request draft, with explicit uncertainty about total costs and eligibility. Copy/download never sends a request. Users mark requests submitted, rejected or received themselves; only received refunds enter their reported totals. These records and worksheets support editing/deletion and are included in owner-scoped export.

## External prerequisites for later capabilities

Direct retailer/cart access, coupon validation, cashback integrations, purchase confirmation, refund authorization and billing settlement require their own verified provider integrations. No fake versions are substituted. A paid success fee requires an auditable realized-savings definition and explicit charge approval before enabling it. Broader merchant APIs need licensing compatible with permanent price history (Best Buy's default cache terms do not provide that).
