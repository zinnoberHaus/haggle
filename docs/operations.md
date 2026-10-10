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

Rollback app code using `vercel rollback <previous-ready-deployment-url>` after verifying the intended target. A rollback does not undo schema migrations or user writes. Migrations are append-only and checksum verified; do not rewrite applied SQL. Test compatibility before a destructive schema change. No destructive migrations are present. The purchase/comparison expansion adds two tables and a supporting plan-owner index. Earlier app revisions ignore those tables; rolling back hides the new flows but preserves their records for a later redeploy. Include these account-owned tables in recovery and export checks.

Neon provider recovery applies to the dedicated Haggle database; check the actual plan's retention window before depending on a point-in-time restore. A periodic independent database backup and a full restore drill are still recommended before expanding to a commercial service. Ingestion can be replayed safely. Identity and application data must be restored together.

## User administration

The exact origin `https://haggle-blue.vercel.app` is configured in Neon Auth, and live signup, signin, private records and an AI request passed. Initial automatic integration setup left the origin list empty. The bootstrap fix used the existing database-owner role to add only this origin to `neon_auth.project_config.trusted_origins`, with endpoint and prior-value checks and an allowlist-only backup. No forwarded Origin header or validation was removed or rewritten. Neon's [architecture documentation](https://neon.com/blog/neon-auth-branchable-identity-in-your-database) identifies the database as the source of this configuration. Direct SQL is not presented as a documented management API; use the managed console or authenticated Neon CLI/API for future changes.

Open the dedicated [Haggle resource](https://vercel.com/my-team-ae70891f/~/stores/integration/store_AzSrsKuwHrxIu9tR), then Neon Auth Domains/Trusted Domains to inspect or change the allowlist. Before the bootstrap fix it was `[]`; afterward it contains only the production origin, with the existing localhost allowance unchanged. To reverse that change, remove only this production origin using the managed console; live account requests will stop working until it is restored. Newly added custom domains and preview aliases require their own deliberate configuration. Recheck live origin behavior after provider configuration or integration changes.

Users manage their profile, password, sessions and exported app data at `/account`. Managed identity administration (account deletion, restrictions and roles) is available through the Haggle Neon resource's Auth console. Access the resource from Vercel Storage; never use another project's users.

For the app's additional read-only user table, create your own normal account, find its exact ID in the managed console, and add that ID to `HAGGLE_ADMIN_USER_IDS` in Vercel. Redeploy, then open `/account/admin`. Empty configuration grants nobody access; no email match or first-user rule grants administration automatically. The table shows the 100 newest users. The app does not store or display password hashes or reset tokens.

Auth SDK setup uses `NEON_AUTH_BASE_URL` and a random 32-byte-or-longer `NEON_AUTH_COOKIE_SECRET`. Initial resource provisioning temporarily yielded the literal value `provisioning`; a later env pull supplied the correct HTTPS endpoint. Always wait for real provisioning completion. Rotating the cookie secret requires users to sign in again.

Managed password-reset semantics, one-time token use, signup and login were exercised with isolated generated test accounts. Email API acceptance is not proof of inbox delivery. Review mail-provider settings, domain allowlists and actual received verification/reset messages before inviting a large audience. Keep email verification available; unverified accounts cannot become operators unless an explicit operator allowlist is changed.

## Costs and constraints

Ask and shopping-list AI review share a combined limit of ten requests per user per UTC day; provider credit exhaustion returns a helpful error without substituting a scripted answer. Cart review adds no migration and does not persist model advice; only explicitly approved shopping plans are stored. Rolling back the app disables the review without changing existing user records. There is no billing integration and no fee is charged. Monitor Vercel runtime, Neon storage, and AI Gateway usage; no paid credits were added. Email price alerts and recurring digests remain disabled even if a user saves notification preferences.

## Extension

The downloadable ZIP is built from `extension/`, which contains only an MV3 search companion and install instructions. It asks for `contextMenus`, `activeTab` and `storage`; no host permissions, content script, browsing-history access or automatic purchases. Its default site is the verified production alias. Update `extension/config.js` and rebuild `public/downloads/haggle-extension.zip` if the app origin changes. Chrome Web Store publication is a separate operator step.
