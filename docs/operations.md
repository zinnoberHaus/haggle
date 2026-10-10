# Haggle operations

## Services

| Service | Identifier | Ownership |
| --- | --- | --- |
| GitHub | `zinnoberHaus/haggle` | zinnoberHaus |
| Vercel | `haggle`, `prj_m7MgvzhzoZGSAkJ2XSKFne5IkHos` | Existing connected Microyee team (`my-team-ae70891f`) |
| Neon | `haggle-db`, project `polished-hat-14036316` | Dedicated resource via the same Vercel team; Free plan |
| Production | `https://haggle-blue.vercel.app` | Haggle Vercel project |

This new project does not use another product's database or code. No paid service plan or credit top-up was purchased.

## Deploy and recover

From the Haggle checkout, run `vercel project inspect --non-interactive` and confirm the project and owner before any mutation. Run typecheck, tests and build. Production deployment uses `vercel deploy --prod`; inspect readiness and perform anonymous/public and authenticated checks against the production alias. The framework is specified in `vercel.json`; Vercel cron calls ingestion every six hours with its `CRON_SECRET` header.

Rollback app code using `vercel rollback <previous-ready-deployment-url>` after verifying the intended target. With only an initial deployment, redeploy the last known-good Git commit. A rollback does not undo schema migrations or user writes. Migrations are append-only and checksum verified; do not rewrite applied SQL. Test compatibility before a destructive schema change. No destructive migrations are present.

Neon provider recovery applies to the dedicated Haggle database; check the actual plan's retention window before depending on a point-in-time restore. A periodic independent database backup and a full restore drill are still recommended before expanding to a commercial service. Ingestion can be replayed safely. Identity and application data must be restored together.

## User administration

Production activation still needs the exact origin `https://haggle-blue.vercel.app` added under Neon Auth's trusted domains. Open the dedicated [Haggle resource](https://vercel.com/my-team-ae70891f/~/stores/integration/store_AzSrsKuwHrxIu9tR), then its Neon Auth settings and Domains/Trusted Domains. The provider currently returns `403 INVALID_ORIGIN` and its trusted-origin list remained empty after the first Git-connected deployment. Do not remove or rewrite the forwarded Origin header to evade that check. After saving the provider setting, verify signup, signin, saved deals and one AI request against the primary production alias.

Users manage their profile, password, sessions and exported app data at `/account`. Managed identity administration (account deletion, restrictions and roles) is available through the Haggle Neon resource's Auth console. Access the resource from Vercel Storage; never use another project's users.

For the app's additional read-only user table, create your own normal account, find its exact ID in the managed console, and add that ID to `HAGGLE_ADMIN_USER_IDS` in Vercel. Redeploy, then open `/account/admin`. Empty configuration grants nobody access; no email match or first-user rule grants administration automatically. The table shows the 100 newest users. The app does not store or display password hashes or reset tokens.

Auth SDK setup uses `NEON_AUTH_BASE_URL` and a random 32-byte-or-longer `NEON_AUTH_COOKIE_SECRET`. Initial resource provisioning temporarily yielded the literal value `provisioning`; a later env pull supplied the correct HTTPS endpoint. Always wait for real provisioning completion. Rotating the cookie secret requires users to sign in again.

Managed password-reset semantics, one-time token use, signup and login were exercised with isolated generated test accounts. Email API acceptance is not proof of inbox delivery. Review mail-provider settings, domain allowlists and actual received verification/reset messages before inviting a large audience. Keep email verification available; unverified accounts cannot become operators unless an explicit operator allowlist is changed.

## Costs and constraints

AI is limited to ten requests per user per UTC day; provider credit exhaustion returns a helpful error without substituting a scripted answer. There is no billing integration and no fee is charged. Monitor Vercel runtime, Neon storage, and AI Gateway usage; no paid credits were added. Email price alerts and recurring digests remain disabled even if a user saves notification preferences.

## Extension

The downloadable ZIP is built from `extension/`, which contains only an MV3 search companion and install instructions. It asks for `contextMenus`, `activeTab` and `storage`; no host permissions, content script, browsing-history access or automatic purchases. Its default site is the verified production alias. Update `extension/config.js` and rebuild `public/downloads/haggle-extension.zip` if the app origin changes. Chrome Web Store publication is a separate operator step.
