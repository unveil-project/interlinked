## Description

Adds a new **Google Workspace** piece for administrators (Admin SDK Directory, Reports and Data Transfer APIs), so flows and AI agents can manage users, groups, members, org units and devices, and react to admin activity in real time.

**Actions**
- **Add Record / Update Record / Delete Record / Get Record / Search Records**: users, groups, group members, org units, mobile devices, ChromeOS devices and role assignments, picked from a dropdown.
- **Suspend User**: suspend a user, or reactivate a suspended one.
- **Mobile Device Action**: approve, block, wipe and the other Directory mobile device actions.
- **Transfer Data**: move Drive, Calendar and other application data from one user to another (Data Transfer API); with **Wait for Completion** on, the step waits until the transfer finishes.
- **Custom API Call**: `createCustomApiCallAction` against the Admin SDK.

**Triggers** (webhook, Reports API push notifications)
- **New Admin Activity Event**
- **New Application Activity Event**
- **New User Event**

Each trigger opens a Reports API watch channel on enable, renews it before the 6 hour expiry (`WebhookRenewStrategy.CRON`), checks the channel token on every delivery, drops the initial `sync` message and stops the channel on disable. `test()` returns recent events from `activities.list`.

**Auth**: two methods (`auth: [OAuth2, CustomAuth]`):
- **Google Account (OAuth2)**: sign in as a Workspace admin, with the `admin.directory.*`, `admin.datatransfer` and `admin.reports.audit.readonly` scopes.
- **Service Account (Domain-Wide Delegation)**: Service Account E-mail, Private Key and Administrator to Impersonate. The token is minted with `node:crypto` (no extra dependency) and the connection is validated on save.

The auth type is discriminated with `AppConnectionType.CUSTOM_AUTH` from `@activepieces/pieces-framework`.

**Conventions**: every action and trigger has `classification`, `audience` (actions), `aiMetadata` and `outputSchema` (in `src/lib/output-schemas.ts`; the three triggers share one activity event schema). Suspend User, Delete Record and Mobile Device Action are `DESTRUCTIVE`. `src/i18n/translation.json` generated with the CLI.

**Logo**: included at `packages/pieces/community/google-workspace/google-workspace.png` (500x500, transparent). Could you upload it to `https://cdn.activepieces.com/pieces/google-workspace.png`? `logoUrl` already points there.

## How was this tested?

- `npx turbo run lint build test --filter=@activepieces/piece-google-workspace`: lint clean (0 warnings), `tsc` build, 151 vitest tests with mocked HTTP (Directory registry, service-account JWT and token cache, data transfer polling, watch/renew/stop lifecycle, channel token check on deliveries, piece metadata).
- `bun install --frozen-lockfile` passes on this branch.
- Bundle 453 KB; require heap about 8.4 MB (`heap-check-child.mjs`), under the 10 MB limit for new pieces.
- Not yet run against a live Workspace tenant: push notifications need a public HTTPS webhook. Happy to run it on a test tenant, or to address anything found in review.

Supersedes #16261.

Fixes # (none, new piece)

### Breaking change?  (required: CI fails if this is left unedited)

- [x] no, reviewed, not breaking
- [ ] yes, technical (removed/renamed API field or endpoint, dropped column, new required field, removed/required env var)
- [ ] yes, functional (default/limit/behaviour change, new self-hosted setup step)

### Security impact?  (required: CI fails if this is left unedited)

- [ ] no, reviewed, no security impact
- [x] yes, security-sensitive (call out the risk and mitigation in the description above)

Admin-level integration: the credentials can manage users and devices of a whole Workspace domain.
- The service account private key is a `SecretText` and is only used to sign short-lived JWTs (1 hour); it is never logged or returned.
- Webhook deliveries are accepted only when `x-goog-channel-token` matches the random token created for that channel.
- Outbound requests go only to Google API hosts (`admin.googleapis.com`, `www.googleapis.com`, `oauth2.googleapis.com`).
- Destructive operations (suspend, delete, device wipe) are classified `DESTRUCTIVE`.

🤖 Generated with [Claude Code](https://claude.com/claude-code)