# Verification — 2026-10-10

## Evidence recorded before publication

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

## Still requiring evidence

Production auth initially returned `INVALID_ORIGIN`: Neon trusted origins was empty even after the Vercel deployment. The exact production origin must be added through the managed provider, then signup/signin/saves/AI must be verified against the live alias. Local tests do not prove this production configuration. The user has been given the exact Haggle resource link and requested setting.

AI Gateway generated a real response with `openai/gpt-5.4-nano` using the linked project's OIDC token. A production authenticated Ask request remains dependent on production auth. The free tier rejected the higher model tried first; no paid top-up was performed.

Provider reset-token semantics were tested, but inbox delivery was not independently verified. Email price alerts/digests, automated retailer carts/checkout/refunds, billing and Chrome Web Store publication are unavailable and labeled accordingly. No full database restore drill or commercial-readiness certification is claimed.
