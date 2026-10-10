# Verification — 2026-10-10

## Verified implementation and deployment

- Dedicated repository created at `zinnoberHaus/haggle` and separate Vercel project `prj_m7MgvzhzoZGSAkJ2XSKFne5IkHos` provisioned. Neon resource `haggle-db` is on its observed Free plan. No payment integration is enabled.
- `npm run typecheck` passed. `npm run build` passed with all public/account/API routes compiled. Initial Vercel production deployment `dpl_6dFJpbNDum5eaj8Z5Z4DQ9sR9Qra` reported READY and aliased `https://haggle-blue.vercel.app`.
- Ingestion/parser suite: nine offline tests passed; a separately enabled live test fetched actual RSS, persisted offers, and verified that replay added zero duplicate observations. A subsequent search suite adds three passing regression cases for budget queries, unmatched terms and unknown prices.
- Initial live feed: 49 publisher items fetched; a later source refresh brought accumulated current offers to 50. Counts are observations at the check time, not product guarantees.
- The production cron was manually triggered at 20:32:07 UTC and committed a run at 20:32:08.145 UTC: 49 offers refreshed, including 30 priced offers and 30 observations. The database then contained 51 currently publishable offers, 89 observations and three completed runs. No user target existed at that check, so no real target-triggered notification is claimed.
- Managed auth integration tested locally against the actual backend with isolated identities: signup; two separate users; sessions; save/target persistence; cross-user deletion protection; strict input validation; CSRF rejection; preferences; exports; empty savings; profile/password changes; logout; reset request; one-time reset token and replay rejection. Test identities were removed.
- Browser auth checked signup, rendered account, reload/session retention, profile edit, signout, protected-account redirect and successful signin response. A helper-label accessibility issue was corrected.
- Independent API review checked cart and alert ownership, forged identity rejection, ordinary-user operator denial, and AI quota exhaustion (without a provider call). All passed.
- Public browser review at 1440px and 390px found no document overflow or page-error events. Pagination, unauthenticated Save return path, anonymous AI handoff and fee calculator boundaries worked. Production `/privacy`, `/extension` and `/terms` returned 200. Fonts were confirmed as Instrument Sans and Newsreader.
- MV3 extension loaded in isolated Chromium; popup, local origin setting and encoded search handoff passed. Download archive contains the production URL and no feed data.
- Review corrections implemented: wrong guide link, missing terms page, existing target being reduced on display, shared saved-button state, unsupported biggest-drop ordering, numeric-budget filtering, source-link display, duplicate target IDs, saved-plan retrieval and complete app-data export.
- GitHub Checks passed for `bd7ab3c` and `61190bc`. The Git-connected production deployment of `61190bc` reported READY at `haggle-j7tx4abgf-my-team-ae70891f.vercel.app` and serves the primary alias. This verified automatic deployment from the new repository.
- A real authenticated local `/api/ask` request returned 200 with a nonempty answer and three source IDs checked against the live feed. Exactly one request was used for this flow check.
- Fresh production-build browser checks passed locally: cart comparison, explicit alternative selection, approval, persisted checklist/reload and source link; anonymous checkout redirect; an isolated target-alert fixture displayed and its Mark read action persisted; browser signout and credential signin. Test users and fixtures were deleted. These demonstrate alert rendering and persistence, not a real user price-drop event.
- Final public production review of `61190bc`: `under $100` returned 20 offers; category selection updated the URL, underline and `aria-current`; four guide and three attributed coupon previews rendered; desktop 1440px and mobile 390px had no page overflow or browser errors. The extension ZIP returned 200, passed archive validation, and targets the production alias.
- Final state regressions passed after another fresh production build: a real anonymous cart save returned 401, then the sign-in round trip retained the entered list, price and chosen alternative. A controlled browser test held an older saved-list GET, mocked a successful mutation and fresh reconciliation, then released the stale response; the button correctly remained saved. The reproducible `scripts/cart-ui-smoke.mjs` uses no accounts or backend writes; its saved-state responses are explicitly mocked. Production dependency audit reported zero known vulnerabilities at the check time.

Development testing encountered an HMR reload loop on the local dev server. The issue did not reproduce on the fresh production build, where signin and cart checks passed. No source-level cause was established; no claim that the development-runtime issue was fixed is made.

## Production authentication resolved

Production initially returned `INVALID_ORIGIN`. The exact production origin was added to the stored auth allowlist using the existing database-owner role, with a checked endpoint and prior value. The application continues forwarding and validating the actual Origin. See operations for the bootstrap method and recovery limits.

The live alias then passed signup, managed session validation, browser credential signin, preferences, saved target, cart approval/checklist persistence, export, signout and protected redirects. Forged auth/profile origins returned 403, forged owner input returned 400 and an ordinary user could not access administration (403). The generated identity and associated test records were removed and cleanup checked.

Exactly one live authenticated Ask request returned 200, with a 976-character answer and three source IDs checked against actual feed records. AI Gateway uses `openai/gpt-5.4-nano`; no paid credit top-up was performed.

## Purchase and full-cost flow expansion

Additive migrations `004-purchases.sql` and `005-comparisons.sql` applied successfully, preserving existing accounts and records. The expanded suite includes 28 passing cases, with only the opt-in live ingestion test skipped. Seven purchase cases cover exact money, reported savings/refund semantics, real calendar dates, unsafe policy URLs, forged fields and plan ownership. Eight cost cases cover exact cents, coupon double-count prevention, conditional rewards, unknown costs, caps, forged totals and source warnings. A further calendar-date regression prevents purchase dates shifting to the preceding day. The production build includes the new public/private pages and API routes.

`scripts/shopping-records-smoke.ts` passed against the local production build with two isolated managed accounts: purchase/refund create/update/list/delete, cross-account and forged-origin denial, ownership of linked plans, server-recomputed comparison totals, null unknown costs, isolated export, and separation of user-reported savings from the verified ledger. Both identities and their records were removed and cleanup checked.

Purchase browser tests passed plan prefill with the actual paid field left blank, create/edit/refund recording, request download, savings display, export and delete. The 390px view had no overflow or browser errors. The repeatable test is `scripts/purchases-ui-smoke.mjs`. The review identified the date-only display issue described above, which was corrected.

Anonymous calculator browser checks passed at 1440px and 390px. An included coupon was not deducted twice; unknown shipping/tax left final totals unknown; $93 payable remained $93 despite $7 in potential rewards, while conditional cost was $86. The real anonymous save returned 401 and the signin round trip retained the worksheet. No backend records were written in this public calculator check.

Deployment `dpl_5Uxhy6VGxg1F3TthAad5UdX1YqrE` for `89c97bd` reached READY with the production alias assigned, and GitHub Checks run `38085666195` passed. The shopping-records integration script then passed once against production: both managed sessions, purchase/refund CRUD, owner and linked-plan isolation, CSRF rejection, comparison snapshots and server calculations, null unknown costs, isolated exports, and reported-versus-verified savings. Exact test identities and cascading records were removed.

The purchase browser script also passed once against that production alias: receipt creation, refund edit, request download, savings display, export and deletion. January 10 displayed as Jan 10, the mobile document width was 390px, and no browser errors were observed. Cleanup was independently checked. Live public calculator checks at 390px and 1440px confirmed unknown totals and included/additional coupon behavior with no overflow or browser errors.

## Shopping-list AI review

The final requirement audit identified that shopping-list alternatives were only matched by keywords. The added optional AI review now accepts the entered list, returns per-item advice and source-backed candidates, and leaves replacement choices and plan approval to the user. Ask and cart review share the same atomic ten-request daily quota. No migration or new service was needed.

Typecheck and the fresh production build passed. The complete offline suite passed 37 tests; only the separately exercised opt-in live ingestion case was skipped. Nine new tests cover strict input, current/exact/lower-price eligibility, per-item bounds, unknown IDs, duplicate reviews, unsupported model claims, missing output, malformed output and expiry during generation. Independent backend review found no actionable authorization, source-grounding or shared-quota defect.

Controlled browser tests passed semantic candidates beyond keyword matching, no automatic replacement, unknown-source rejection, preserved advice on choice-only changes, cleared advice and choices after item edits, a delayed stale response arriving after a newer review, quota feedback and the sign-in round trip. These browser responses were mocked and made no provider calls or account writes. The existing real anonymous cart save still returned 401 and preserved its draft. Mobile width stayed 390px with no browser errors. One discovered defect—retaining a replacement after the item changed—was fixed and reproduced by the passing regression.

Commit `5e9135d0c1bb9542e33e2f146e635100eeb1d49e` passed GitHub Checks run `38086243723`. Its Git-triggered production deployment `dpl_279gmRt74L6Z2fZwxYkyyY3At5EY` reached READY at `haggle-aza3fbb8g-my-team-ae70891f.vercel.app` with the primary alias assigned.

The repeatable `scripts/cart-ai-smoke.mjs` then passed once against `https://haggle-blue.vercel.app`. Exactly one real model request returned 200 through the browser with one source verified against the actual current offer, price and original source URL. The review used one quota request, changed no selection and created no plan. Explicit selection worked; editing the baseline cleared advice and the prior selection. Anonymous requests returned 401, forged Origin returned 403 and invalid/forged fields returned 400 before quota use. Setting only the isolated test identity's quota to ten made both Ask and cart return 429 without further provider calls. Desktop/mobile rendering had no browser errors or overflow. The exact identity and its cascading quota records were removed and cleanup asserted.

## Still requiring evidence or external integrations

Provider reset-token semantics were tested, but inbox delivery was not independently verified. Email price alerts/digests, automated retailer carts/checkout/refunds, billing and Chrome Web Store publication are unavailable and labeled accordingly. No full database restore drill or commercial-readiness certification is claimed.
